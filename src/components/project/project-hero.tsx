import { Clock, MoreHorizontal } from "lucide-react";
import { ProjectDetail } from "@/lib/project-data";
import { SpotMark } from "@/components/spot/spot-mark";
import { HealthPill } from "./shared/pace-pill";

function HeroFact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="uplabel" style={{ fontSize: 9.5 }}>
        {label}
      </div>
      <div
        className={mono ? "mono" : ""}
        style={{ fontSize: 12.5, fontWeight: 500, marginTop: 2 }}
      >
        {value}
      </div>
    </div>
  );
}

export function ProjectHero({
  project,
  onAsk,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
}) {
  return (
    <div
      className="card-base relative overflow-hidden"
      style={{ padding: 22, marginBottom: 16 }}
    >
      {/* Decorative spot-tint glow top-right */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -60,
          top: -60,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at center, rgba(232,224,200,0.35) 0%, rgba(255,255,255,0) 70%)",
          pointerEvents: "none",
        }}
      />
      <div className="relative flex items-start gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <HealthPill health={project.health} />
            <span className="pill" style={{ background: "var(--info-bg)", color: "var(--info-fg)" }}>
              {project.category}
            </span>
            <span className="pill">
              <Clock size={11} /> Updated {project.brief.updated}
            </span>
          </div>
          <h1
            className="tracking-[-0.01em]"
            style={{ fontSize: 26, fontWeight: 600, margin: 0 }}
          >
            {project.name}
          </h1>
          <div className="text-[13px] text-text-secondary mt-1">{project.micromarket}</div>

          {/* 8-cell facts grid */}
          <div
            className="grid mt-4"
            style={{
              gridTemplateColumns: "repeat(4, minmax(0,1fr))",
              rowGap: 14,
              columnGap: 18,
            }}
          >
            <HeroFact label="RERA" value={project.rera.split("/").slice(-2).join("/")} mono />
            <HeroFact label="Typology" value={project.typology} />
            <HeroFact label="Price band" value={project.priceBand} />
            <HeroFact label="Possession" value={project.possession} />
            <HeroFact label="Size band" value={project.sizeBand} />
            <HeroFact label="Inventory" value={project.inventory} />
            <HeroFact label="Builder" value={project.builder} />
            <HeroFact label="Launched" value={project.launchedOn} />
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => onAsk(`Give me a 60-second read on ${project.name}`)}
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button bg-accent text-white hover:bg-accent-hover text-[12.5px] font-medium transition-colors"
          >
            <SpotMark size={13} />
            Ask about this project
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center h-8 w-8 rounded-button border border-border bg-white hover:border-border-hover hover:bg-surface-page transition-colors"
            aria-label="More project actions"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
