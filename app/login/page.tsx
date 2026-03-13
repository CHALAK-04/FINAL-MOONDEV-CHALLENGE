"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function LoginPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const role = user.user_metadata?.role;

        if (role === "developer") {
          router.replace("/submit");
          return;
        }

        if (role === "evaluator") {
          router.replace("/evaluate");
          return;
        }
      }

      setCheckingSession(false);
    };

    checkSession();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const userRole = data.user.user_metadata?.role;

    if (userRole === "developer") {
      toast.success("Logged in as developer");
      router.push("/submit");
    } else if (userRole === "evaluator") {
      toast.success("Logged in as evaluator");
      router.push("/evaluate");
    } else {
      setError("This account has no valid role.");
      toast.error("This account has no valid role.");
      await supabase.auth.signOut();
    }

    router.refresh();
    setLoading(false);
  };

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2ff_45%,_#e2e8f0_100%)] px-4">
        <div className="rounded-3xl border border-white/60 bg-white/80 px-8 py-6 shadow-xl backdrop-blur">
          <p className="text-slate-600">Checking session...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2ff_45%,_#e2e8f0_100%)] px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/60 bg-white/80 shadow-2xl backdrop-blur lg:grid-cols-2">
        <div className="hidden bg-[linear-gradient(135deg,_#0f172a_0%,_#312e81_50%,_#4f46e5_100%)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              MoonDev
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-tight">
              Internship Challenge Portal
            </h1>
            <p className="mt-4 max-w-md text-white/80">
              A clean submission and evaluation experience built with Next.js
              and Supabase.
            </p>
          </div>

          <div className="space-y-3 text-sm text-white/75">
            <p>• Developers submit profile details and project ZIPs</p>
            <p>• Evaluators review, accept, reject, and send decisions</p>
            <p>• Realtime updates keep both sides synced</p>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-6">
            <div>
              <p className="mb-2 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
                Secure Login
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Welcome back
              </h2>
              <p className="mt-2 text-slate-600">
                Use the provided developer or evaluator credentials.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Log in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}