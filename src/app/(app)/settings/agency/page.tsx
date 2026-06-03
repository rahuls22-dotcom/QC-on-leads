import Link from "next/link";

export default function AgencySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[16px] font-semibold text-text-primary">Agency</h2>
        <p className="text-[12.5px] text-text-secondary mt-0.5">
          Agency-wide setup, client workspaces, and roles.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/agency-setup"
          className="bg-white border border-border rounded-[8px] px-4 py-4 hover:border-text-primary transition-colors"
        >
          <div className="text-[13.5px] font-semibold text-text-primary">Agency setup</div>
          <div className="text-[12px] text-text-secondary mt-1">
            Configure the agency profile, default sequences, and branding.
          </div>
        </Link>
        <Link
          href="/agency/clients"
          className="bg-white border border-border rounded-[8px] px-4 py-4 hover:border-text-primary transition-colors"
        >
          <div className="text-[13.5px] font-semibold text-text-primary">Client workspaces</div>
          <div className="text-[12px] text-text-secondary mt-1">
            View and manage isolated client sub-accounts.
          </div>
        </Link>
      </div>
    </div>
  );
}
