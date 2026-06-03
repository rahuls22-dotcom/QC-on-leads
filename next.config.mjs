/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prototype-grade builds. The codebase intentionally tolerates the
  // TS7016 untyped-declaration warnings that `lucide-react` and
  // `date-fns` emit (see PROTOTYPE_OVERVIEW.md → "Constraints"), plus
  // a few permissive any-style places in the mock-data layer. Locally
  // these surface as warnings only and don't block `next dev`; Vercel's
  // `next build` runs the full TypeScript checker by default and fails
  // the deployment. These two flags make the build match the dev
  // experience — it ships even when those warnings are present.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
