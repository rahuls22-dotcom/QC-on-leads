import { redirect } from "next/navigation";

// Integrations moved under Settings. Keep the old path working.
export default function IntegrationsRedirect() {
  redirect("/settings/integrations");
}
