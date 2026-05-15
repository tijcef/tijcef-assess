import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Clock, Award, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TIJCEF Volunteer Assessment 2026" },
      {
        name: "description",
        content:
          "Official online assessment for Tijwun Care and Empowerment Foundation volunteers. Register, take the timed CBT exam, and receive instant results.",
      },
      { property: "og:title", content: "TIJCEF Volunteer Assessment 2026" },
      {
        property: "og:description",
        content:
          "Secure online CBT for TIJCEF volunteers — register, take the exam, and get your score instantly.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-hero shadow-glow grid place-items-center text-primary-foreground font-bold">
              T
            </div>
            <div className="leading-tight">
              <p className="font-semibold tracking-tight">TIJCEF</p>
              <p className="text-xs text-muted-foreground">Volunteer Assessment 2026</p>
            </div>
          </div>
          <Link to="/register">
            <Button size="sm" className="rounded-full">Start Assessment</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-hero opacity-[0.07] pointer-events-none" />
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Tijwun Care &amp; Empowerment Foundation
              </span>
              <h1 className="mt-5 text-4xl md:text-6xl font-semibold tracking-tight text-foreground">
                Volunteer Assessment{" "}
                <span className="bg-hero bg-clip-text text-transparent">2026</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-xl">
                A secure, timed online evaluation built for TIJCEF volunteers. Register
                once, complete the assessment, and receive your result instantly.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register">
                  <Button size="lg" className="rounded-full shadow-elegant">
                    Start Assessment
                  </Button>
                </Link>
                <a href="#about">
                  <Button size="lg" variant="outline" className="rounded-full">
                    Learn more
                  </Button>
                </a>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                One attempt per volunteer · 30 seconds per question · Instant scoring
              </p>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-hero rounded-3xl opacity-20 blur-3xl" />
              <div className="relative glass rounded-3xl border border-border p-6 shadow-elegant">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Assessment Card
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  TIJCEF/2026/<span className="text-gold">###</span>
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                  <Stat label="Questions" value="50" />
                  <Stat label="Per question" value="30s" />
                  <Stat label="Pass mark" value="50%" />
                  <Stat label="Modules" value="6" />
                </div>
                <div className="mt-6 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-2/3 bg-hero" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="border-t border-border/60 bg-card-soft">
          <div className="mx-auto max-w-6xl px-6 py-20 grid md:grid-cols-4 gap-6">
            <Feature icon={ShieldCheck} title="Secure & fair" body="Anti-cheating, fullscreen, randomized questions." />
            <Feature icon={Clock} title="Strictly timed" body="30 seconds per question with auto-advance." />
            <Feature icon={Award} title="Instant results" body="Score, percentage and pass/fail on submission." />
            <Feature icon={Users} title="One attempt" body="Each volunteer is assessed exactly once." />
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Tijwun Care &amp; Empowerment Foundation</p>
          <p>Volunteer Assessment Platform</p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
      <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
