/**
 * Revspot R brand mark — used as the "All workspaces" indicator in the
 * workspace switcher, and reserved for any other org-level surface.
 *
 * The mark scales gracefully via the `size` prop. Defaults to 30px to
 * match the sidebar size it previously occupied.
 */
export function RevspotLogo({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="30" height="30" rx="6" fill="#1A1A1A" />
      <defs>
        <linearGradient
          id="revspot-r-gradient"
          x1="9"
          y1="6"
          x2="21"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#E0E0E0" />
          <stop offset="40%" stopColor="#B0B0B0" />
          <stop offset="100%" stopColor="#808080" />
        </linearGradient>
      </defs>
      <path
        d="M10 22V8h5.5c1.2 0 2.2.35 2.95 1.05.75.7 1.05 1.6 1.05 2.7 0 .85-.2 1.55-.6 2.15-.4.55-.95.95-1.65 1.2L20.5 22h-2.8l-3-6.2h-2.2V22H10zm2.5-8.5h3c.6 0 1.05-.2 1.4-.5.35-.35.5-.8.5-1.3 0-.5-.15-.95-.5-1.25-.35-.35-.8-.5-1.4-.5h-3v3.55z"
        fill="url(#revspot-r-gradient)"
      />
    </svg>
  );
}
