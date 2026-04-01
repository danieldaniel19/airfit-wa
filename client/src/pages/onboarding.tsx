import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import leanessIcon from "@assets/leaness-goal-prio.png";
import enduranceIcon from "@assets/endurance-goal-prio.png";
import strengthIcon from "@assets/strength-goal-prio.png";

const SECTIONS = ["Goals", "Life", "Intensity", "Profile", "Training"];

const SECTION_QUESTIONS: Record<string, number> = {
  Goals: 2,
  Life: 2,
  Intensity: 2,
  Profile: 3,
  Training: 4,
};

interface FormData {
  user_goals: string;
  goal_priority_order: string[];
  other_preferences: string;
  aggressiveness_preference: string;
  weekends_on: boolean;
  can_train_twice_same_day: boolean;
  gym_access: string;
  activities: string[];
  user_name: string;
  experience_level: string;
  height_cm: string;
  weight_kg: string;
  injury_status: string;
  days_per_week: number;
  location: string;
}

const INITIAL: FormData = {
  user_goals: "",
  goal_priority_order: [],
  other_preferences: "",
  aggressiveness_preference: "Normal",
  weekends_on: true,
  can_train_twice_same_day: false,
  gym_access: "Full gym",
  activities: [],
  user_name: "",
  experience_level: "0-5 years",
  height_cm: "",
  weight_kg: "",
  injury_status: "",
  days_per_week: 3,
  location: "",
};

const ACTIVITIES = [
  "Bouldering",
  "Beach VB",
  "Cycling",
  "Crossfit",
  "HIIT",
  "Pilates",
  "Running",
  "Padel",
  "Soccer",
  "Strength",
  "Tennis",
  "Volleyball",
  "Yoga",
];

const GOAL_ICONS: Record<string, string> = {
  Leanness: leanessIcon,
  Endurance: enduranceIcon,
  Strength: strengthIcon,
};

const ALL_GOALS = ["Leanness", "Endurance", "Strength"];

function GoalTapRanking({
  ranked,
  onChange,
}: {
  ranked: string[];
  onChange: (items: string[]) => void;
}) {
  const handleTap = (goal: string) => {
    if (ranked.includes(goal)) return;
    onChange([...ranked, goal]);
  };

  const handleReset = () => onChange([]);

  return (
    <>
      <div className="flex flex-col items-center gap-2 text-center w-full max-w-[700px]">
        <h1
          className="text-[32px] font-medium leading-[40px] text-black"
          data-testid="text-question-title"
        >
          Rank your 3 sub-goals.
        </h1>
        <p className="text-[16px] leading-[24px] text-black/60">
          Tap them in order — most important first.
        </p>
      </div>

      <div
        className="w-full max-w-[500px] px-[10px] mt-1 flex flex-col gap-3"
        data-testid="goal-ranking-container"
      >
        {ALL_GOALS.map((goal) => {
          const rank = ranked.indexOf(goal);
          const isRanked = rank !== -1;
          const iconSrc = GOAL_ICONS[goal];
          return (
            <button
              key={goal}
              type="button"
              onClick={() => handleTap(goal)}
              disabled={isRanked}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-[12px] border text-left transition-all ${
                isRanked
                  ? "border-black/20 bg-[#f5f5f5] cursor-default"
                  : "border-[#e6e6e6] bg-[#fafafa] hover:border-black/30 hover:bg-white active:scale-[0.98]"
              }`}
              data-testid={`button-goal-${goal}`}
            >
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 transition-all ${
                  isRanked
                    ? "bg-black text-white"
                    : "bg-[#e6e6e6] text-black/30"
                }`}
              >
                {isRanked ? rank + 1 : ""}
              </span>
              {iconSrc && (
                <img src={iconSrc} alt="" className="w-5 h-5 shrink-0" />
              )}
              <span className={`text-[16px] font-medium ${isRanked ? "text-black" : "text-black/60"}`}>
                {goal}
              </span>
            </button>
          );
        })}
      </div>

      {ranked.length > 0 && (
        <button
          type="button"
          onClick={handleReset}
          className="text-[13px] text-black/40 underline underline-offset-2 mt-1"
          data-testid="button-reset-ranking"
        >
          Reset
        </button>
      )}
    </>
  );
}

