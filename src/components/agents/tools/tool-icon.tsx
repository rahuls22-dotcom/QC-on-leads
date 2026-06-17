"use client";

import {
  Calculator,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquareQuote,
  PhoneForwarded,
  PhoneOff,
  Plug,
  Voicemail,
  Wrench,
} from "lucide-react";

const ICONS: Record<string, typeof Wrench> = {
  end_call: PhoneOff,
  voicemail: Voicemail,
  transfer: PhoneForwarded,
  language: Languages,
  whatsapp: MessageCircle,
  budget: Calculator,
  location: MapPin,
  email: Mail,
  webhook: Plug,
  response: MessageSquareQuote,
};

/** Resolve a tool's icon key to a lucide component. */
export function ToolIcon({
  icon,
  size = 15,
  className,
}: {
  icon: string;
  size?: number;
  className?: string;
}) {
  const Cmp = ICONS[icon] ?? Wrench;
  return <Cmp size={size} strokeWidth={1.5} className={className} />;
}
