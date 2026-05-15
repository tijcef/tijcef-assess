import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { registerVolunteer } from "@/lib/exam.functions";
import { getFingerprint } from "@/lib/fingerprint";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register · TIJCEF Volunteer Assessment 2026" },
      {
        name: "description",
        content:
          "Register as a TIJCEF volunteer to take the 2026 assessment. Each volunteer receives a unique registration number.",
      },
      { property: "og:title", content: "Register · TIJCEF Volunteer Assessment 2026" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const register = useServerFn(registerVolunteer);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "" });

  // Already-registered check
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = localStorage.getItem("tijcef_volunteer_id");
    const completed = localStorage.getItem("tijcef_completed");
    if (id && completed === "1") {
      navigate({ to: "/result" });
    }
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.full_name.trim().length < 2) return toast.error("Enter your full name");
    if (form.phone.trim().length < 7) return toast.error("Enter a valid phone number");

    setLoading(true);
    try {
      const fingerprint = getFingerprint();
      const res = await register({
        data: {
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          fingerprint,
        },
      });

      if (res.alreadyCompleted) {
        toast.error("You have already completed this assessment.");
        localStorage.setItem("tijcef_completed", "1");
        return;
      }

      localStorage.setItem("tijcef_volunteer_id", res.id);
      localStorage.setItem("tijcef_volunteer_name", res.full_name);
      localStorage.setItem("tijcef_reg_no", res.registration_number);
      toast.success(`Registered as ${res.registration_number}`);
      navigate({ to: "/instructions" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </header>

      <main className="flex-1 grid place-items-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-hero shadow-glow grid place-items-center text-primary-foreground font-bold mb-4">
              T
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Volunteer Registration</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your registration number will be generated automatically.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-border bg-card-soft p-6 shadow-elegant space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="John Musa"
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                required
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+234 800 000 0000"
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-full" size="lg">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Continue
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              By continuing you agree that you will take the assessment honestly and only once.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
