import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function Activate() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setErrorMessage("No token provided.");
      return;
    }

    apiRequest("POST", "/api/auth/activate", { token })
      .then(async (res) => {
        const data = await res.json();
        setStatus("success");
        setTimeout(() => navigate(data.redirectTo || "/connect-strava"), 1500);
      })
      .catch((err: Error) => {
        setStatus("error");
        setErrorMessage(
          err.message.includes("expired")
            ? "This link has expired. Please request a new one."
            : "Invalid or expired link."
        );
      });
  }, [search, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground" data-testid="text-activating">
                Signing you in...
              </p>
            </>
          )}
          {status === "success" && (
            <>
              <div className="mx-auto w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold" data-testid="text-signed-in">
                  Signed in
                </h2>
                <p className="text-muted-foreground text-sm">
                  Redirecting...
                </p>
              </div>
            </>
          )}
          {status === "error" && (
            <>
              <div className="mx-auto w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold" data-testid="text-error">
                  Sign in failed
                </h2>
                <p className="text-muted-foreground text-sm">{errorMessage}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                data-testid="button-back-home"
              >
                Back to home
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
