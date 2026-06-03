import Link from "next/link";

export default function WorkspaceSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[16px] font-semibold text-text-primary">Workspace</h2>
        <p className="text-[12.5px] text-text-secondary mt-0.5">
          Workspace-level preferences and brand.
        </p>
      </div>
      <Link
        href="/brand"
        className="block bg-white border border-border rounded-[8px] px-4 py-4 hover:border-text-primary transition-colors max-w-md"
      >
        <div className="text-[13.5px] font-semibold text-text-primary">Brand</div>
        <div className="text-[12px] text-text-secondary mt-1">
          Logo, voice, and visual identity used across creatives and outreach.
        </div>
      </Link>
    </div>
  );
}
