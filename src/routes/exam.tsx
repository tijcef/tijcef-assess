import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { startExam, submitExam } from "@/lib/exam.functions";
import { Loader2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/exam")({
  beforeLoad: () => {
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("tijcef_completed") === "1"
    ) {
      throw redirect({ to: "/result" });
    }
  },
  head: () => ({
    meta: [{ title: "Exam · TIJCEF Volunteer Assessment 2026" }],
  }),
  component: ExamPage,
});

type Question = {
  id: string;
  module: string;
  question: string;
  options: { display: string; original: "A" | "B" | "C" | "D"; text: string }[];
};

type ExamData = {
  volunteer: { id: string; full_name: string; registration_number: string };
  questions: Question[];
  total: number;
  seconds_per_question: number;
};

const SECONDS = 30;
const MAX_VIOLATIONS = 3;

function ExamPage() {
  const navigate = useNavigate();
  const startFn = useServerFn(startExam);
  const submitFn = useServerFn(submitExam);

  const [data, setData] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D" | null>>({});
  const [time, setTime] = useState(SECONDS);
  const [violations, setViolations] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const submittedRef = useRef(false);
  const dataRef = useRef<ExamData | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  dataRef.current = data;

  // ---------- Load exam ----------
  useEffect(() => {
    const volunteer_id = localStorage.getItem("tijcef_volunteer_id");
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!volunteer_id) {
      setError("No volunteer session found. Please register first.");
      setLoading(false);
      return;
    }
    if (!UUID_RE.test(volunteer_id)) {
      // Stale/corrupt id from an older build — clear it so /register works cleanly.
      localStorage.removeItem("tijcef_volunteer_id");
      setError("Your session is invalid or expired. Please register again.");
      setLoading(false);
      return;
    }
    if (localStorage.getItem("tijcef_completed") === "1") {
      navigate({ to: "/result" });
      return;
    }

    startFn({ data: { volunteer_id } })
      .then((res) => {
        if (res.alreadyCompleted) {
          localStorage.setItem("tijcef_completed", "1");
          navigate({ to: "/result" });
          return;
        }
        setData({
          volunteer: res.volunteer,
          questions: res.questions as Question[],
          total: res.total,
          seconds_per_question: res.seconds_per_question,
        });
        const initial: Record<string, null> = {};
        for (const q of res.questions) initial[q.id] = null;
        setAnswers(initial);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Failed to load exam";
        if (/not found/i.test(msg)) {
          localStorage.removeItem("tijcef_volunteer_id");
          setError("Volunteer record not found. Please register again.");
        } else {
          setError(msg);
        }
      })
      .finally(() => setLoading(false));
  }, [navigate, startFn]);

  // ---------- Submit ----------
  const submit = useCallback(
    async (reason?: string) => {
      if (submittedRef.current) return;
      const d = dataRef.current;
      if (!d) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
        const res = await submitFn({
          data: {
            volunteer_id: d.volunteer.id,
            answers: answersRef.current,
            total: d.total,
          },
        });
        localStorage.setItem("tijcef_completed", "1");
        localStorage.setItem("tijcef_result", JSON.stringify(res));
        if (reason) toast.warning(reason);
        navigate({ to: "/result" });
      } catch (e) {
        submittedRef.current = false;
        toast.error(e instanceof Error ? e.message : "Submission failed — retrying");
        setSubmitting(false);
      }
    },
    [navigate, submitFn],
  );

  // ---------- Timer ----------
  useEffect(() => {
    if (!data || submittedRef.current) return;
    setTime(SECONDS);
    const t = setInterval(() => {
      setTime((s) => {
        if (s <= 1) {
          clearInterval(t);
          // advance or submit
          setIdx((i) => {
            const isLast = i >= (dataRef.current?.questions.length ?? 1) - 1;
            if (isLast) {
              submit();
              return i;
            }
            return i + 1;
          });
          return SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [data, idx, submit]);

  // ---------- Anti-cheat ----------
  const recordViolation = useCallback(
    (label: string) => {
      if (submittedRef.current) return;
      setViolations((v) => {
        const next = v + 1;
        if (next >= MAX_VIOLATIONS) {
          submit(`Auto-submitted: ${label} (limit reached).`);
        } else {
          toast.warning(`${label} — warning ${next}/${MAX_VIOLATIONS}`);
        }
        return next;
      });
    },
    [submit],
  );

  useEffect(() => {
    if (!data) return;

    const onContext = (e: MouseEvent) => e.preventDefault();
    const onCopy = (e: ClipboardEvent) => e.preventDefault();
    const onSelect = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        k === "f12" ||
        (e.ctrlKey && ["c", "v", "u", "s", "a", "p"].includes(k)) ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k))
      ) {
        e.preventDefault();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") recordViolation("Tab switch detected");
    };
    const onBlur = () => recordViolation("Window left focus");
    const onFs = () => {
      if (!document.fullscreenElement) recordViolation("Fullscreen exited");
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("contextmenu", onContext);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("paste", onCopy);
    document.addEventListener("selectstart", onSelect);
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("beforeunload", onBeforeUnload);

    // Try fullscreen on first interaction
    const tryFs = () => {
      document.documentElement.requestFullscreen?.().catch(() => undefined);
    };
    tryFs();

    return () => {
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("paste", onCopy);
      document.removeEventListener("selectstart", onSelect);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [data, recordViolation]);

  const q = data?.questions[idx];
  const progress = useMemo(
    () => (data ? ((idx + 1) / data.total) * 100 : 0),
    [data, idx],
  );

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Preparing your exam…
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <div className="max-w-md text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
          <p className="mt-3 font-semibold">{error}</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/register" })}>
            Back to registration
          </Button>
        </div>
      </div>
    );
  }
  if (!data || !q) return null;

  function pickAnswer(original: "A" | "B" | "C" | "D") {
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.id]: original }));
  }

  function next() {
    const isLast = idx >= data!.total - 1;
    if (isLast) submit();
    else setIdx((i) => i + 1);
  }

  const timePct = (time / SECONDS) * 100;
  const danger = time <= 5;

  return (
    <div className="min-h-screen bg-background no-select">
      <header className="border-b border-border/60 bg-background/85 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-6 py-3 flex items-center justify-between gap-4">
          <div className="text-sm">
            <p className="font-mono">{data.volunteer.registration_number}</p>
            <p className="text-xs text-muted-foreground">{data.volunteer.full_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Question {idx + 1} of {data.total}
            </span>
            <div
              className={`relative h-12 w-12 rounded-full grid place-items-center font-mono font-semibold transition-colors ${
                danger ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
              }`}
              style={{
                background: `conic-gradient(currentColor ${timePct}%, transparent ${timePct}%)`,
              }}
            >
              <span className="absolute inset-1 rounded-full bg-background grid place-items-center text-foreground">
                {time}
              </span>
            </div>
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-xs uppercase tracking-widest text-primary font-medium">{q.module}</p>
        <h1 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight leading-snug">
          {q.question}
        </h1>

        <div className="mt-8 grid gap-3">
          {q.options.map((opt) => {
            const selected = answers[q.id] === opt.original;
            return (
              <button
                key={opt.display}
                onClick={() => pickAnswer(opt.original)}
                className={`group text-left rounded-2xl border p-4 transition-all ${
                  selected
                    ? "border-primary bg-primary/5 shadow-glow"
                    : "border-border bg-background hover:border-primary/40 hover:bg-card-soft"
                }`}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`h-9 w-9 rounded-xl grid place-items-center font-semibold shrink-0 ${
                      selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    {opt.display}
                  </span>
                  <span className="pt-1.5">{opt.text}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Violations: <span className="font-semibold text-foreground">{violations}/{MAX_VIOLATIONS}</span>
          </p>
          <Button
            onClick={next}
            disabled={submitting}
            size="lg"
            className="rounded-full shadow-elegant"
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {idx >= data.total - 1 ? "Submit exam" : "Next question"}
          </Button>
        </div>
      </main>
    </div>
  );
}
