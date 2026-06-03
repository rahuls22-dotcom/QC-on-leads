"use client";

import { useState, useMemo } from "react";
import { ArrowRight, ArrowLeft, Check, Plug, Loader2, ChevronDown } from "lucide-react";

interface ImportableCampaign {
  id: string;
  name: string;
  status: string;
  spend: string;
  leads: number;
}

interface AdAccount {
  id: string;
  name: string;
  accountId: string;
}

interface BusinessManager {
  id: string;
  name: string;
  adAccounts: AdAccount[];
}

const MOCK_BUSINESS_MANAGERS: BusinessManager[] = [
  {
    id: "bm-1",
    name: "Godrej Properties",
    adAccounts: [
      { id: "aa-1", name: "Godrej Properties — Primary", accountId: "Act: 1029384756" },
      { id: "aa-2", name: "Godrej Properties — NRI", accountId: "Act: 8374652910" },
    ],
  },
  {
    id: "bm-2",
    name: "Godrej Residential",
    adAccounts: [
      { id: "aa-3", name: "Godrej Residential — South", accountId: "Act: 5738291046" },
    ],
  },
];

const MOCK_CAMPAIGNS_BY_ACCOUNT: Record<string, ImportableCampaign[]> = {
  "aa-1": [
    { id: "imp-1", name: "Godrej Air — Lead Gen (Whitefield)", status: "Active", spend: "₹1.9L", leads: 214 },
    { id: "imp-2", name: "Godrej Air — Retargeting", status: "Active", spend: "₹85K", leads: 98 },
    { id: "imp-3", name: "Godrej Reflections — NRI", status: "Paused", spend: "₹1.4L", leads: 156 },
    { id: "imp-4", name: "Godrej Habitat — Brand Awareness", status: "Active", spend: "₹48K", leads: 64 },
    { id: "imp-5", name: "Godrej Eternity — Lead Gen", status: "Completed", spend: "₹2.1L", leads: 312 },
  ],
  "aa-2": [
    { id: "imp-6", name: "Godrej Air — NRI Dubai", status: "Active", spend: "₹3.2L", leads: 89 },
    { id: "imp-7", name: "Godrej Reflections — NRI Singapore", status: "Active", spend: "₹2.8L", leads: 72 },
    { id: "imp-8", name: "Godrej Properties — NRI UK", status: "Paused", spend: "₹1.1L", leads: 45 },
  ],
  "aa-3": [
    { id: "imp-9", name: "Godrej Ananda — Lead Gen (Bangalore)", status: "Active", spend: "₹2.4L", leads: 187 },
    { id: "imp-10", name: "Godrej Eternity — South Region", status: "Active", spend: "₹1.6L", leads: 134 },
    { id: "imp-11", name: "Godrej Reserve — Premium Launch", status: "Completed", spend: "₹4.1L", leads: 256 },
    { id: "imp-12", name: "Godrej Woodland — Brand Awareness", status: "Active", spend: "₹72K", leads: 41 },
  ],
};

interface StepAdAccountProps {
  onNext: (data: { accountName: string; importedCampaigns: ImportableCampaign[] }) => void;
  onBack: () => void;
}

