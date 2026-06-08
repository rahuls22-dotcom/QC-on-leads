"use client";

/**
 * Utilization settings — what the org has actually consumed.
 *
 * This page owns the utilization story:
 *   - Balance + recharge (prepaid orgs only — what's still available to consume)
 *   - Usage section: per-product unit counts (phones extracted, lookups
 *     run, minutes talked)
 *   - Utilization over time: per-product spend trend charts
 *
 * The Billing settings page (sibling route) owns the money story —
 * spend hero, products spend table, invoices, billing-mode toggle.
 *
 * Renamed from "Wallet" because the page is about *what was used*,
 * not just *what's available*. Internally we still mount the shared
 * wallet-page component with view="utilization" so the data hooks
 * don't fork.
 */

import WalletSettingsPage from "../wallet/page";

export default function UtilizationSettingsPage() {
  return <WalletSettingsPage view="utilization" />;
}
