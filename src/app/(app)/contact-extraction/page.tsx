import { redirect } from "next/navigation";

// The Contact-extraction module has no standalone landing page. Clicking the
// parent nav item opens Extract (the primary action) by default, mirroring how
// Enrichment lands on its main tab.
export default function ContactExtractionPage() {
  redirect("/contact-extraction/operations");
}
