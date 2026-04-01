import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function Program() {
  const [, navigate] = useLocation();
  const [error, setError] = useState("");

  const params = new URLSearchParams(window.location.search);
  const isNew = params.get("new") === "true";
  const userName = params.get("name") || "";

  const { data: session, isLoading: sessionLoading } = useQuery<{ id: string; email: string } | null>({
    queryKey: ["/api/auth/session"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const cancelProgram = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/user/cancel");
      return res.json();
    },
    onSuccess: () => {
      navigate("/onboarding");
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-black/30" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-black/60">Please sign in first.</p>
          <button
            onClick={() => navigate("/signup")}
            className="bg-[#0f0f0f] text-white text-[14px] font-medium leading-[24px] px-8 py-[10px] rounded-[10px] h-[44px] flex items-center justify-center"
            data-testid="button-go-sign-in"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  if (isNew) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4" data-testid="program-page">
        <div className="flex flex-col items-center gap-5 max-w-[520px] w-full text-center">
          <h1
            className="text-[28px] font-medium leading-[36px] text-black"
            data-testid="text-program-title"
          >
            {userName ? `You're all set, ${userName}.` : "You're all set."}
          </h1>
          <p className="text-[16px] leading-[26px] text-black/60">
            Your coach is building your 3-month program right now. You'll receive a full overview by email in the next few minutes — it's worth a read, it covers the structure of all three phases.
          </p>
          <p className="text-[16px] leading-[26px] text-black/60">
            Your first weekly plan arrives this Sunday evening. Every Sunday after that, next week's workouts land in your inbox.
          </p>
          <div className="flex flex-col items-center gap-3 mt-2">
            <button
              onClick={() => navigate("/onboarding")}
              className="text-[14px] text-black/40 underline"
              data-testid="link-restart-onboarding"
            >
              Made a mistake? Restart onboarding
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4" data-testid="program-page">
      <div className="flex flex-col items-center gap-6 max-w-[540px] w-full text-center">
        <h1
          className="text-[28px] font-medium leading-[36px] text-black"
          data-testid="text-program-title"
        >
          Your program is underway.
        </h1>
        <p className="text-[16px] leading-[24px] text-black/60">
          You already have an active training program. Weekly plans are being delivered to your inbox.
        </p>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => navigate("/onboarding")}
            className="text-[15px] font-medium text-black underline"
            data-testid="link-restart-onboarding"
          >
            Restart onboarding
          </button>
          <button
            onClick={() => cancelProgram.mutate()}
            disabled={cancelProgram.isPending}
            className="text-[15px] text-black/60 underline disabled:opacity-50"
            data-testid="link-cancel-program"
          >
            {cancelProgram.isPending ? "Cancelling..." : "Cancel program"}
          </button>
          {error && (
            <p className="text-[14px] text-red-500" data-testid="text-error">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
