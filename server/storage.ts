import { supabase } from "./supabase";
import type {
  User,
  MagicLink,
  StravaConnection,
  OnboardingSubmission,
} from "@shared/schema";

export interface IStorage {
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  createUser(email: string): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<void>;

  createMagicLink(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<MagicLink>;
  getMagicLinkByHash(tokenHash: string): Promise<MagicLink | null>;
  markMagicLinkUsed(id: string): Promise<void>;

  getStravaConnection(userId: string): Promise<StravaConnection | null>;
  upsertStravaConnection(
    data: Partial<StravaConnection> & { user_id: string }
  ): Promise<void>;

  getOnboardingSubmission(
    userId: string
  ): Promise<OnboardingSubmission | null>;
  upsertOnboardingSubmission(data: OnboardingSubmission): Promise<void>;

}

export class SupabaseStorage implements IStorage {
  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (error) throw new Error(`Failed to get user: ${error.message}`);
    return data;
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`Failed to get user: ${error.message}`);
    return data;
  }

  async createUser(email: string): Promise<User> {
    const { data, error } = await supabase
      .from("users")
      .insert({ email })
      .select()
      .single();
    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return data;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id);
    if (error) throw new Error(`Failed to update user: ${error.message}`);
  }

  async createMagicLink(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<MagicLink> {
    const { data, error } = await supabase
      .from("magic_links")
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        used: false,
      })
      .select()
      .single();
    if (error)
      throw new Error(`Failed to create magic link: ${error.message}`);
    return data;
  }

  async getMagicLinkByHash(tokenHash: string): Promise<MagicLink | null> {
    const { data, error } = await supabase
      .from("magic_links")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("used", false)
      .maybeSingle();
    if (error)
      throw new Error(`Failed to get magic link: ${error.message}`);
    return data;
  }

  async markMagicLinkUsed(id: string): Promise<void> {
    const { error } = await supabase
      .from("magic_links")
      .update({ used: true })
      .eq("id", id);
    if (error)
      throw new Error(`Failed to mark magic link used: ${error.message}`);
  }

  async getStravaConnection(
    userId: string
  ): Promise<StravaConnection | null> {
    const { data, error } = await supabase
      .from("strava_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error)
      throw new Error(`Failed to get Strava connection: ${error.message}`);
    return data;
  }

  async upsertStravaConnection(
    data: Partial<StravaConnection> & { user_id: string }
  ): Promise<void> {
    const { error } = await supabase
      .from("strava_connections")
      .upsert(data, { onConflict: "user_id" });
    if (error)
      throw new Error(
        `Failed to upsert Strava connection: ${error.message}`
      );
  }

  async getOnboardingSubmission(
    userId: string
  ): Promise<OnboardingSubmission | null> {
    const { data, error } = await supabase
      .from("onboarding_submissions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error)
      throw new Error(
        `Failed to get onboarding submission: ${error.message}`
      );
    return data;
  }

  async upsertOnboardingSubmission(
    data: OnboardingSubmission
  ): Promise<void> {
    const { error } = await supabase
      .from("onboarding_submissions")
      .upsert(data, { onConflict: "user_id" });
    if (error)
      throw new Error(
        `Failed to upsert onboarding submission: ${error.message}`
      );
  }
}

export const storage = new SupabaseStorage();
