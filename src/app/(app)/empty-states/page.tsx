"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { EmptyState } from "@/components/layout/empty-state";
import {
  IllustrationCampaigns,
  IllustrationSearchEmpty,
  IllustrationAgents,
  IllustrationProjects,
  IllustrationLeads,
  IllustrationContacts,
  IllustrationCreatives,
  IllustrationAudiences,
  IllustrationOutreach,
  IllustrationSequences,
  IllustrationChart,
  IllustrationPhone,
} from "@/components/illustrations/empty-states";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

interface PreviewCardProps {
  label: string;
  tag: string;
  children: React.ReactNode;
}

function PreviewCard({ label, tag, children }: PreviewCardProps) {
  return (
    <motion.div variants={fadeUp} className="bg-white border border-border rounded-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
        <span className="text-[13px] font-semibold text-text-primary">{label}</span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-badge bg-surface-secondary text-text-tertiary uppercase tracking-[0.4px]">
          {tag}
        </span>
      </div>
      <div className="bg-surface-page/50">{children}</div>
    </motion.div>
  );
}

export default function EmptyStatesPage() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="mb-8">
        <div className="text-meta text-text-secondary mb-1">Design System</div>
        <h1 className="text-page-title text-text-primary">Empty States</h1>
        <p className="text-[13px] text-text-secondary mt-2 max-w-lg">
          Every empty state across the app — shown when lists are empty, filters return zero results, or features haven&apos;t been set up yet.
        </p>
      </motion.div>

      {/* ── HIGH PRIORITY: Main List Pages ─────────────────── */}
      <motion.div variants={fadeUp} className="mb-6">
        <h2 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.6px] mb-3">
          Primary — Empty List Pages
        </h2>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        <PreviewCard label="Campaigns" tag="No data">
          <EmptyState
            illustration={<IllustrationCampaigns />}
            title="No campaigns yet"
            description="Create your first campaign or import existing ones from Meta Ads."
            action={
              <div className="flex items-center gap-2">
                <button className="h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
                  Create campaign
                </button>
                <button className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                  Import Campaigns
                </button>
              </div>
            }
          />
        </PreviewCard>

        <PreviewCard label="Agents" tag="No data">
          <EmptyState
            illustration={<IllustrationAgents />}
            title="No agents created"
            description="Create a voice or WhatsApp agent to start qualifying your leads automatically."
            action={
              <button className="h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
                Create Agent
              </button>
            }
          />
        </PreviewCard>

        <PreviewCard label="Projects" tag="No data">
          <EmptyState
            illustration={<IllustrationProjects />}
            title="No projects yet"
            description="Group your campaigns into projects for better organization and reporting."
            action={
              <button className="h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
                Create project
              </button>
            }
          />
        </PreviewCard>

        <PreviewCard label="Leads (Enquiries)" tag="No data">
          <EmptyState
            illustration={<IllustrationLeads />}
            title="No leads yet"
            description="Leads from all your campaigns will appear here once they start coming in."
          />
        </PreviewCard>

        <PreviewCard label="Contacts" tag="No data">
          <EmptyState
            illustration={<IllustrationContacts />}
            title="No contacts yet"
            description="Import contacts from a CSV or let them flow in from your campaigns."
            action={
              <button className="h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
                Import Contacts
              </button>
            }
          />
        </PreviewCard>

        <PreviewCard label="Creatives" tag="No data">
          <EmptyState
            illustration={<IllustrationCreatives />}
            title="No creatives uploaded"
            description="Upload images, videos, or carousels to use in your campaigns."
            action={
              <button className="h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
                Upload creative
              </button>
            }
          />
        </PreviewCard>

        <PreviewCard label="Audiences" tag="No data">
          <EmptyState
            illustration={<IllustrationAudiences />}
            title="No audiences created"
            description="Build targeted audiences from your database, CRM, or CSV uploads."
            action={
              <button className="h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
                Create Audience
              </button>
            }
          />
        </PreviewCard>

        <PreviewCard label="Outreach" tag="No data">
          <EmptyState
            illustration={<IllustrationOutreach />}
            title="No outreach campaigns"
            description="Create an outreach campaign to call your contact lists with voice agents."
            action={
              <button className="h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
                New outreach
              </button>
            }
          />
        </PreviewCard>

        <PreviewCard label="Sequences" tag="No data">
          <EmptyState
            illustration={<IllustrationSequences />}
            title="No sequences created"
            description="Build automated multi-step sequences to nurture leads across channels."
            action={
              <button className="h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
                Create Sequence
              </button>
            }
          />
        </PreviewCard>
      </div>

      {/* ── MEDIUM: Search / Filter Empty ──────────────────── */}
      <motion.div variants={fadeUp} className="mb-6">
        <h2 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.6px] mb-3">
          Secondary — Search &amp; Filter Empty
        </h2>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        <PreviewCard label="Campaigns — filter empty" tag="Filter">
          <EmptyState
            illustration={<IllustrationSearchEmpty />}
            title="No campaigns match your filters"
            description="Try adjusting your search or clearing filters."
            action={
              <button className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                Clear filters
              </button>
            }
            compact
          />
        </PreviewCard>

        <PreviewCard label="Leads — filter empty" tag="Filter">
          <EmptyState
            illustration={<IllustrationSearchEmpty />}
            title="No leads match your filters"
            description="Try adjusting your search, campaign, or qualification filter."
            action={
              <button className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                Clear filters
              </button>
            }
            compact
          />
        </PreviewCard>

        <PreviewCard label="Contacts — search empty" tag="Search">
          <EmptyState
            illustration={<IllustrationSearchEmpty />}
            title="No contacts found"
            description="Try a different name, phone number, or email."
            action={
              <button className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                Clear search
              </button>
            }
            compact
          />
        </PreviewCard>

        <PreviewCard label="Creatives — filter empty" tag="Filter">
          <EmptyState
            illustration={<IllustrationSearchEmpty />}
            title="No creatives match your filters"
            description="Try a different format, campaign, or search term."
            action={
              <button className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                Clear filters
              </button>
            }
            compact
          />
        </PreviewCard>
      </div>

      {/* ── DETAIL PAGE SECTIONS ───────────────────────────── */}
      <motion.div variants={fadeUp} className="mb-6">
        <h2 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.6px] mb-3">
          Tertiary — Detail Page Sections
        </h2>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        <PreviewCard label="Analytics — no data" tag="Waiting">
          <EmptyState
            illustration={<IllustrationChart />}
            title="Waiting for data"
            description="Analytics will populate once your campaign starts delivering."
            compact
          />
        </PreviewCard>

        <PreviewCard label="Call History — empty" tag="Waiting">
          <EmptyState
            illustration={<IllustrationPhone />}
            title="No calls yet"
            description="Call history will appear once this agent starts reaching leads."
            compact
          />
        </PreviewCard>

        <PreviewCard label="Agent Performance — no data" tag="Waiting">
          <EmptyState
            illustration={<IllustrationChart />}
            title="No performance data yet"
            description="Metrics will populate after this agent completes its first calls."
            compact
          />
        </PreviewCard>

        <PreviewCard label="Campaign Leads — empty" tag="Waiting">
          <EmptyState
            illustration={<IllustrationLeads />}
            title="No leads yet"
            description="Leads will appear here as your campaign receives submissions."
            compact
          />
        </PreviewCard>

        <PreviewCard label="Campaign Insights — no data" tag="Waiting">
          <EmptyState
            illustration={<IllustrationChart />}
            title="Not enough data for insights"
            description="Insights need at least 20 leads to generate meaningful patterns."
            compact
          />
        </PreviewCard>

        <PreviewCard label="Dashboard — no agent" tag="Setup">
          <EmptyState
            illustration={<IllustrationAgents />}
            title="No voice agent connected"
            description="Create an agent to see call analytics and qualification metrics here."
            action={
              <button className="h-8 px-3 text-[12px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                Create Agent
              </button>
            }
            compact
          />
        </PreviewCard>
      </div>

      {/* ── ILLUSTRATION GALLERY ───────────────────────────── */}
      <motion.div variants={fadeUp} className="mb-6">
        <h2 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.6px] mb-3">
          Illustration Gallery
        </h2>
      </motion.div>

      <motion.div variants={fadeUp} className="bg-white border border-border rounded-card p-6 mb-8">
        <div className="grid grid-cols-6 gap-6">
          {[
            { name: "Campaigns", el: <IllustrationCampaigns /> },
            { name: "Search Empty", el: <IllustrationSearchEmpty /> },
            { name: "Agents", el: <IllustrationAgents /> },
            { name: "Projects", el: <IllustrationProjects /> },
            { name: "Leads", el: <IllustrationLeads /> },
            { name: "Contacts", el: <IllustrationContacts /> },
            { name: "Creatives", el: <IllustrationCreatives /> },
            { name: "Audiences", el: <IllustrationAudiences /> },
            { name: "Outreach", el: <IllustrationOutreach /> },
            { name: "Sequences", el: <IllustrationSequences /> },
            { name: "Chart", el: <IllustrationChart /> },
            { name: "Phone", el: <IllustrationPhone /> },
          ].map((item) => (
            <div key={item.name} className="flex flex-col items-center gap-2">
              <div className="bg-surface-page rounded-card p-3 flex items-center justify-center min-h-[100px]">
                {item.el}
              </div>
              <span className="text-[11px] text-text-tertiary">{item.name}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
