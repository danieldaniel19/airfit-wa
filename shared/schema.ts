import { z } from "zod";

export interface User {
  id: string;
  email: string;
  strava_connected: boolean;
  program_active: boolean;
  created_at: string;
}

export interface MagicLink {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface StravaConnection {
  user_id: string;
  athlete_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  connected_at: string;
}

export interface OnboardingSubmission {
  user_id: string;
  user_name: string | null;
  user_email: string;
  user_goals: string;
  goal_priority_order: Record<string, string>;
  other_preferences: string | null;
  aggressiveness_preference: string;
  weekends_on: boolean;
  can_train_twice_same_day: boolean;
  gym_access: string;
  experience_level: string;
  injury_status: string | null;
  height_cm: number;
  weight_kg: number;
  days_per_week: number;
  location: string;
  activities: string[];
  onboarding_version: number;
  submitted_at: string;
  program_start: string;
}

export interface UserStatus {
  email: string;
  strava_connected: boolean;
  onboarding_submitted: boolean;
  program_active: boolean;
}

export const requestLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const onboardingSchema = z.object({
  user_name: z.string().optional().default(""),
  user_goals: z.string().min(1, "Please describe your goals"),
  goal_priority_order: z.array(z.string()).length(3, "Please rank all 3 goals"),
  other_preferences: z.string().optional().default(""),
  aggressiveness_preference: z.string().min(1, "Select aggressiveness level"),
  weekends_on: z.boolean(),
  can_train_twice_same_day: z.boolean(),
  gym_access: z.string().min(1, "Describe your gym access"),
  experience_level: z.string().min(1, "Select experience level"),
  injury_status: z.string().optional().default("None"),
  height_cm: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  weight_kg: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  days_per_week: z.number().int().min(1).max(7),
  location: z.string().min(1, "Location is required"),
  activities: z.array(z.string()).min(1, "Select at least one activity"),
});

export type RequestLinkInput = z.infer<typeof requestLinkSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
