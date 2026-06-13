"use client";

/**
 * Settings → Profile
 *
 * Shows who you're logged in as, with Log out as the action on the
 * right. We used to render a card with "Log out" as a heading AND a
 * button — same word twice, no information added. Replacing the
 * heading with the actual user identity makes the card carry its
 * weight instead of duplicating its CTA.
 */

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { LogOut } from "lucide-react";
import { useCurrentUser } from "@/lib/workspace-store";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

export default function ProfileSettingsPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  const handleLogout = () => {
    if (typeof window === "undefined") return;
    const confirmed = window.confirm("Log out of Revspot?");
    if (!confirmed) return;
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith("revspot:"))
        .forEach((k) => window.localStorage.removeItem(k));
    } catch { /* ignore */ }
    router.push("/login");
  };

  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp} className="max-w-[680px]">
      <div className="mb-5">
        <h2 className="text-[16px] font-semibold text-text-primary">Profile</h2>
      </div>

      <div className="bg-white border border-border rounded-card p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center flex-shrink-0">
              <span className="text-[13px] font-medium text-text-secondary">{initials}</span>
            </div>
            <div className="min-w-0">
              <div className="text-[13px] text-text-primary truncate">{user.name}</div>
              <div className="text-[12px] text-text-tertiary truncate">{user.email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="h-9 px-4 inline-flex items-center gap-1.5 border border-[#DC2626]/30 text-[#DC2626] text-[12px] font-medium rounded-button hover:bg-[#FEF2F2] hover:border-[#DC2626]/50 transition-colors duration-150"
          >
            <LogOut size={13} strokeWidth={1.75} />
            Log out
          </button>
        </div>
      </div>
    </motion.div>
  );
}
