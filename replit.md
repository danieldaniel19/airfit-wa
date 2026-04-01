# Airfit (Lactic Acid)

AI-powered fitness coaching web app for ~20 users (friends only). Email-driven, no dashboards.

## Architecture

- **Frontend**: React + Vite + wouter routing + TanStack Query + shadcn/ui
- **Backend**: Express server with session-based auth
- **Database**: Supabase (Postgres) - tables managed manually via Supabase Dashboard
- **Email**: Resend (API key, not integration)
- **External**: Strava OAuth, n8n webhook for program generation
- **Font**: Geist (loaded via index.html)

## User Flow

1. Landing page (/) -> Click "Let's go"
2. Email capture (/signup) -> Enter email, click "Sign up"
3. Magic link confirmation (same page, sent state) -> Check email
4. Click magic link -> /activate validates token, redirects based on state:
   - Strava not connected -> /connect-strava
   - Strava connected, no active program -> /onboarding
   - Program active -> /program
5. Connect Strava (/connect-strava) -> OAuth flow -> redirects to /onboarding
6. Complete 5-section onboarding (/onboarding) -> data sent to n8n webhook -> /program
7. Program page (/program) -> shows active program status with cancel/restart options

## Onboarding Flow

5 sections, 16 screens total (one-shot — no draft persistence):
- **Goals**: Q1 user_goals (textarea), Q2 trade_offs (textarea), Q3 goal_priority_order (draggable ranking → stored as jsonb {"1":"Leanness","2":"Endurance","3":"Strength"})
- **Life**: Q1 user_context (textarea), Q2 days_per_week (slider 1-7), Q3 weekends_on (Y/N) + can_train_twice_same_day (Y/N)
- **Intensity**: Q1 experience_level (segmented control), Q2 aggressiveness_preference (segmented control), Q3 recovery_capacity (segmented control)
- **Profile**: Q1 height_cm + weight_kg (inline inputs), Q2 injury_status (textarea), Q3 location (text input)
- **Training**: Q1 gym_access (segmented control), Q2 activities (multi-select chips with PNG icons → stored as jsonb array), Q3 other_preferences (textarea), Q4 user_name (text input — final screen with animated gradient "Generate My Program" button)

Final screen has animated gradient "Generate My Program" button. All other next buttons are black (#0f0f0f).

## Key Files

- `shared/schema.ts` - Types and Zod validation schemas
- `server/supabase.ts` - Supabase client
- `server/storage.ts` - Database operations (IStorage interface + SupabaseStorage)
- `server/routes.ts` - All API routes + session middleware
- `client/src/pages/landing.tsx` - Landing page (/)
- `client/src/pages/home.tsx` - Email capture + magic link sent (/signup)
- `client/src/pages/activate.tsx` - Magic link activation (/activate)
- `client/src/pages/connect-strava.tsx` - Strava OAuth connection (/connect-strava)
- `client/src/pages/onboarding.tsx` - Multi-step onboarding form (/onboarding)
- `client/src/pages/program.tsx` - Active program page (/program)

## API Routes

- POST /api/auth/request-link - Send magic link email
- POST /api/auth/activate - Validate token, create session, return redirectTo
- GET /api/auth/session - Check current session
- POST /api/auth/logout - Destroy session
- GET /api/strava/authorize - Get Strava OAuth URL
- GET /api/strava/callback - Strava OAuth callback (redirects to /onboarding or /program)
- GET /api/user/status - Get user status
- POST /api/onboarding/submit - Submit onboarding + fire n8n webhook
- POST /api/user/cancel - Cancel active program

## Database Schema (Supabase)

### users table
- id (uuid PK), email, strava_connected, program_active, created_at

### sessions table
- sid (text PK), sess (jsonb), expire (timestamptz) — persistent session store, survives server restarts

### onboarding_submissions table
- user_id (FK), user_name (text), user_email (text), user_goals (text), goal_priority_order (jsonb), trade_offs (text), user_context (text), other_preferences (text), aggressiveness_preference (text), recovery_capacity (text), weekends_on (bool), can_train_twice_same_day (bool), gym_access (text), experience_level (text), injury_status (text), height_cm (int4), weight_kg (int4), days_per_week (int4), location (text), activities (jsonb), onboarding_version (int4), submitted_at (timestamptz), program_start (date)

### Computed fields (set by server on submit)
- `submitted_at`: timestamp of submission
- `program_start`: next Sunday from submitted_at (if Sunday, same day; otherwise next Sunday)
- `onboarding_version`: incremented on each re-onboarding
- `user_email`: from user's account email
- `goal_priority_order`: converted from array to {"1":"First","2":"Second","3":"Third"} format

## Environment Variables (Secrets)

- SESSION_SECRET - Express session secret
- SUPABASE_URL - Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY - Supabase service role key
- STRAVA_CLIENT_ID - Strava API app client ID
- STRAVA_CLIENT_SECRET - Strava API app client secret
- N8N_ONBOARDING_WEBHOOK_URL - n8n webhook URL
- N8N_API_KEY - n8n webhook API key
- RESEND_API_KEY - Resend email API key

## Notes

- No Supabase Auth - custom magic link implementation
- Resend uses `onboarding@resend.dev` test domain (only sends to account owner's email). User should update FROM address when they have a verified domain.
- Strava redirect URI is computed dynamically from request host. User must register their app URL in Strava API settings.
- Sessions stored in Supabase `sessions` table (persistent across restarts/deployments). 7-day cookie maxAge.
- No sidebar navigation - linear flow app
- All protected pages (connect-strava, onboarding, program) have auth guards that show "Please sign in first" if no session
- No emoji in UI; Geist font throughout
- 13 activity icons imported as PNGs via @assets/ alias
