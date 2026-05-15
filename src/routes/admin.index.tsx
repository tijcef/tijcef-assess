import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { isCurrentUserAdmin } from "@/lib/admin.functions";
import {
  getAdminStats,
  listVolunteers,
  getLeaderboard,
  listQuestions,
  upsertQuestion,
  deleteQuestion,
  resetVolunteerAttempt,
} from "@/lib/admin-data.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  LogOut,
  Loader2,
  Users,
  FileQuestion,
  CheckCircle2,
  TrendingUp,
  Trophy,
  Plus,
  Pencil,
  Trash2,
  Download,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — TIJCEF Assessment 2026" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/admin/login" });
  },
  component: AdminDashboard,
});

const MODULES = [
  "TIJCEF Mission & Vision",
  "Volunteer Code of Conduct",
  "Child Safeguarding",
  "Community Engagement",
  "Health & Safety",
  "Communication Skills",
];

type Question = {
  id: string;
  module: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
};

function AdminDashboard() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(isCurrentUserAdmin);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      try {
        const res = await checkAdmin();
        setIsAdmin(res.isAdmin);
        if (res.bootstrapped) toast.success("You've been set as the first admin.");
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [checkAdmin]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold">Access denied</h1>
          <p className="text-muted-foreground">
            Your account ({email}) is not authorized as an admin.
          </p>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="size-4 mr-2" /> Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 grid place-items-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="font-semibold leading-none">TIJCEF Admin</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="size-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewPanel />
          </TabsContent>
          <TabsContent value="volunteers">
            <VolunteersPanel />
          </TabsContent>
          <TabsContent value="leaderboard">
            <LeaderboardPanel />
          </TabsContent>
          <TabsContent value="questions">
            <QuestionsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function OverviewPanel() {
  const fetchStats = useServerFn(getAdminStats);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminStats>> | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((e) => toast.error(e?.message ?? "Failed to load stats"))
      .finally(() => setLoading(false));
  }, [fetchStats]);

  if (loading || !stats) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard label="Volunteers" value={stats.totalVolunteers} icon={Users} />
      <StatCard label="Questions" value={stats.totalQuestions} icon={FileQuestion} />
      <StatCard label="Completed" value={stats.totalCompleted} icon={CheckCircle2} />
      <StatCard
        label="Avg. Score"
        value={`${stats.averagePercentage}%`}
        icon={TrendingUp}
      />
      <StatCard label="Pass Rate" value={`${stats.passRate}%`} icon={Trophy} />
    </div>
  );
}

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    toast.error("Nothing to export");
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function VolunteersPanel() {
  const fetchList = useServerFn(listVolunteers);
  const reset = useServerFn(resetVolunteerAttempt);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listVolunteers>>>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = () => {
    setLoading(true);
    fetchList()
      .then(setRows)
      .catch((e) => toast.error(e?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  };
  useEffect(load, [fetchList]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.full_name?.toLowerCase().includes(s) ||
        r.registration_number?.toLowerCase().includes(s) ||
        r.email?.toLowerCase().includes(s) ||
        r.phone?.toLowerCase().includes(s)
    );
  }, [rows, q]);

  const onReset = async (id: string) => {
    if (!confirm("Reset this volunteer's attempt? They'll be able to retake the exam."))
      return;
    try {
      await reset({ data: { id } });
      toast.success("Attempt reset");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name, reg no, email, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadCSV("volunteers.csv", filtered)}>
            <Download className="size-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reg No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>%</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    {r.registration_number}
                  </TableCell>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell>{r.phone}</TableCell>
                  <TableCell>
                    {r.score ?? "—"}
                    {r.total_questions ? ` / ${r.total_questions}` : ""}
                  </TableCell>
                  <TableCell>{r.percentage != null ? `${r.percentage}%` : "—"}</TableCell>
                  <TableCell>
                    {r.exam_completed ? (
                      Number(r.percentage) >= 50 ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">
                          Passed
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Failed</Badge>
                      )
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.exam_completed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReset(r.id)}
                        title="Reset attempt"
                      >
                        <RotateCcw className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No volunteers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function LeaderboardPanel() {
  const fetchLb = useServerFn(getLeaderboard);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof getLeaderboard>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLb()
      .then(setRows)
      .catch((e) => toast.error(e?.message ?? "Failed"))
      .finally(() => setLoading(false));
  }, [fetchLb]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => downloadCSV("leaderboard.csv", rows)}>
          <Download className="size-4 mr-2" /> Export CSV
        </Button>
      </div>
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Reg No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>%</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {i === 0 ? (
                      <Trophy className="size-4 text-yellow-500" />
                    ) : (
                      <span className="font-bold">#{i + 1}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.registration_number}
                  </TableCell>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell>
                    {r.score} / {r.total_questions}
                  </TableCell>
                  <TableCell className="font-semibold">{r.percentage}%</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {r.completed_at ? new Date(r.completed_at).toLocaleString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No completed exams yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

const EMPTY_Q: Question = {
  id: "",
  module: MODULES[0],
  question: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "A",
};

function QuestionsPanel() {
  const fetchQs = useServerFn(listQuestions);
  const upsert = useServerFn(upsertQuestion);
  const remove = useServerFn(deleteQuestion);
  const [rows, setRows] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Question>(EMPTY_Q);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchQs()
      .then((d) => setRows(d as Question[]))
      .catch((e) => toast.error(e?.message ?? "Failed"))
      .finally(() => setLoading(false));
  };
  useEffect(load, [fetchQs]);

  const openNew = () => {
    setEditing(EMPTY_Q);
    setOpen(true);
  };
  const openEdit = (q: Question) => {
    setEditing(q);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...editing };
      if (!payload.id) delete (payload as any).id;
      await upsert({ data: payload });
      toast.success(editing.id ? "Question updated" : "Question added");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    try {
      await remove({ data: { id } });
      toast.success("Deleted");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} questions total</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="size-4 mr-2" /> New question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit question" : "New question"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Module</Label>
                <Select
                  value={editing.module}
                  onValueChange={(v) => setEditing({ ...editing, module: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Question</Label>
                <Textarea
                  rows={3}
                  value={editing.question}
                  onChange={(e) => setEditing({ ...editing, question: e.target.value })}
                />
              </div>
              {(["a", "b", "c", "d"] as const).map((k) => (
                <div className="space-y-2" key={k}>
                  <Label>Option {k.toUpperCase()}</Label>
                  <Input
                    value={(editing as any)[`option_${k}`]}
                    onChange={(e) =>
                      setEditing({ ...editing, [`option_${k}`]: e.target.value } as Question)
                    }
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label>Correct answer</Label>
                <Select
                  value={editing.correct_answer}
                  onValueChange={(v) => setEditing({ ...editing, correct_answer: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["A", "B", "C", "D"].map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Question</TableHead>
                <TableHead className="w-20">Answer</TableHead>
                <TableHead className="text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {q.module}
                  </TableCell>
                  <TableCell className="max-w-xl">
                    <p className="line-clamp-2">{q.question}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{q.correct_answer}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(q)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(q.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
