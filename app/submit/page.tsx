"use client";

import { useEffect, useMemo, useState } from "react";
import imageCompression from "browser-image-compression";
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
};

export default function SubmitPage() {
  const [supabase] = useState(() => createClient());

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    location: "",
    email: "",
    hobbies: "",
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [sourceZip, setSourceZip] = useState<File | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isLocked =
    submission?.status === "accepted" || submission?.status === "rejected";

  useEffect(() => {
    const loadSubmission = async () => {
      setPageLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("You must be logged in.");
        setPageLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setError(error.message);
      } else if (data) {
        const typedData = data as Submission;
        setSubmission(typedData);
        setForm({
          full_name: typedData.full_name || "",
          phone: typedData.phone || "",
          location: typedData.location || "",
          email: typedData.email || "",
          hobbies: typedData.hobbies || "",
        });
      }

      setPageLoading(false);
    };

    loadSubmission();
  }, [supabase]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      channel = supabase
        .channel("developer-submission-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "submissions",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newRow = payload.new as Submission;

            if (newRow) {
              setSubmission(newRow);
              setForm({
                full_name: newRow.full_name || "",
                phone: newRow.phone || "",
                location: newRow.location || "",
                email: newRow.email || "",
                hobbies: newRow.hobbies || "",
              });
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (isLocked) return;

    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const file = e.target.files?.[0] || null;
    setProfileImage(file);
  };

  const handleSourceZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const file = e.target.files?.[0] || null;
    setSourceZip(file);
  };

  const profilePreview = useMemo(() => {
    if (profileImage) {
      return URL.createObjectURL(profileImage);
    }

    return submission?.profile_image_url || null;
  }, [profileImage, submission?.profile_image_url]);

  useEffect(() => {
    return () => {
      if (profilePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(profilePreview);
      }
    };
  }, [profilePreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (isLocked) {
        throw new Error(
          "This submission is locked because a final decision has already been made."
        );
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in.");
      }

      if (!submission?.source_code_url && !sourceZip) {
        throw new Error(
          "Source code ZIP is required for your first submission."
        );
      }

      let profileImageUrl = submission?.profile_image_url || null;
      let sourceCodeUrl = submission?.source_code_url || null;

      if (profileImage) {
        const compressedImage = await imageCompression(profileImage, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1080,
          useWebWorker: true,
        });

        const imagePath = `${user.id}/${Date.now()}-${compressedImage.name}`;

        const { error: imageUploadError } = await supabase.storage
          .from("profile-images")
          .upload(imagePath, compressedImage, {
            upsert: true,
          });

        if (imageUploadError) {
          throw new Error(imageUploadError.message);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("profile-images").getPublicUrl(imagePath);

        profileImageUrl = publicUrl;
      }

      if (sourceZip) {
        const zipName = sourceZip.name.toLowerCase();

        if (!zipName.endsWith(".zip")) {
          throw new Error("Source code file must be a .zip file.");
        }

        const zipPath = `${user.id}/${Date.now()}-${sourceZip.name}`;

        const { error: zipUploadError } = await supabase.storage
          .from("source-zips")
          .upload(zipPath, sourceZip, {
            upsert: true,
          });

        if (zipUploadError) {
          throw new Error(zipUploadError.message);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("source-zips").getPublicUrl(zipPath);

        sourceCodeUrl = publicUrl;
      }

      const { error: upsertError } = await supabase.from("submissions").upsert(
        {
          user_id: user.id,
          full_name: form.full_name,
          phone: form.phone,
          location: form.location,
          email: form.email,
          hobbies: form.hobbies,
          profile_image_url: profileImageUrl,
          source_code_url: sourceCodeUrl,
          status: submission?.status || "pending",
          feedback: submission?.feedback || null,
        },
        {
          onConflict: "user_id",
        }
      );

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      setMessage("Submission saved successfully.");
      toast.success("Submission saved successfully.");
      setProfileImage(null);
      setSourceZip(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
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

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2ff_45%,_#e2e8f0_100%)]">
        <div className="rounded-3xl border border-white/60 bg-white/80 px-8 py-6 shadow-xl backdrop-blur">
          <p className="text-slate-600">Loading submission...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2ff_45%,_#e2e8f0_100%)] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
                Developer Portal
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Submit your internship task
              </h1>
              <p className="mt-2 text-slate-600">
                Complete your profile, upload your image, and attach your source
                code ZIP.
              </p>
            </div>

            <LogoutButton />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-xl backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-900">
              Submission Overview
            </h2>

            <div className="mt-5">
              {profilePreview ? (
                <img
                  src={profilePreview}
                  alt="Profile preview"
                  className="h-72 w-full rounded-2xl border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-72 w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                  No profile image yet
                </div>
              )}
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Current status
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getStatusBadgeClass(
                      submission?.status || "pending"
                    )}`}
                  >
                    {submission?.status || "pending"}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Evaluator feedback
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {submission?.feedback || "No feedback yet."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Uploaded ZIP
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {sourceZip?.name ||
                    (submission?.source_code_url
                      ? "Previously uploaded ZIP available"
                      : "No ZIP selected")}
                </p>
              </div>

              {isLocked && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Your submission has been finalized. You can review your data
                  and feedback, but you can no longer edit or reapply.
                </div>
              )}
            </div>
          </aside>

          <section className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block font-medium text-slate-700">
                    Full Name
                  </label>
                  <input
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    disabled={isLocked}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block font-medium text-slate-700">
                    Phone Number
                  </label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    disabled={isLocked}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block font-medium text-slate-700">
                    Location
                  </label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    disabled={isLocked}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    disabled={isLocked}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-700">
                  What do you like to do in life (other than coding)?
                </label>
                <textarea
                  name="hobbies"
                  value={form.hobbies}
                  onChange={handleChange}
                  disabled={isLocked}
                  className="min-h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  required
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="mb-2 block font-medium text-slate-700">
                    Profile Picture
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    disabled={isLocked}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                  {profileImage && (
                    <p className="mt-2 text-sm text-emerald-600">
                      Selected: {profileImage.name}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-slate-500">
                    Image will be compressed to max 1 MB and max 1080px.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="mb-2 block font-medium text-slate-700">
                    Source Code ZIP
                  </label>
                  <input
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed,application/octet-stream"
                    onChange={handleSourceZipChange}
                    disabled={isLocked}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                  {sourceZip && (
                    <p className="mt-2 text-sm text-emerald-600">
                      Selected: {sourceZip.name}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-slate-500">
                    Upload your final project as a ZIP file only.
                  </p>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={loading || isLocked}
                  className="rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLocked
                    ? "Submission Locked"
                    : loading
                    ? "Submitting..."
                    : "Save Submission"}
                </button>

                {submission?.source_code_url && (
                  <a
                    href={submission.source_code_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    View Uploaded ZIP
                  </a>
                )}
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}