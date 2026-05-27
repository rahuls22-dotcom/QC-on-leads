import { redirect } from "next/navigation";

// Spot is the entry point for the product — not the dashboard. The
// dashboard is reachable via the sidebar nav once the user knows what
// they want to inspect.
export default function Home() {
  redirect("/spot");
}
