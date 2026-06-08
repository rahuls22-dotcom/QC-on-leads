"use client";

/**
 * Billing settings — owns the money story for the org: billing-mode
 * toggle (prepaid/postpaid), usage in real units, spend hero,
 * products table, utilization-over-time charts, invoices.
 *
 * The wallet page at /settings/wallet handles the balance + recharge
 * story (prepaid orgs only). Both routes share the same component
 * implementation but render different sections via the `view` prop,
 * so the page identity stays distinct even though the data layer
 * is shared.
 */

import WalletSettingsPage from "../wallet/page";

export default function BillingSettingsPage() {
  return <WalletSettingsPage view="billing" />;
}
