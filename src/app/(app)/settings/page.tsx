import { redirect } from "next/navigation";

// Settings index lands on Usage — that's the screen most operators
// open Settings to check (spend / consumption this cycle). Profile
// stays available from the nav but isn't the default anymore.
export default function SettingsIndex() {
  redirect("/settings/utilization");
}