export function StepAdAccount({ onNext, onBack }: StepAdAccountProps) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedBMId, setSelectedBMId] = useState<string | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  const selectedBM = useMemo(
    () => MOCK_BUSINESS_MANAGERS.find((bm) => bm.id === selectedBMId) ?? null,
    [selectedBMId]
  );

  // All campaigns from all selected accounts
  const allCampaigns = useMemo(() => {
    if (loadingCampaigns) return [];
    const campaigns: ImportableCampaign[] = [];
    for (const accId of selectedAccountIds) {
      const acctCampaigns = MOCK_CAMPAIGNS_BY_ACCOUNT[accId] ?? [];
      campaigns.push(...acctCampaigns);
    }
    return campaigns;
  }, [selectedAccountIds, loadingCampaigns]);

  const handleConnect = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
    }, 1500);
  };

  const handleBMChange = (bmId: string) => {
    setSelectedAccountIds(new Set());
    setSelectedCampaignIds(new Set());
    if (!bmId) {
      setSelectedBMId(null);
      return;
    }
    setSelectedBMId(bmId);
    setLoadingAccounts(true);
    const delay = 3000 + Math.random() * 2000;
    setTimeout(() => {
      // Auto-select all accounts
      const bm = MOCK_BUSINESS_MANAGERS.find((b) => b.id === bmId);
      if (bm) {
        const allAccIds = new Set(bm.adAccounts.map((a) => a.id));
        setSelectedAccountIds(allAccIds);
        // Load campaigns for all accounts
        setLoadingCampaigns(true);
        const campaignDelay = 3000 + Math.random() * 2000;
        setTimeout(() => {
          const allCampIds = new Set<string>();
          for (const accId of allAccIds) {
            const camps = MOCK_CAMPAIGNS_BY_ACCOUNT[accId] ?? [];
            camps.forEach((c) => allCampIds.add(c.id));
          }
          setSelectedCampaignIds(allCampIds);
          setLoadingCampaigns(false);
        }, campaignDelay);
      }
      setLoadingAccounts(false);
    }, delay);
  };

  const toggleAccount = (accId: string) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(accId)) {
        next.delete(accId);
        // Remove campaigns from this account
        const acctCampaigns = MOCK_CAMPAIGNS_BY_ACCOUNT[accId] ?? [];
        setSelectedCampaignIds((prevCamps) => {
          const nextCamps = new Set(prevCamps);
          acctCampaigns.forEach((c) => nextCamps.delete(c.id));
          return nextCamps;
        });
      } else {
        next.add(accId);
        // Add all campaigns from this account
        const acctCampaigns = MOCK_CAMPAIGNS_BY_ACCOUNT[accId] ?? [];
        setSelectedCampaignIds((prevCamps) => {
          const nextCamps = new Set(prevCamps);
          acctCampaigns.forEach((c) => nextCamps.add(c.id));
          return nextCamps;
        });
      }
      return next;
    });
  };

  const toggleAllAccounts = () => {
    if (!selectedBM) return;
    if (selectedAccountIds.size === selectedBM.adAccounts.length) {
      setSelectedAccountIds(new Set());
      setSelectedCampaignIds(new Set());
    } else {
      const allAccIds = new Set(selectedBM.adAccounts.map((a) => a.id));
      setSelectedAccountIds(allAccIds);
      const allCampIds = new Set<string>();
      for (const accId of allAccIds) {
        const camps = MOCK_CAMPAIGNS_BY_ACCOUNT[accId] ?? [];
        camps.forEach((c) => allCampIds.add(c.id));
      }
      setSelectedCampaignIds(allCampIds);
    }
  };

  const toggleCampaign = (id: string) => {
    setSelectedCampaignIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllCampaigns = () => {
    if (selectedCampaignIds.size === allCampaigns.length) {
      setSelectedCampaignIds(new Set());
    } else {
      setSelectedCampaignIds(new Set(allCampaigns.map((c) => c.id)));
    }
  };

  const selectedCampaigns = allCampaigns.filter((c) => selectedCampaignIds.has(c.id));

  const accountDisplayName = selectedBM
    ? selectedBM.adAccounts
        .filter((a) => selectedAccountIds.has(a.id))
        .map((a) => a.name)
        .join(", ")
    : "";

  return (
    <div className="max-w-[640px] mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-[24px] font-semibold text-text-primary mb-2">
          Connect your ad accounts
        </h2>
        <p className="text-[14px] text-text-secondary">
          Import your existing campaigns so you can manage everything from Revspot.
        </p>
      </div>

      {/* Connection card */}
      <div className="bg-white border border-border rounded-card p-6 mb-5">
        {!connected ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-metric bg-[#1877F2]/10 flex items-center justify-center mx-auto mb-3">
              <Plug size={22} strokeWidth={1.5} className="text-[#1877F2]" />
            </div>
            <h3 className="text-[14px] font-semibold text-text-primary mb-1">
              Meta Ads
            </h3>
            <p className="text-[12px] text-text-secondary mb-4">
              Connect your Facebook / Instagram ad accounts
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-2 h-10 px-6 bg-[#1877F2] text-white text-[13px] font-medium rounded-button hover:bg-[#1565C0] transition-colors duration-150 disabled:opacity-60"
            >
              {connecting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Connecting...
                </>
              ) : (
                <>
                  <Plug size={14} strokeWidth={1.5} /> Connect Meta Ad Account
                </>
              )}
            </button>
          </div>
        ) : (
          <div>
            {/* Connected header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-badge bg-[#1877F2]/10 flex items-center justify-center">
                  <Plug size={15} strokeWidth={1.5} className="text-[#1877F2]" />
                </div>
                <span className="text-[14px] font-semibold text-text-primary">Meta Ads</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#15803D] bg-[#F0FDF4] px-2 py-0.5 rounded-badge">
                <Check size={12} strokeWidth={2.5} /> Connected
              </span>
            </div>

            {/* Business Manager dropdown */}
            <div className="mb-4">
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
                Business Manager
              </label>
              <div className="relative">
                <select
                  value={selectedBMId ?? ""}
                  onChange={(e) => handleBMChange(e.target.value)}
                  disabled={loadingAccounts || loadingCampaigns}
                  className="w-full h-10 pl-3 pr-9 text-[13px] text-text-primary bg-white border border-border rounded-input appearance-none cursor-pointer hover:border-border-hover focus:outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select a Business Manager</option>
                  {MOCK_BUSINESS_MANAGERS.map((bm) => (
                    <option key={bm.id} value={bm.id}>
                      {bm.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
              </div>
            </div>

            {/* Ad Accounts — checkbox list */}
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
                Ad Accounts
              </label>
              {loadingAccounts ? (
                <div className="w-full border border-border rounded-input bg-surface-secondary flex items-center justify-center gap-2 py-4">
                  <Loader2 size={14} className="animate-spin text-text-tertiary" />
                  <span className="text-[12px] text-text-tertiary">Fetching ad accounts…</span>
                </div>
              ) : !selectedBMId ? (
                <div className="w-full h-10 border border-border rounded-input bg-surface-secondary flex items-center justify-center">
                  <span className="text-[12px] text-text-tertiary">Select a Business Manager first</span>
                </div>
              ) : (
                <div className="border border-border rounded-input overflow-hidden">
                  {/* Select all header */}
                  <div className="px-3 py-2 border-b border-border-subtle flex items-center justify-between bg-surface-page">
                    <span className="text-[12px] text-text-secondary">
                      {selectedAccountIds.size} of {selectedBM!.adAccounts.length} selected
                    </span>
                    <button
                      onClick={toggleAllAccounts}
                      className="text-[11px] font-medium text-accent hover:text-accent-hover transition-colors"
                    >
                      {selectedAccountIds.size === selectedBM!.adAccounts.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  {selectedBM!.adAccounts.map((acc) => (
                    <label
                      key={acc.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-page transition-colors cursor-pointer border-b border-border-subtle last:border-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAccountIds.has(acc.id)}
                        onChange={() => toggleAccount(acc.id)}
                        className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="block text-[13px] text-text-primary font-medium truncate">
                          {acc.name}
                        </span>
                        <span className="text-[11px] text-text-tertiary">{acc.accountId}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Campaign loading state */}
      {connected && loadingCampaigns && (
        <div className="bg-white border border-border rounded-card p-6 mb-5">
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <Loader2 size={20} className="animate-spin text-text-tertiary" />
            <span className="text-[13px] text-text-secondary">Fetching campaigns…</span>
          </div>
        </div>
      )}

      {/* Campaign import list */}
      {connected && !loadingCampaigns && allCampaigns.length > 0 && (
        <div className="bg-white border border-border rounded-card overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
            <span className="text-[13px] font-medium text-text-primary">
              {allCampaigns.length} campaigns found
            </span>
            <button
              onClick={toggleAllCampaigns}
              className="text-[12px] font-medium text-accent hover:text-accent-hover transition-colors"
            >
              {selectedCampaignIds.size === allCampaigns.length
                ? "Deselect All"
                : "Select All"}
            </button>
          </div>
          <div>
            {allCampaigns.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-surface-page transition-colors cursor-pointer border-b border-border-subtle last:border-0"
              >
                <input
                  type="checkbox"
                  checked={selectedCampaignIds.has(c.id)}
                  onChange={() => toggleCampaign(c.id)}
                  className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <span className="block text-[13px] text-text-primary font-medium truncate">
                    {c.name}
                  </span>
                  <span className="text-[11px] text-text-tertiary">
                    {c.status} &bull; Spend: {c.spend} &bull; {c.leads} leads
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={15} strokeWidth={2} /> Back
        </button>

        <div className="flex items-center gap-3">
          {!connected && (
            <button
              onClick={() => onNext({ accountName: "", importedCampaigns: [] })}
              className="text-[13px] text-text-tertiary hover:text-text-secondary transition-colors"
            >
              I don&apos;t have campaigns yet &rarr; Skip
            </button>
          )}
          {connected && selectedAccountIds.size === 0 && (
            <button
              onClick={() => onNext({ accountName: "", importedCampaigns: [] })}
              className="text-[13px] text-text-tertiary hover:text-text-secondary transition-colors"
            >
              Skip &rarr;
            </button>
          )}
          {connected && selectedAccountIds.size > 0 && !loadingCampaigns && (
            <button
              onClick={() =>
                onNext({
                  accountName: accountDisplayName,
                  importedCampaigns: selectedCampaigns,
                })
              }
              className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150"
            >
              {selectedCampaignIds.size > 0
                ? `Import ${selectedCampaignIds.size} & Continue`
                : "Skip Import & Continue"}
              <ArrowRight size={15} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
