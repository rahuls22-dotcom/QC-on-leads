import { ReactNode } from "react";
import { SpotMark } from "@/components/spot/spot-mark";
import { RichText } from "@/components/spot/rich-text";

export function SpotCallout({
  label = "Spot's read",
  body,
  width,
  actions,
}: {
  label?: string;
  body: string;
  width?: number;
  actions?: ReactNode;
}) {
  return (
    <div
      className="spot-reply"
      style={{
        padding: 14,
        width,
        flexShrink: width ? 0 : undefined,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <SpotMark size={14} />
        <span className="uplabel">{label}</span>
      </div>
      <div className="text-[12.5px] leading-[1.5]">
        <RichText text={body} />
      </div>
      {actions && <div className="flex gap-1.5 mt-2.5">{actions}</div>}
    </div>
  );
}

export function SpotInlineCallout({
  label = "Spot's read",
  body,
  actions,
}: {
  label?: string;
  body: string;
  actions?: ReactNode;
}) {
  return (
    <div className="spot-reply p-3.5 flex gap-3 items-start">
      <SpotMark size={18} />
      <div className="flex-1">
        <div className="uplabel mb-0.5">{label}</div>
        <div className="text-[13.5px] leading-[1.5]">
          <RichText text={body} />
        </div>
        {actions && <div className="flex flex-wrap gap-1.5 mt-2">{actions}</div>}
      </div>
    </div>
  );
}
