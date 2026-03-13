import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2ff_45%,_#e2e8f0_100%)] px-4">
      <div className="w-full max-w-3xl rounded-[32px] border border-white/60 bg-white/80 p-8 text-center shadow-2xl backdrop-blur sm:p-12">
        <p className="mx-auto mb-4 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
          MoonDev Internship Challenge
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Submission & Evaluation Portal
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
          A polished internship workflow where developers submit their task and
          evaluators review, decide, and send feedback in real time.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            Go to Login
          </Link>

          <span className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-slate-600">
            Built with Next.js + Supabase
          </span>
        </div>
      </div>
    </main>
  );
}