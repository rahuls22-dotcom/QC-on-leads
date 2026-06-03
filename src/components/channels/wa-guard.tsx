"use client";

import { useWA } from "@/lib/whatsapp-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MessageCircle } from "lucide-react";

export function WAGuard({ children }: { children: React.ReactNode }) {
  const { isConnected } = useWA();
  const router = useRouter();

  useEffect(() => {
    if (!isConnected) router.replace("/channels/whatsapp");
  }, [isConnected, router]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center">
          <MessageCircle size={18} strokeWidth={1.5} className="text-text-tertiary" />
        </div>
        <div className="text-[13px] text-text-tertiary">Redirecting to WhatsApp setup…</div>
      </div>
    );
  }

  return <>{children}</>;
}
