import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import crypto from "crypto";
import { SupabaseSessionStore } from "./session-store";
import { Resend } from "resend";
import { storage } from "./storage";
import { requestLinkSchema, onboardingSchema } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId: string;
    stravaState: string;
  }
}

const resend = new Resend(process.env.RESEND_API_KEY);

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getBaseUrl(req: Request): string {
  const domains = process.env.REPLIT_DOMAINS?.split(",").map(d => d.trim()) || [];
  const customDomain = domains.find(d => !d.endsWith(".replit.app"));
  const replitDomain = customDomain || domains[0] || process.env.REPLIT_DEV_DOMAIN;
  if (replitDomain) {
    return `https://${replitDomain}`;
  }
  const proto = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("host");
  return `${proto}://${host}`;
}

async function getValidStravaAccessToken(userId: string): Promise<string> {
  const connection = await storage.getStravaConnection(userId);
  if (!connection) throw new Error("No Strava connection found");

  const now = Math.floor(Date.now() / 1000);
  if (Number(connection.expires_at) > now + 60) {
    return connection.access_token;
  }

  console.log(`[Strava] Refreshing token for user ${userId}. expires_at=${connection.expires_at} now=${now} client_id_set=${!!process.env.STRAVA_CLIENT_ID} client_secret_set=${!!process.env.STRAVA_CLIENT_SECRET}`);

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Number(process.env.STRAVA_CLIENT_ID),
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error(`[Strava] Token refresh failed: status=${response.status} body=${errBody}`);
    throw new Error(`Failed to refresh Strava token: ${response.status} ${errBody}`);
  }

  const data = await response.json();
  await storage.upsertStravaConnection({
    user_id: userId,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Number(data.expires_at),
  });

  return data.access_token;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      store: new SupabaseSessionStore(),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );

  app.post("/api/auth/request-link", async (req: Request, res: Response) => {
    try {
      const parsed = requestLinkSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: parsed.error.errors[0]?.message || "Invalid email",
        });
      }

      const { email } = parsed.data;
      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser(email);
      }

      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await storage.createMagicLink(user.id, tokenHash, expiresAt);

      const baseUrl = getBaseUrl(req);
      const activateUrl = `${baseUrl}/activate?token=${token}`;

      await resend.emails.send({
        from: "Airfit <hello@airfit.fit>",
        to: email,
        subject: "Your Airfit Login Link",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="margin-bottom: 24px;">Sign in to Airfit</h2>
            <p style="color: #555; margin-bottom: 24px;">Click the button below to sign in. This link expires in 15 minutes.</p>
            <a href="${activateUrl}" style="display: inline-block; background: #1a56db; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 500;">Sign In</a>
            <p style="color: #999; font-size: 13px; margin-top: 32px;">If you didn't request this link, you can safely ignore this email.</p>
          </div>
        `,
      });

      return res.json({ message: "Magic link sent! Check your email." });
    } catch (error: any) {
      console.error("Request link error:", error);
      return res.status(500).json({
        message: "Failed to send magic link. Please try again.",
      });
    }
  });

  app.post("/api/auth/activate", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Token is required" });
      }

      const tokenHash = hashToken(token);
      const magicLink = await storage.getMagicLinkByHash(tokenHash);

      if (!magicLink) {
        return res
          .status(400)
          .json({ message: "Invalid or expired link" });
      }

      if (new Date(magicLink.expires_at) < new Date()) {
        return res
          .status(400)
          .json({ message: "This link has expired. Please request a new one." });
      }

      await storage.markMagicLinkUsed(magicLink.id);

      req.session.userId = magicLink.user_id;

      const user = await storage.getUserById(magicLink.user_id);
      let redirectTo = "/connect-strava";
      if (user) {
        if (user.program_active) {
          redirectTo = "/program";
        } else if (user.strava_connected) {
          redirectTo = "/onboarding";
        }
      }

      return res.json({ message: "Authenticated successfully", redirectTo });
    } catch (error: any) {
      console.error("Activate error:", error);
      return res.status(500).json({ message: "Activation failed" });
    }
  });

  app.get("/api/auth/session", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      return res.json({
        id: user.id,
        email: user.email,
      });
    } catch (error: any) {
      console.error("Session check error:", error);
      return res.status(500).json({ message: "Session check failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out" });
    });
  });

  app.get("/api/strava/authorize", requireAuth, (req: Request, res: Response) => {
    const redirectUri = `${getBaseUrl(req)}/api/strava/callback`;
    const scope = "activity:read_all";
    const stateNonce = crypto.randomBytes(16).toString("hex");
    req.session.stravaState = stateNonce;

    const stravaAuthUrl =
      `https://www.strava.com/oauth/authorize` +
      `?client_id=${process.env.STRAVA_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&state=${stateNonce}`;

    return res.json({ url: stravaAuthUrl });
  });

  app.get("/api/strava/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        return res.redirect("/connect-strava?strava_error=missing_params");
      }

      if (
        !req.session.userId ||
        !req.session.stravaState ||
        req.session.stravaState !== state
      ) {
        return res.redirect("/connect-strava?strava_error=invalid_state");
      }

      const userId = req.session.userId;
      delete req.session.stravaState;
      const redirectUri = `${getBaseUrl(req)}/api/strava/callback`;

      const tokenResponse = await fetch(
        "https://www.strava.com/oauth/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
          }),
        }
      );

      if (!tokenResponse.ok) {
        console.error(
          "Strava token exchange failed:",
          await tokenResponse.text()
        );
        return res.redirect("/connect-strava?strava_error=token_exchange");
      }

      const tokenData = await tokenResponse.json();

      await storage.upsertStravaConnection({
        user_id: userId,
        athlete_id: String(tokenData.athlete?.id || ""),
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
        connected_at: new Date().toISOString(),
      });

      await storage.updateUser(userId, { strava_connected: true });

      const updatedUser = await storage.getUserById(userId);
      if (updatedUser?.program_active) {
        return res.redirect("/program");
      }
      return res.redirect("/onboarding?strava=connected");
    } catch (error: any) {
      console.error("Strava callback error:", error);
      return res.redirect("/connect-strava?strava_error=callback_failed");
    }
  });

  app.get(
    "/api/user/status",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const user = await storage.getUserById(req.session.userId!);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const onboarding = await storage.getOnboardingSubmission(user.id);

        return res.json({
          email: user.email,
          strava_connected: user.strava_connected,
          onboarding_submitted: !!onboarding,
          program_active: user.program_active,
        });
      } catch (error: any) {
        console.error("Status error:", error);
        return res.status(500).json({ message: "Failed to get status" });
      }
    }
  );

  app.post(
    "/api/onboarding/submit",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const parsed = onboardingSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            message: "Validation failed",
            errors: parsed.error.errors,
          });
        }

        const userId = req.session.userId!;
        const user = await storage.getUserById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        if (!user.strava_connected) {
          return res.status(400).json({
            message: "Strava must be connected before submitting onboarding",
          });
        }

        const submittedAt = new Date();

        const dayOfWeek = submittedAt.getUTCDay();
        const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        const programStartDate = new Date(submittedAt);
        programStartDate.setUTCDate(programStartDate.getUTCDate() + daysUntilSunday);
        const programStart = programStartDate.toISOString().split("T")[0];

        const existing = await storage.getOnboardingSubmission(userId);
        const onboardingVersion = existing ? (existing.onboarding_version || 0) + 1 : 1;

        const goalPriorityOrder: Record<string, string> = {};
        parsed.data.goal_priority_order.forEach((goal: string, i: number) => {
          goalPriorityOrder[String(i + 1)] = goal;
        });

        const submissionData = {
          user_id: userId,
          user_email: user.email,
          ...parsed.data,
          goal_priority_order: goalPriorityOrder,
          onboarding_version: onboardingVersion,
          submitted_at: submittedAt.toISOString(),
          program_start: programStart,
        };

        await storage.upsertOnboardingSubmission(
          submissionData as any
        );

        let stravaAccessToken: string;
        try {
          stravaAccessToken = await getValidStravaAccessToken(userId);
        } catch (stravaErr: any) {
          console.error("[Strava] Failed to get valid token:", stravaErr?.message || stravaErr);
          return res.status(400).json({
            message:
              "Failed to get valid Strava token. Please reconnect Strava.",
          });
        }

        const { goal_priority_order: _rawGoals, ...restParsed } = parsed.data;
        const webhookBody = {
          userId,
          ...restParsed,
          goal_priority_order: goalPriorityOrder,
          userEmail: user.email,
          onboardingVersion,
          programStart: programStart,
          stravaAccessToken,
        };

        const webhookResponse = await fetch(
          process.env.N8N_ONBOARDING_WEBHOOK_URL!,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.N8N_API_KEY!,
            },
            body: JSON.stringify(webhookBody),
          }
        );

        if (!webhookResponse.ok) {
          console.error(
            "Webhook failed:",
            webhookResponse.status,
            await webhookResponse.text()
          );
          return res.status(502).json({
            message:
              "Onboarding saved but program generation failed. Please try again later.",
          });
        }

        await storage.updateUser(userId, { program_active: true });

        return res.json({
          message: "Onboarding complete! Your program is being generated.",
        });
      } catch (error: any) {
        console.error("Onboarding submit error:", error);
        return res
          .status(500)
          .json({ message: "Failed to submit onboarding" });
      }
    }
  );

  app.post(
    "/api/user/cancel",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        await storage.updateUser(req.session.userId!, {
          program_active: false,
        });
        return res.json({ message: "Program cancelled" });
      } catch (error: any) {
        console.error("Cancel error:", error);
        return res
          .status(500)
          .json({ message: "Failed to cancel program" });
      }
    }
  );

  return httpServer;
}
