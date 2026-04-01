import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import stravaButtonIcon from "@assets/strava-button-icon.png";
import iconLeadTheWay from "@assets/pannel1-strava.png";
import iconBeforeYouClick from "@assets/panel2-beforeyouclick.png";

export default function ConnectStrava() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const [error, setError] = useState("");

  const { data: session, isLoading: sessionLoading } = useQuery<{ id: string; email: string } | null>({
    queryKey: ["/api/auth/session"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("strava_error")) {
      setError("There was an issue connecting your Strava account. Please try again.");
    }
  }, [search]);

  const connectStrava = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/strava/authorize");
      return res.json();
    },
    onSuccess: (data) => {
      window.location.href = data.url;
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4" data-testid="connect-strava-page">
      <div className="flex flex-col items-center gap-8 max-w-[720px] w-full py-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1
            className="text-[32px] font-medium leading-[40px] text-black"
            data-testid="text-strava-title"
          >
            Now let's connect your Strava to Airfit.
          </h1>
          <p className="text-[16px] leading-[24px] text-black/60">
            We'll use your last 30 workouts to understand how you've been exercising.
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-[640px]">
          <div
            className="border border-[#e6e6e6] rounded-[12px] p-6 flex gap-5"
            data-testid="card-lead-the-way"
          >
            <img src={iconLeadTheWay} alt="" className="h-[48px] w-[48px] object-contain shrink-0 mt-1" />
            <div>
              <p className="text-[15px] font-semibold text-black mb-2">
                You don't need an active Strava history
              </p>
              <p className="text-[15px] leading-[22px] text-black/60">
                Whether you've been tracking workouts for years or barely use Strava, you're welcome here. If there's little to no history, your program will be built from your onboarding answers instead. The more you log going forward, the better your weekly plans will get over time.
              </p>
            </div>
          </div>

          <div
            className="border border-[#e6e6e6] rounded-[12px] p-6 flex gap-5"
            data-testid="card-before-you-click"
          >
            <img src={iconBeforeYouClick} alt="" className="h-[48px] w-[48px] object-contain shrink-0 mt-1" />
            <div>
              <p className="text-[15px] font-semibold text-black mb-2">
                Before you click on that orange button
              </p>
              <p className="text-[15px] leading-[22px] text-black/60">
                Make sure you're logged into Strava before starting the connection. If you're on your phone, this works best if you have the Strava app and are logged in. You can always use the magic link from your confirmation email to come back here if you need to.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-[14px] text-red-500 text-center" data-testid="text-error">
            {error}
          </p>
        )}

        <button
          onClick={() => connectStrava.mutate()}
          disabled={connectStrava.isPending}
          className="bg-[#fc5200] text-white text-[14px] font-medium leading-[24px] px-6 py-[10px] rounded-[10px] h-[44px] flex items-center justify-center gap-2.5 disabled:opacity-50"
          data-testid="button-connect-strava"
        >
          {connectStrava.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <img src={stravaButtonIcon} alt="" className="h-[24px] w-[24px] object-contain" />
              Connect
            </>
          )}
        </button>
      </div>
    </div>
  );
}
