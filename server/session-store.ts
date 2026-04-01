import session from "express-session";
import { supabase } from "./supabase";

export class SupabaseSessionStore extends session.Store {
  async get(
    sid: string,
    callback: (err: any, session?: session.SessionData | null) => void
  ) {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("sess, expire")
        .eq("sid", sid)
        .maybeSingle();

      if (error) return callback(error);
      if (!data) return callback(null, null);

      if (new Date(data.expire) < new Date()) {
        await this.destroy(sid, () => {});
        return callback(null, null);
      }

      callback(null, data.sess as session.SessionData);
    } catch (err) {
      callback(err);
    }
  }

  async set(
    sid: string,
    sessionData: session.SessionData,
    callback?: (err?: any) => void
  ) {
    try {
      const expire =
        sessionData.cookie?.expires ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const { error } = await supabase.from("sessions").upsert(
        { sid, sess: sessionData, expire: expire.toISOString() },
        { onConflict: "sid" }
      );

      if (error) {
        console.error("[Session] Failed to save session:", error.message);
      }
      callback?.();
    } catch (err) {
      callback?.(err as Error);
    }
  }

  async destroy(sid: string, callback?: (err?: any) => void) {
    try {
      await supabase.from("sessions").delete().eq("sid", sid);
      callback?.();
    } catch (err) {
      callback?.(err as Error);
    }
  }
}
