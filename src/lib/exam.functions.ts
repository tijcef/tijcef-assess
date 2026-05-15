import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TOTAL_QUESTIONS = 50;
const PASS_MARK = 50;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const registerVolunteer = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        full_name: z.string().trim().min(2).max(120),
        phone: z.string().trim().min(7).max(20),
        email: z.string().trim().email().max(255).optional().or(z.literal("")),
        fingerprint: z.string().trim().min(4).max(128),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const ip = (() => {
      try {
        return getRequestIP({ xForwardedFor: true }) ?? null;
      } catch {
        return null;
      }
    })();

    // Block duplicates by phone or fingerprint
    const { data: existing } = await supabaseAdmin
      .from("volunteers")
      .select("id, registration_number, exam_completed, full_name")
      .or(`phone.eq.${data.phone},fingerprint.eq.${data.fingerprint}`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (existing.exam_completed) {
        return { alreadyCompleted: true as const, registration_number: existing.registration_number };
      }
      return {
        alreadyCompleted: false as const,
        id: existing.id,
        registration_number: existing.registration_number,
        full_name: existing.full_name,
      };
    }

    const { data: regData, error: regErr } = await supabaseAdmin.rpc("next_registration_number");
    if (regErr || !regData) throw new Error("Could not generate registration number");

    const { data: inserted, error } = await supabaseAdmin
      .from("volunteers")
      .insert({
        full_name: data.full_name,
        phone: data.phone,
        email: data.email || null,
        registration_number: regData as string,
        fingerprint: data.fingerprint,
        ip_address: ip,
      })
      .select("id, registration_number, full_name")
      .single();

    if (error || !inserted) throw new Error(error?.message ?? "Registration failed");

    return {
      alreadyCompleted: false as const,
      id: inserted.id,
      registration_number: inserted.registration_number,
      full_name: inserted.full_name,
    };
  });

export const startExam = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ volunteer_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: vol } = await supabaseAdmin
      .from("volunteers")
      .select("id, full_name, registration_number, exam_completed")
      .eq("id", data.volunteer_id)
      .maybeSingle();

    if (!vol) throw new Error("Volunteer not found");
    if (vol.exam_completed) {
      return { alreadyCompleted: true as const };
    }

    const { data: questions } = await supabaseAdmin
      .from("questions")
      .select("id, module, question, option_a, option_b, option_c, option_d");

    if (!questions || questions.length === 0) throw new Error("No questions available");

    const picked = shuffle(questions).slice(0, Math.min(TOTAL_QUESTIONS, questions.length));

    // Per-question shuffle of options; map shuffled letter -> original letter is server-side only
    const safeQuestions = picked.map((q) => {
      const opts = shuffle([
        { letter: "A" as const, text: q.option_a },
        { letter: "B" as const, text: q.option_b },
        { letter: "C" as const, text: q.option_c },
        { letter: "D" as const, text: q.option_d },
      ]);
      return {
        id: q.id,
        module: q.module,
        question: q.question,
        // Display letters reassigned A..D in shuffled order
        options: opts.map((o, i) => ({
          display: ["A", "B", "C", "D"][i],
          original: o.letter,
          text: o.text,
        })),
      };
    });

    return {
      alreadyCompleted: false as const,
      volunteer: {
        id: vol.id,
        full_name: vol.full_name,
        registration_number: vol.registration_number,
      },
      questions: safeQuestions,
      total: safeQuestions.length,
      seconds_per_question: 30,
      pass_mark: PASS_MARK,
    };
  });

export const submitExam = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        volunteer_id: z.string().uuid(),
        // Map of question_id -> chosen ORIGINAL letter (A/B/C/D) sent by client.
        // We mapped display->original in startExam; client sends the original letter back.
        answers: z.record(
          z.string().uuid(),
          z.enum(["A", "B", "C", "D"]).nullable(),
        ),
        total: z.number().int().min(1).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: vol } = await supabaseAdmin
      .from("volunteers")
      .select("id, full_name, registration_number, exam_completed")
      .eq("id", data.volunteer_id)
      .maybeSingle();

    if (!vol) throw new Error("Volunteer not found");
    if (vol.exam_completed) {
      const { data: done } = await supabaseAdmin
        .from("volunteers")
        .select("score, total_questions, percentage")
        .eq("id", vol.id)
        .single();
      return {
        alreadyCompleted: true as const,
        full_name: vol.full_name,
        registration_number: vol.registration_number,
        score: done?.score ?? 0,
        total: done?.total_questions ?? data.total,
        percentage: Number(done?.percentage ?? 0),
        passed: Number(done?.percentage ?? 0) >= PASS_MARK,
      };
    }

    const ids = Object.keys(data.answers);
    const { data: questions } = await supabaseAdmin
      .from("questions")
      .select("id, correct_answer")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

    const correctMap = new Map((questions ?? []).map((q) => [q.id, q.correct_answer]));
    let score = 0;
    for (const [qid, ans] of Object.entries(data.answers)) {
      if (ans && correctMap.get(qid) === ans) score++;
    }

    const total = data.total;
    const percentage = Math.round((score / total) * 10000) / 100;

    await supabaseAdmin
      .from("volunteers")
      .update({
        exam_completed: true,
        score,
        total_questions: total,
        percentage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", vol.id)
      .eq("exam_completed", false);

    return {
      alreadyCompleted: false as const,
      full_name: vol.full_name,
      registration_number: vol.registration_number,
      score,
      total,
      percentage,
      passed: percentage >= PASS_MARK,
    };
  });

export const getResult = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ volunteer_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: vol } = await supabaseAdmin
      .from("volunteers")
      .select("full_name, registration_number, score, total_questions, percentage, exam_completed")
      .eq("id", data.volunteer_id)
      .maybeSingle();
    if (!vol || !vol.exam_completed) return null;
    return {
      full_name: vol.full_name,
      registration_number: vol.registration_number,
      score: vol.score ?? 0,
      total: vol.total_questions ?? 0,
      percentage: Number(vol.percentage ?? 0),
      passed: Number(vol.percentage ?? 0) >= PASS_MARK,
    };
  });
