"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Logged out");
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="rounded-2xl bg-slate-900 px-4 py-2.5 font-medium text-white transition hover:bg-slate-800"
    >
      Log out
    </button>
  );
}