function ProgressTracker({
  currentSection,
  currentQuestion,
  totalQuestions,
}: {
  currentSection: number;
  currentQuestion: number;
  totalQuestions: number;
}) {
  return (
    <div className="flex flex-col items-center gap-3" data-testid="progress-tracker">
      <div className="flex gap-4 items-center justify-center">
        {SECTIONS.map((section, i) => (
          <span
            key={section}
            className={`text-[16px] text-center ${
              i === currentSection
                ? "font-medium text-black"
                : i < currentSection
                ? "font-light text-black/60 line-through"
                : "font-light text-black/60"
            }`}
            data-testid={`progress-section-${i}`}
          >
            {section}
          </span>
        ))}
      </div>
      <div className="flex gap-4 items-center justify-center w-full max-w-[700px]">
        {Array.from({ length: totalQuestions }).map((_, i) => (
          <div
            key={i}
            className={`h-[12px] flex-1 ${
              i <= currentQuestion ? "bg-black/60" : "bg-[#e6e6e6]"
            } ${i === 0 ? "rounded-l-[12px]" : ""} ${
              i === totalQuestions - 1 ? "rounded-r-[12px]" : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitError, setSubmitError] = useState("");

  const { data: session, isLoading: sessionLoading } = useQuery<{ id: string; email: string } | null>({
    queryKey: ["/api/auth/session"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const update = <K extends keyof FormData>(key: K, val: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const submit = useMutation({
    mutationFn: async () => {
      const body = {
        ...form,
        height_cm: parseInt(form.height_cm, 10) || 0,
        weight_kg: parseInt(form.weight_kg, 10) || 0,
      };
      const res = await apiRequest("POST", "/api/onboarding/submit", body);
      return res.json();
    },
    onSuccess: () => {
      navigate(`/program?new=true&name=${encodeURIComponent(form.user_name)}`);
    },
    onError: (err: Error) => {
      setSubmitError(err.message);
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

  const currentSectionName = SECTIONS[sectionIndex];
  const totalQuestions = SECTION_QUESTIONS[currentSectionName];

  const canNext = (): boolean => {
    if (currentSectionName === "Goals" && questionIndex === 0) {
      return form.user_goals.trim() !== "";
    }
    if (currentSectionName === "Goals" && questionIndex === 1) {
      return form.goal_priority_order.length === 3;
    }
    if (currentSectionName === "Profile" && questionIndex === 0) {
      return form.height_cm.trim() !== "" && form.weight_kg.trim() !== "";
    }
    if (currentSectionName === "Profile" && questionIndex === 2) {
      return form.location.trim() !== "";
    }
    if (currentSectionName === "Training" && questionIndex === 1) {
      return form.activities.length > 0;
    }
    if (currentSectionName === "Training" && questionIndex === 3) {
      return form.user_name.trim() !== "";
    }
    return true;
  };

  const isLastQuestion =
    sectionIndex === SECTIONS.length - 1 &&
    questionIndex === totalQuestions - 1;

  const handleNext = () => {
    if (isLastQuestion) {
      submit.mutate();
      return;
    }

    if (questionIndex < totalQuestions - 1) {
      setQuestionIndex(questionIndex + 1);
    } else {
      setSectionIndex(sectionIndex + 1);
      setQuestionIndex(0);
    }
  };

  const handleBack = () => {
    if (questionIndex > 0) {
      setQuestionIndex(questionIndex - 1);
    } else if (sectionIndex > 0) {
      const prevSection = SECTIONS[sectionIndex - 1];
      setSectionIndex(sectionIndex - 1);
      setQuestionIndex(SECTION_QUESTIONS[prevSection] - 1);
    } else {
      navigate("/connect-strava");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4" data-testid="onboarding-page">
      <div className="flex flex-col items-center gap-16 max-w-[720px] w-full py-10">
        <ProgressTracker
          currentSection={sectionIndex}
          currentQuestion={questionIndex}
          totalQuestions={totalQuestions}
        />

        <div className="flex flex-col items-center gap-3 w-full">

          {/* GOALS Q0 — merged goals + context */}
          {currentSectionName === "Goals" && questionIndex === 0 && (
            <>
              <div className="flex flex-col items-center gap-2 text-center w-full max-w-[700px]">
                <h1
                  className="text-[32px] font-medium leading-[40px] text-black"
                  data-testid="text-question-title"
                >
                  What do you want from the next 3 months, and how does fitness fit into your life?
                </h1>
                <p className="text-[16px] leading-[24px] text-black/60">
                  Tell us what you're after: a specific goal, or just staying consistently active. Then describe your week: your schedule, how flexible you are, and how exercising fits around everything else.
                </p>
              </div>

              <div className="w-full max-w-[700px] px-[10px] mt-1">
                <textarea
                  value={form.user_goals}
                  onChange={(e) => update("user_goals", e.target.value)}
                  placeholder="I just want to stay fit without spending too much time. I work from home and have a flexible schedule"
                  className="w-full h-[160px] bg-[#fafafa] border border-[#e6e6e6] rounded-[8px] p-5 text-[14px] text-black placeholder:text-black/40 outline-none focus:border-black/30 transition-colors resize-none"
                  data-testid="input-goals"
                />
              </div>
            </>
          )}

          {/* GOALS Q1 — goal priority ranking */}
          {currentSectionName === "Goals" && questionIndex === 1 && (
            <GoalTapRanking
              ranked={form.goal_priority_order}
              onChange={(items) => update("goal_priority_order", items)}
            />
          )}

          {/* LIFE Q0 — days per week */}
          {currentSectionName === "Life" && questionIndex === 0 && (
            <>
              <div className="flex flex-col items-center gap-2 text-center w-full max-w-[700px]">
                <h1
                  className="text-[32px] font-medium leading-[40px] text-black"
                  data-testid="text-question-title"
                >
                  How many days per week will you train?
                </h1>
              </div>

              <div className="w-full max-w-[500px] px-[10px] mt-1">
                <div className="bg-[#fafafa] border border-[#e6e6e6] rounded-[10px] p-4 flex items-center justify-center gap-0">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => update("days_per_week", day)}
                      className={`w-[48px] h-[48px] flex items-center justify-center text-[16px] font-medium transition-all ${
                        form.days_per_week === day
                          ? "border border-black rounded-[6px] text-black bg-white"
                          : "text-black/30"
                      }`}
                      data-testid={`button-day-${day}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* LIFE Q1 — weekends + twice per day */}
          {currentSectionName === "Life" && questionIndex === 1 && (
            <div className="flex flex-col items-start gap-6 w-full max-w-[700px]">
              <div className="flex items-center gap-3">
                <span className="text-[24px] font-medium leading-[32px] text-black">
                  Ok with training twice the same day?
                </span>
                <button
                  type="button"
                  onClick={() => update("can_train_twice_same_day", !form.can_train_twice_same_day)}
                  className={`ml-4 flex items-center gap-1 rounded-[6px] border px-2 py-1 text-[14px] font-medium transition-all ${
                    form.can_train_twice_same_day
                      ? "border-black/20 bg-[#f0f0f0] text-black"
                      : "border-[#e6e6e6] bg-[#fafafa] text-black/40"
                  }`}
                  data-testid="toggle-train-twice"
                >
                  <span className={`w-2 h-2 rounded-full ${form.can_train_twice_same_day ? "bg-black/40" : "bg-black/15"}`} />
                  {form.can_train_twice_same_day ? "Y" : "N"}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[24px] font-medium leading-[32px] text-black">
                  Ok with training on weekends?
                </span>
                <button
                  type="button"
                  onClick={() => update("weekends_on", !form.weekends_on)}
                  className={`ml-4 flex items-center gap-1 rounded-[6px] border px-2 py-1 text-[14px] font-medium transition-all ${
                    form.weekends_on
                      ? "border-black/20 bg-[#f0f0f0] text-black"
                      : "border-[#e6e6e6] bg-[#fafafa] text-black/40"
                  }`}
                  data-testid="toggle-weekends"
                >
                  <span className={`w-2 h-2 rounded-full ${form.weekends_on ? "bg-black/40" : "bg-black/15"}`} />
                  {form.weekends_on ? "Y" : "N"}
                </button>
              </div>
            </div>
          )}

          {/* INTENSITY Q0 — experience level */}
          {currentSectionName === "Intensity" && questionIndex === 0 && (
            <>
              <div className="flex flex-col items-center gap-2 text-center w-full max-w-[700px]">
                <h1
                  className="text-[32px] font-medium leading-[40px] text-black"
                  data-testid="text-question-title"
                >
                  What's your experience level when it comes to working out?
                </h1>
              </div>

              <div className="w-full max-w-[500px] px-[10px] mt-1">
                <div className="bg-[#fafafa] border border-[#e6e6e6] rounded-[10px] p-3 flex items-center justify-center gap-0">
                  {["0-5 years", "5-10 years", "10+ years"].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => update("experience_level", level)}
                      className={`flex-1 h-[44px] flex items-center justify-center text-[14px] font-medium transition-all ${
                        form.experience_level === level
                          ? "border border-black rounded-[6px] text-black bg-white"
                          : "text-black/30"
                      }`}
                      data-testid={`button-experience-${level}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* INTENSITY Q1 — workout intensity */}
          {currentSectionName === "Intensity" && questionIndex === 1 && (
            <>
              <div className="flex flex-col items-center gap-2 text-center w-full max-w-[700px]">
                <h1
                  className="text-[32px] font-medium leading-[40px] text-black"
                  data-testid="text-question-title"
                >
                  How intense do you like your workouts to be?
                </h1>
              </div>

              <div className="w-full max-w-[500px] px-[10px] mt-1">
                <div className="bg-[#fafafa] border border-[#e6e6e6] rounded-[10px] p-3 flex items-center justify-center gap-0">
                  {["Light", "Normal", "Intense"].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => update("aggressiveness_preference", level)}
                      className={`flex-1 h-[44px] flex items-center justify-center text-[14px] font-medium transition-all ${
                        form.aggressiveness_preference === level
                          ? "border border-black rounded-[6px] text-black bg-white"
                          : "text-black/30"
                      }`}
                      data-testid={`button-intensity-${level}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* PROFILE Q0 — height + weight */}
          {currentSectionName === "Profile" && questionIndex === 0 && (
            <>
              <div className="flex flex-col items-start gap-6 w-full max-w-[700px]">
                <div className="flex items-center gap-3">
                  <span className="text-[24px] font-medium leading-[32px] text-black">
                    How tall are you (cm)?
                  </span>
                  <input
                    type="number"
                    value={form.height_cm}
                    onChange={(e) => update("height_cm", e.target.value)}
                    className="w-[72px] h-[40px] bg-[#fafafa] border border-[#e6e6e6] rounded-[6px] px-3 text-[14px] text-black text-center outline-none focus:border-black/30 transition-colors"
                    data-testid="input-height"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[24px] font-medium leading-[32px] text-black">
                    What's your approximate weight (kg)?
                  </span>
                  <input
                    type="number"
                    value={form.weight_kg}
                    onChange={(e) => update("weight_kg", e.target.value)}
                    className="w-[72px] h-[40px] bg-[#fafafa] border border-[#e6e6e6] rounded-[6px] px-3 text-[14px] text-black text-center outline-none focus:border-black/30 transition-colors"
                    data-testid="input-weight"
                  />
                </div>
              </div>

              <p className="text-[14px] leading-[20px] text-black/40 w-full max-w-[700px]">
                These datapoints will help us ensure your safety when generating your plans.
              </p>
            </>
          )}

          {/* PROFILE Q1 — injuries */}
          {currentSectionName === "Profile" && questionIndex === 1 && (
            <>
              <div className="flex flex-col items-center gap-2 text-center w-full max-w-[700px]">
                <h1
                  className="text-[32px] font-medium leading-[40px] text-black"
                  data-testid="text-question-title"
                >
                  Tell us about any injuries or pains.
                </h1>
                <p className="text-[16px] leading-[24px] text-black/60">
                  Share any injuries you sustained recently or recurringly. Including anything that affects how you train, like consistent pains. Leave it blank if none apply.
                </p>
              </div>

              <div className="w-full max-w-[700px] px-[10px] mt-1">
                <textarea
                  value={form.injury_status}
                  onChange={(e) => update("injury_status", e.target.value)}
                  placeholder="I sometimes feel the outside of my left knee if I run too long (...)"
                  className="w-full h-[120px] bg-[#fafafa] border border-[#e6e6e6] rounded-[8px] p-5 text-[14px] text-black placeholder:text-black/40 outline-none focus:border-black/30 transition-colors resize-none"
                  data-testid="input-injury-status"
                />
              </div>
            </>
          )}

          {/* PROFILE Q2 — location */}
          {currentSectionName === "Profile" && questionIndex === 2 && (
            <>
              <div className="flex flex-col items-center gap-2 text-center w-full max-w-[700px]">
                <h1
                  className="text-[32px] font-medium leading-[40px] text-black"
                  data-testid="text-question-title"
                >
                  In what city and country do you live?
                </h1>
                <p className="text-[16px] leading-[24px] text-black/60">
                  This will help the models determine when to recommend indoor or outdoor activities based on seasonality.
                </p>
              </div>

              <div className="w-full max-w-[600px] px-[10px] mt-1">
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="Munich, Germany"
                  className="w-full h-[44px] bg-white border-b border-[#e6e6e6] px-3 text-[16px] text-black placeholder:text-black/30 outline-none focus:border-black/30 transition-colors"
                  data-testid="input-location"
                />
              </div>
            </>
          )}

          {/* TRAINING Q0 — gym access */}
          {currentSectionName === "Training" && questionIndex === 0 && (
            <>
              <div className="flex flex-col items-center gap-2 text-center w-full max-w-[700px]">
                <h1
                  className="text-[32px] font-medium leading-[40px] text-black"
                  data-testid="text-question-title"
                >
                  What type of gym do you have access to for strength training?
                </h1>
              </div>

              <div className="w-full max-w-[500px] px-[10px] mt-1">
                <div className="bg-[#fafafa] border border-[#e6e6e6] rounded-[10px] p-3 flex items-center justify-center gap-0">
                  {["Home gym", "Small gym", "Full gym"].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => update("gym_access", level)}
                      className={`flex-1 h-[44px] flex items-center justify-center text-[14px] font-medium transition-all ${
                        form.gym_access === level
                          ? "border border-black rounded-[6px] text-black bg-white"
                          : "text-black/30"
                      }`}
                      data-testid={`button-gym-${level}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TRAINING Q1 — activities */}
          {currentSectionName === "Training" && questionIndex === 1 && (
            <>
              <div className="flex flex-col items-center gap-2 text-center w-full max-w-[700px]">
                <h1
                  className="text-[32px] font-medium leading-[40px] text-black"
                  data-testid="text-question-title"
                >
                  What activities do you want to do?
                </h1>
              </div>

              <div className="w-full max-w-[700px] px-[10px] mt-1">
                <div className="flex flex-wrap justify-center gap-2">
                  {ACTIVITIES.map((activity) => {
                    const isSelected = form.activities.includes(activity);
                    return (
                      <button
                        key={activity}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            update(
                              "activities",
                              form.activities.filter((a: string) => a !== activity)
                            );
                          } else {
                            update("activities", [...form.activities, activity]);
                          }
                        }}
                        className={`px-4 py-2.5 rounded-[8px] border text-[14px] font-medium transition-all ${
                          isSelected
                            ? "border-black bg-black/5 text-black"
                            : "border-[#e6e6e6] bg-[#fafafa] text-black/60"
                        }`}
                        data-testid={`chip-activity-${activity}`}
                      >
                        {activity}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TRAINING Q2 — non-negotiables / other preferences */}
          {currentSectionName === "Training" && questionIndex === 2 && (
            <>
              <div className="flex flex-col items-center gap-2 text-center w-full max-w-[700px]">
                <h1
                  className="text-[32px] font-medium leading-[40px] text-black"
                  data-testid="text-question-title"
                >
                  Any non-negotiables or hard constraints?
                </h1>
                <p className="text-[16px] leading-[24px] text-black/60">
                  This is the place to be specific about structure. Things like how often you want a certain type of workout, sessions you want to keep or avoid, time constraints, or anything else you feel strongly about. Leave it blank if you're happy to let the model decide.
                </p>
              </div>

              <div className="w-full max-w-[700px] px-[10px] mt-1">
                <textarea
                  value={form.other_preferences}
                  onChange={(e) => update("other_preferences", e.target.value)}
                  placeholder="I want strength training at least 2x a week. No supersets. Keep gym sessions under 60 minutes on weekdays."
                  className="w-full h-[120px] bg-[#fafafa] border border-[#e6e6e6] rounded-[8px] p-5 text-[14px] text-black placeholder:text-black/40 outline-none focus:border-black/30 transition-colors resize-none"
                  data-testid="input-other-preferences"
                />
              </div>
            </>
          )}

          {/* TRAINING Q3 — name */}
          {currentSectionName === "Training" && questionIndex === 3 && (
            <>
              <div className="flex flex-col items-center gap-2 text-center w-full max-w-[700px]">
                <h1
                  className="text-[32px] font-medium leading-[40px] text-black"
                  data-testid="text-question-title"
                >
                  Almost there. What's your name?
                </h1>
                <p className="text-[16px] leading-[24px] text-black/60">
                  This is how your coach will address you in your weekly emails.
                </p>
              </div>

              <div className="w-full max-w-[500px] px-[10px] mt-1">
                <input
                  type="text"
                  value={form.user_name}
                  onChange={(e) => update("user_name", e.target.value)}
                  placeholder="Your name"
                  className="w-full h-[52px] bg-[#fafafa] border border-[#e6e6e6] rounded-[8px] px-5 text-[16px] text-black text-center placeholder:text-black/30 outline-none focus:border-black/30 transition-colors"
                  data-testid="input-user-name"
                />
              </div>
            </>
          )}

          {submitError && (
            <p className="text-[14px] text-red-500 text-center" data-testid="text-error">
              {submitError}
            </p>
          )}

          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={handleBack}
              className="text-[14px] font-medium text-black/60"
              data-testid="button-back"
            >
              Back
            </button>
            {isLastQuestion ? (
              <button
                onClick={handleNext}
                disabled={!canNext() || submit.isPending}
                className="generate-btn relative text-white text-[14px] font-medium leading-[24px] px-10 py-[12px] rounded-[12px] h-[48px] flex items-center justify-center disabled:opacity-50 overflow-hidden"
                data-testid="button-generate"
              >
                {submit.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                ) : (
                  <span className="relative z-10">Generate My Program</span>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canNext()}
                className="bg-[#0f0f0f] text-white text-[14px] font-medium leading-[24px] px-8 py-[10px] rounded-[10px] h-[44px] flex items-center justify-center disabled:opacity-50"
                data-testid="button-next"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
