import { useLocation } from "wouter";
import iconConnect from "@assets/1-strava-card-landing.png";
import iconGoal from "@assets/2-commit-card-landing.png";
import iconWorkouts from "@assets/3-models-card-landing.png";

const steps = [
  {
    icon: iconConnect,
    number: 1,
    title: "Connect your Strava*",
    description:
      "We'll check your last 30 workouts to understand your patterns and how you approach exercising.",
  },
  {
    icon: iconGoal,
    number: 2,
    title: "Commit to a goal",
    description:
      "Tell us what you want to achieve in the next 3 months, how's your life right now and what you enjoy doing.",
  },
  {
    icon: iconWorkouts,
    number: 3,
    title: "Leave the rest to us",
    description:
      "We'll use a combination of models to generate a workout routine that is designed around your needs.",
  },
];

export default function Landing() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white" data-testid="landing-page">
      <div className="flex flex-col items-center justify-center gap-8 max-w-[720px] w-full px-4 py-10 flex-1">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1
            className="text-[32px] font-medium leading-[40px] text-black"
            data-testid="text-landing-title"
          >
            Welcome to Airfit, a new take on fitness.
          </h1>
          <p
            className="text-[16px] leading-[24px] text-black/60"
            data-testid="text-landing-subtitle"
          >
            Eliminate the guesswork from your fitness routine in 3 easy steps:
          </p>
        </div>

        <div
          className="flex flex-col md:flex-row gap-4 items-stretch justify-center w-full"
          data-testid="steps-container"
        >
          {steps.map((step) => (
            <div
              key={step.number}
              className="bg-[#fafafa] border border-[#e6e6e6] rounded-[12px] p-4 md:flex-1 flex flex-col items-center gap-3 pt-6 min-h-[220px] w-full max-w-[260px] mx-auto md:max-w-none md:mx-0"
              data-testid={`card-step-${step.number - 1}`}
            >
              <img
                src={step.icon}
                alt=""
                className="h-[48px] w-auto object-contain"
              />
              <p className="text-[16px] font-medium text-black text-center leading-normal">
                {step.number}. {step.title}
              </p>
              <p className="text-[14px] text-black/60 text-center leading-normal">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate("/signup")}
          className="bg-[#0f0f0f] text-white text-[14px] font-medium leading-[24px] px-8 py-[10px] rounded-[10px] h-[44px] flex items-center justify-center"
          data-testid="button-lets-go"
        >
          Let's go
        </button>

        <p className="text-[14px] font-thin leading-[24px] text-black/60 text-center">
          *You need a Strava account to use Airfit but it's ok if you haven't logged many activities in the past.
        </p>
      </div>

      <footer className="w-full py-8 text-center">
        <p className="text-[13px] leading-[20px] text-black/40">
          Airfit is a passion side-project built by{" "}
          <a
            href="https://www.linkedin.com/in/danielloureiro19"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            data-testid="link-linkedin"
          >
            Daniel Loureiro
          </a>
          {" "}and will always be free.
        </p>
        <p className="text-[13px] leading-[20px] text-black/40">
          Designed and developed in Porto and Munich, between late 2025 and early 2026.
        </p>
      </footer>
    </div>
  );
}
