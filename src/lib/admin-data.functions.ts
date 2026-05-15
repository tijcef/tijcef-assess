import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin role required");
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const [vols, qs, completed] = await Promise.all([
      supabaseAdmin.from("volunteers").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("questions").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("volunteers")
        .select("score, percentage", { count: "exact" })
        .eq("exam_completed", true),
    ]);

    const completedRows = completed.data ?? [];
    const avg =
      completedRows.length > 0
        ? completedRows.reduce((s, r) => s + (Number(r.percentage) || 0), 0) /
          completedRows.length
        : 0;
    const passed = completedRows.filter((r) => (Number(r.percentage) || 0) >= 50).length;

    return {
      totalVolunteers: vols.count ?? 0,
      totalQuestions: qs.count ?? 0,
      totalCompleted: completed.count ?? 0,
      averagePercentage: Math.round(avg * 10) / 10,
      passRate:
        completedRows.length > 0
          ? Math.round((passed / completedRows.length) * 1000) / 10
          : 0,
    };
  });

export const listVolunteers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("volunteers")
      .select(
        "id, registration_number, full_name, email, phone, score, total_questions, percentage, exam_completed, completed_at, created_at"
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("volunteers")
      .select(
        "id, registration_number, full_name, score, total_questions, percentage, completed_at"
      )
      .eq("exam_completed", true)
      .order("percentage", { ascending: false })
      .order("completed_at", { ascending: true })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  });

export const listQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("questions")
      .select("*")
      .order("module", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

const questionSchema = z.object({
  id: z.string().uuid().optional(),
  module: z.string().min(1).max(100),
  question: z.string().min(3).max(2000),
  option_a: z.string().min(1).max(500),
  option_b: z.string().min(1).max(500),
  option_c: z.string().min(1).max(500),
  option_d: z.string().min(1).max(500),
  correct_answer: z.enum(["A", "B", "C", "D"]),
});

export const upsertQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => questionSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("questions")
        .update({
          module: data.module,
          question: data.question,
          option_a: data.option_a,
          option_b: data.option_b,
          option_c: data.option_c,
          option_d: data.option_d,
          correct_answer: data.correct_answer,
        })
        .eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("questions")
      .insert({
        module: data.module,
        question: data.question,
        option_a: data.option_a,
        option_b: data.option_b,
        option_c: data.option_c,
        option_d: data.option_d,
        correct_answer: data.correct_answer,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

export const deleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("questions").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const resetVolunteerAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("volunteers")
      .update({
        exam_completed: false,
        score: null,
        percentage: null,
        completed_at: null,
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
