import { cn } from "@/lib/utils";
import type { Qualification, Temperature } from "@/lib/qc-data";

/* Pastel colour map — matches the production admin screen.
 *
 * Each pill is a soft tint with a 1px tonal border, no leading dot — flat
 * filled rectangle with slightly rounded corners. This is intentionally
 * different from the success/destructive system tokens because the leads
 * view has its own palette tied to qualification values, not semantic
 * "good/bad". */
const qualificationCls: Record<Qualification, string> = {
  "Qualified":         "bg-[hsl(142_60%_94%)] text-[hsl(142_60%_28%)] border-[hsl(142_60%_85%)]",
  "Intent Qualified":  "bg-[hsl(220_10%_95%)] text-[hsl(220_10%_30%)] border-[hsl(220_10%_85%)]",
  "Follow up":         "bg-[hsl(38_85%_92%)] text-[hsl(28_75%_35%)] border-[hsl(38_70%_82%)]",
  "RnR On Voicemail":  "bg-[hsl(45_85%_91%)] text-[hsl(35_70%_32%)] border-[hsl(45_70%_80%)]",
  "Disqualified":      "bg-[hsl(0_75%_95%)] text-[hsl(0_70%_42%)] border-[hsl(0_70%_88%)]",
};

const temperatureCls: Record<Temperature, string> = {
  "Hot":      "bg-[hsl(12_85%_92%)] text-[hsl(12_75%_38%)] border-[hsl(12_70%_82%)]",
  "Warm":     "bg-[hsl(28_85%_92%)] text-[hsl(22_75%_38%)] border-[hsl(28_70%_82%)]",
  "Lukewarm": "bg-[hsl(45_85%_91%)] text-[hsl(35_70%_32%)] border-[hsl(45_70%_80%)]",
  "Cold":     "bg-[hsl(210_50%_94%)] text-[hsl(210_50%_35%)] border-[hsl(210_50%_85%)]",
};

export function QualificationBadge({
  value,
  className,
}: {
  value: Qualification;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border rounded-md px-2 py-[3px] text-[11.5px] font-medium whitespace-nowrap",
        qualificationCls[value],
        className,
      )}
    >
      {value}
    </span>
  );
}

export function TemperatureBadge({
  value,
  className,
}: {
  value: Temperature;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border rounded-md px-2 py-[3px] text-[11.5px] font-medium whitespace-nowrap",
        temperatureCls[value],
        className,
      )}
    >
      {value}
    </span>
  );
}

export function RunningBadge() {
  return (
    <span className="inline-flex items-center gap-1 border rounded-md px-2 py-[3px] text-[11px] font-medium bg-[hsl(142_60%_94%)] text-[hsl(142_60%_28%)] border-[hsl(142_60%_85%)] whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(142_60%_38%)]" />
      Running
    </span>
  );
}
