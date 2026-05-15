import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getResult } from "@/lib/exam.functions";
import { CheckCircle2, XCircle, Printer, Loader2 } from "lucide-react";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [{ title: "Result · TIJCEF Volunteer Assessment 2026" }],
  }),
  component: ResultPage,
});

type Result = {
  full_name: string;
  registration_number: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
};

function ResultPage() {
  const navigate = useNavigate();
  const fetchResult = useServerFn(getResult);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem("tijcef_volunteer_id");
    if (!id) {
      navigate({ to: "/register" });
      return;
    }

    // Try cached first for instant render
    const cached = localStorage.getItem("tijcef_result");
    if (cached) {
      try {
        setResult(JSON.parse(cached));
      } catch {}
    }

    fetchResult({ data: { volunteer_id: id } })
      .then((res) => {
        if (!res) {
          navigate({ to: "/instructions" });
          return;
        }
        setResult(res);
        localStorage.setItem("tijcef_result", JSON.stringify(res));
        localStorage.setItem("tijcef_completed", "1");
      })
      .finally(() => setLoading(false));
  }, [navigate, fetchResult]);

  if (loading && !result) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!result) return null;

  const passed = result.passed;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 px-6 py-12 print:py-4">
        <div className="mx-auto max-w-2xl">
          <div className="text-center print:hidden">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Assessment complete
            </p>
            <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
              Your Result
            </h1>
          </div>

          <div className="mt-8 rounded-3xl border border-border bg-card-soft p-8 shadow-elegant print:shadow-none print:border-2">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-hero shadow-glow grid place-items-center text-primary-foreground font-bold">
                  T
                </div>
                <div>
                  <p className="font-semibold leading-tight">TIJCEF</p>
                  <p className="text-xs text-muted-foreground">Volunteer Assessment 2026</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
                  passed
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {passed ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> PASS
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" /> FAIL
                  </>
                )}
              </span>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-y-5 gap-x-6 text-sm">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="mt-1 font-semibold text-base">{result.full_name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Registration Number</dt>
                <dd className="mt-1 font-mono font-semibold text-base">
                  {result.registration_number}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Score</dt>
                <dd className="mt-1 font-semibold text-base">
                  {result.score} / {result.total}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Percentage</dt>
                <dd className="mt-1 font-semibold text-base">{result.percentage}%</dd>
              </div>
            </dl>

            <div className="mt-6">
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-hero transition-all"
                  style={{ width: `${Math.min(100, result.percentage)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Pass mark: 50%
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-3 print:hidden">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4 mr-2" /> Print result
            </Button>
            <Link to="/">
              <Button size="lg" className="rounded-full">Back to home</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
