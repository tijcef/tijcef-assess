import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/instructions")({
  head: () => ({
    meta: [
      { title: "Instructions · TIJCEF Volunteer Assessment 2026" },
      {
        name: "description",
        content:
          "Read the rules and timing for the TIJCEF 2026 volunteer assessment before you begin.",
      },
    ],
  }),
  component: InstructionsPage,
});

const RULES = [
  "The assessment contains 50 multiple-choice questions across 6 modules.",
  "Each question is timed at exactly 30 seconds. The timer auto-advances.",
  "You cannot return to a previous question.",
  "The exam will run in fullscreen. Leaving fullscreen or switching tabs is recorded.",
  "After 3 violations the exam will be auto-submitted.",
  "Each volunteer is allowed exactly ONE attempt.",
  "Your result will be displayed immediately after submission.",
];

function InstructionsPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [reg, setReg] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("tijcef_volunteer_id");
    if (!id) {
      navigate({ to: "/register" });
      return;
    }
    if (localStorage.getItem("tijcef_completed") === "1") {
      navigate({ to: "/result" });
      return;
    }
    setName(localStorage.getItem("tijcef_volunteer_name") || "");
    setReg(localStorage.getItem("tijcef_reg_no") || "");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-border bg-card-soft p-6 shadow-elegant">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Volunteer</p>
            <div className="mt-1 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xl font-semibold">{name || "—"}</p>
              <p className="rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-mono">
                {reg || "—"}
              </p>
            </div>
          </div>

          <h1 className="mt-10 text-3xl font-semibold tracking-tight">Read carefully before you begin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            By starting the assessment you agree to all rules below.
          </p>

          <ul className="mt-8 space-y-3">
            {RULES.map((r) => (
              <li
                key={r}
                className="flex gap-3 rounded-xl border border-border bg-background p-4"
              >
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm">{r}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex justify-end">
            <Button
              size="lg"
              className="rounded-full shadow-elegant"
              onClick={() => navigate({ to: "/exam" })}
            >
              I understand — start exam
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
