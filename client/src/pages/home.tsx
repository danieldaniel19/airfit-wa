import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import iconNoSurprises from "@assets/1-no-surprises-email-capture.png";
import iconAirtight from "@assets/2-airtight-data-email-capture.png";
import iconControl from "@assets/3-user-control-email-capture.png";

const promises = [
  {
    icon: iconNoSurprises,
    label: "No Surprises",
    text: "We'll only use your email to send your workouts.",
  },
  {
    icon: iconAirtight,
    label: "Airtight",
    text: "Your data will never leave Airfit or be monetized.",
  },
  {
    icon: iconControl,
    label: "You're in control",
    text: "Unsubscribe anytime. Data deleted automatically.",
  },
];

export default function Home() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const requestLink = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/request-link", {
        email,
      });
      return res.json();
    },
    onSuccess: () => {
      setSent(true);
      setError("");
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4" data-testid="magic-link-sent">
        <div className="flex flex-col items-center gap-8 max-w-[720px] w-full text-center">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-[32px] font-medium leading-[40px] text-black" data-testid="text-check-email">
              Check your email
            </h1>
            <p className="text-[16px] leading-[24px] text-black/60">
              We sent you a magic link.
            </p>
          </div>
          <button
            onClick={() => requestLink.mutate()}
            disabled={requestLink.isPending}
            className="bg-[#0f0f0f] text-white text-[14px] font-medium leading-[24px] px-8 py-[10px] rounded-[10px] h-[44px] flex items-center justify-center disabled:opacity-50"
            data-testid="button-resend-link"
          >
            {requestLink.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Re-send link"
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4" data-testid="signup-page">
      <div className="flex flex-col items-center gap-8 max-w-[540px] w-full py-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1
            className="text-[28px] font-medium leading-[36px] text-black"
            data-testid="text-signup-title"
          >
            Airfit works like a training newsletter.
          </h1>
          <p className="text-[16px] leading-[24px] text-black/60">
            We deliver your 3-month program and weekly plans directly to your inbox.
            <br />
            Your first plan will arrive next Sunday evening.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full" data-testid="promises-container">
          {promises.map((item, i) => (
            <div
              key={i}
              className="border border-[#e6e6e6] rounded-[12px] px-5 py-4 flex items-center gap-4"
              data-testid={`card-promise-${i}`}
            >
              <img src={item.icon} alt="" className="h-[40px] w-[40px] object-contain shrink-0" />
              <div className="flex flex-col">
                <span className="text-[15px] font-semibold text-black">
                  {item.label}
                </span>
                <span className="text-[15px] text-black/60">
                  {item.text}
                </span>
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) requestLink.mutate();
          }}
          className="flex flex-col items-center gap-4 w-full"
        >
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-[#e6e6e6] rounded-[10px] px-4 py-3 text-[15px] text-black placeholder:text-black/30 outline-none focus:border-black/30 transition-colors"
            data-testid="input-email"
          />
          <button
            type="submit"
            disabled={requestLink.isPending || !email.trim()}
            className="bg-[#0f0f0f] text-white text-[14px] font-medium leading-[24px] px-8 py-[10px] rounded-[10px] h-[44px] flex items-center justify-center disabled:opacity-50"
            data-testid="button-sign-up"
          >
            {requestLink.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Sign up"
            )}
          </button>
          {error && (
            <p className="text-[14px] text-red-500 text-center" data-testid="text-error">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
