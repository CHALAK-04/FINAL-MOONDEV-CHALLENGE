"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import LogoutButton from "@/components/logout-button";

type Submission = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  location: string;
  email: string;
  hobbies: string;
  profile_image_url: string | null;
  source_code_url: string | null;
  status: string;
  feedback: string | null;
  created_at: string;
};

export default function EvaluatePage() {
  const [supabase] = useState(() => createClient());

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        const rows = (data || []) as Submission[];
        setSubmissions(rows);

        const initialFeedback: Record<string, string> = {};
        rows.forEach((item) => {
          initialFeedback[item.id] = item.feedback || "";
        });
        setFeedbackMap(initialFeedback);
      }

      setLoading(false);
    };

    fetchSubmissions();
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("evaluator-submissions-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
        },
        (payload) => {
          const eventType = payload.eventType;
          const newRow = payload.new as Submission;
          const oldRow = payload.old as Submission;

          if (eventType === "INSERT" && newRow) {
            setSubmissions((prev) => [newRow, ...prev]);
            setFeedbackMap((prev) => ({
              ...prev,
              [newRow.id]: newRow.feedback || "",
            }));
          }

          if (eventType === "UPDATE" && newRow) {
            setSubmissions((prev) =>
              prev.map((item) => (item.id === newRow.id ? newRow : item))
            );
            setFeedbackMap((prev) => ({
              ...prev,
              [newRow.id]: newRow.feedback || "",
            }));
          }

          if (eventType === "DELETE" && oldRow) {
            setSubmissions((prev) =>
              prev.filter((item) => item.id !== oldRow.id)
            );

            setFeedbackMap((prev) => {
              const copy = { ...prev };
              delete copy[oldRow.id];
              return copy;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleDecision = async (
    submissionId: string,
    status: "accepted" | "rejected"
  ) => {
    setSavingId(submissionId);
    setMessage("");
    setError("");

    try {
      const submission = submissions.find((item) => item.id === submissionId);

      if (!submission) {
        throw new Error("Submission not found.");
      }

      const feedback = feedbackMap[submissionId] || "";

      const { error: updateError } = await supabase
        .from("submissions")
        .update({
          status,
          feedback,
        })
        .eq("id", submissionId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const { data: functionData, error: functionError } =
        await supabase.functions.invoke("send-decision-email", {
          body: {
            email: submission.email,
            full_name: submission.full_name,
            status,
            feedback,
          },
        });

      if (functionError) {
        let detailedMessage = functionError.message;

        try {
          const maybeHttpError = functionError as {
            context?: {
              json?: () => Promise<any>;
              text?: () => Promise<string>;
            };
          };

          if (maybeHttpError.context?.json) {
            const errorBody = await maybeHttpError.context.json();
            detailedMessage =
              errorBody?.details ||
              errorBody?.error ||
              JSON.stringify(errorBody);
          } else if (maybeHttpError.context?.text) {
            detailedMessage = await maybeHttpError.context.text();
          }
        } catch {}

        throw new Error(detailedMessage);
      }

      console.log("Function success:", functionData);
      setMessage("Evaluation updated and email sent successfully.");
      toast.success("Evaluation updated and email sent successfully.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      toast.error(msg);
      console.error("handleDecision error:", err);
    } finally {
      setSavingId(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === "accepted") {
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }

    if (status === "rejected") {
      return "bg-rose-100 text-rose-700 border-rose-200";
    }

    return "bg-amber-100 text-amber-700 border-amber-200";
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const matchesSearch =
        submission.full_name.toLowerCase().includes(search.toLowerCase()) ||
        submission.email.toLowerCase().includes(search.toLowerCase()) ||
        submission.location.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ? true : submission.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [submissions, search, statusFilter]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2ff_45%,_#e2e8f0_100%)] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
                Evaluator Dashboard
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Review internship submissions
              </h1>
              <p className="mt-2 text-slate-600">
                Search applicants, review their work, and send final decisions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">
                  {submissions.length}
                </span>{" "}
                total submissions
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 rounded-3xl border border-white/60 bg-white/80 p-5 shadow-lg backdrop-blur md:grid-cols-[1fr_220px]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Search applicant
            </label>
            <input
              type="text"
              placeholder="Search by name, email, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Filter by status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-white/60 bg-white/80 p-8 text-center shadow-lg backdrop-blur">
            <p className="text-slate-600">Loading submissions...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="rounded-3xl border border-white/60 bg-white/80 p-8 text-center shadow-lg backdrop-blur">
            <p className="text-lg font-semibold text-slate-900">
              No submissions found
            </p>
            <p className="mt-2 text-slate-600">
              Try changing the search or status filter.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-xl backdrop-blur"
              >
                <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                  <div>
                    {submission.profile_image_url ? (
                      <img
                        src={submission.profile_image_url}
                        alt={submission.full_name}
                        className="h-72 w-full rounded-2xl border border-slate-200 object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-72 w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                        No image uploaded
                      </div>
                    )}
                  </div>

                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                          {submission.full_name}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Submitted on{" "}
                          {new Date(submission.created_at).toLocaleString()}
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-semibold ${getStatusBadgeClass(
                          submission.status
                        )}`}
                      >
                        {submission.status}
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Email
                        </p>
                        <p className="mt-1 break-all text-slate-900">
                          {submission.email}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Phone
                        </p>
                        <p className="mt-1 text-slate-900">{submission.phone}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Location
                        </p>
                        <p className="mt-1 text-slate-900">
                          {submission.location}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Source code
                        </p>
                        {submission.source_code_url ? (
                          <a
                            href={submission.source_code_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                          >
                            Download ZIP
                          </a>
                        ) : (
                          <p className="mt-1 text-slate-500">
                            No source zip uploaded
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        What do you like to do in life (other than coding)?
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-slate-900">
                        {submission.hobbies}
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Evaluator Feedback
                      </label>
                      <textarea
                        value={feedbackMap[submission.id] || ""}
                        onChange={(e) =>
                          setFeedbackMap((prev) => ({
                            ...prev,
                            [submission.id]: e.target.value,
                          }))
                        }
                        className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        placeholder="Write clear and professional feedback..."
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleDecision(submission.id, "accepted")}
                        disabled={savingId === submission.id}
                        className="rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingId === submission.id
                          ? "Saving..."
                          : "Welcome to the Team"}
                      </button>

                      <button
                        onClick={() => handleDecision(submission.id, "rejected")}
                        disabled={savingId === submission.id}
                        className="rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingId === submission.id
                          ? "Saving..."
                          : "We Are Sorry"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}