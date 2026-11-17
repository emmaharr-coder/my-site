import { NextResponse } from "next/server";
import { saveLatest, type ProblemType } from "@/lib/reasoning-store";

/**
 * ── Challenge 2, step 4: the brain ────────────────────────────────────────
 * Why this route exists: this is the decision endpoint. The grader POSTs a
 * JSON problem here (one of three types) and your code must answer it,
 * correctly, in under 10 seconds, with no human involved. Everything Lane 2
 * taught your brain, this route teaches your website.
 *
 * The three TODO blocks below map one-to-one onto stations you have already
 * passed. The build guide (course book, end of Lane 2) walks through each
 * one and shows the finished code; the wire contract with example problems
 * lives on the Challenge 2 page.
 *
 * The plumbing (parse, save, respond) is already written. Until you fill in
 * an answer, unanswered problems return 501: honestly unfinished, never
 * faked.
 */
export async function POST(req: Request) {
  const problem = await req.json().catch(() => null);
  if (!problem || typeof problem.type !== "string") {
    return NextResponse.json(
      { error: "expected a JSON problem with a `type` field" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let answer: Record<string, any> | undefined;

  if (problem.type === "syllogism") {
    const forms: Record<string, { verdict: string; fallacy?: string }> = {
      "A": { verdict: "valid" },
      "not-B": { verdict: "valid" },
      "B": { verdict: "invalid", fallacy: "affirming the consequent" },
      "not-A": { verdict: "invalid", fallacy: "denying the antecedent" },
    };
    answer = forms[problem.observation.asserts];
  }

  if (problem.type === "plausibility") {
    const { baseRate, hitRate, falseAlarmRate } = problem;
    // Imagine 10,000 cases, Station 2.3 style. Any number works (it
    // cancels in the division); it is here so the variable names below
    // tell the truth: these are counts of imagined cases.
    const N = 10000;
    const trueFlags = N * baseRate * hitRate; // have the condition, flagged
    const falseFlags = N * (1 - baseRate) * falseAlarmRate; // clean, flagged anyway
    answer = { posterior: trueFlags / (trueFlags + falseFlags) };
  }

  if (problem.type === "bernoulli") {
    const { theta, payoffs, probabilityOf } = problem;
    answer = {
      support: [0, 1],
      expectedValue: theta * payoffs.onSuccess + (1 - theta) * payoffs.onFailure,
      probabilityStatement: probabilityOf === 1 ? theta : 1 - theta,
    };
  }

  if (answer === undefined) {
    // No TODO block claimed this problem yet. 501 keeps the service honest.
    return NextResponse.json({error: "unknown problem type"}, {status: 400});
  }

  // The memory step: overwrite this type's "latest" row so your /reasoning
  // page can display the same problem and answer (see lib/reasoning-store).
  await saveLatest(problem.type as ProblemType, problem, answer);

  return NextResponse.json(answer);
}
