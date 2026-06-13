"use client";

import { ExternalLink, ChevronDown, ChevronUp, List, Maximize2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { AgentMvpDetail } from "@/lib/voice-agent-data";

interface AgentTabProps {
  agent: AgentMvpDetail;
}

/** Renders {{variable}} tokens in accent color */
function TemplateText({ text }: { text: string }) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith("{{") ? (
          <span key={i} className="text-accent font-medium bg-accent/10 px-1 rounded">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

/** Extract sections from prompt text (lines starting with uppercase or bold markers) */
function extractSections(text: string): { id: string; title: string; startLine: number }[] {
  const lines = text.split("\n");
  const sections: { id: string; title: string; startLine: number }[] = [];
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // Match lines that look like section headers (ALL CAPS, or lines ending with colon, or bold markers)
    if (
      (trimmed.length > 3 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) ||
      trimmed.startsWith("##") ||
      trimmed.startsWith("**") ||
      (trimmed.endsWith(":") && trimmed.length < 60 && trimmed.length > 5)
    ) {
      sections.push({
        id: `section-${i}`,
        title: trimmed.replace(/^#+\s*/, "").replace(/^\*\*/, "").replace(/\*\*$/, "").replace(/:$/, "").replace(/—.*$/, "").trim(),
        startLine: i,
      });
    }
  });
  return sections;
}

export function AgentTab({ agent }: AgentTabProps) {
  const [expanded, setExpanded] = useState(true);
  const [showSections, setShowSections] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = useMemo(() => extractSections(agent.systemPrompt), [agent.systemPrompt]);

  // Convert plain text prompt to basic markdown for Tiptap
  const markdownContent = useMemo(() => {
    return agent.systemPrompt
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return "<p><br></p>";
        // ALL CAPS lines become h3 headers
        if (trimmed.length > 3 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
          return `<h3>${trimmed}</h3>`;
        }
        // Lines starting with - or • become list items (wrap in ul later)
        if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
          return `<li>${trimmed.slice(2)}</li>`;
        }
        return `<p>${trimmed}</p>`;
      })
      .join("")
      // Wrap consecutive <li> in <ul>
      .replace(/(<li>.*?<\/li>)+/g, (match) => `<ul>${match}</ul>`);
  }, [agent.systemPrompt]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: markdownContent,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none text-[13px] leading-relaxed text-text-primary [&_h3]:text-[14px] [&_h3]:font-bold [&_h3]:text-text-primary [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:uppercase [&_h3]:tracking-wide [&_p]:mb-2 [&_ul]:mb-3 [&_ul]:pl-4 [&_li]:mb-1 [&_li]:text-text-secondary",
      },
    },
  });

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    // Find the section in the editor by scrolling to the header
    const sectionIndex = sections.findIndex((s) => s.id === sectionId);
    if (sectionIndex >= 0 && editor) {
      const headers = document.querySelectorAll(".ProseMirror h3");
      if (headers[sectionIndex]) {
        headers[sectionIndex].scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <div className="flex gap-5">
      {/* Left: System Prompt (~60%) */}
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-border rounded-card">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-3">
              <h3 className="text-[14px] font-semibold text-text-primary">System Prompt</h3>
              <a href="#" className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline">
                Guidelines <ExternalLink size={11} strokeWidth={1.5} />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSections(!showSections)}
                className={`h-8 px-3 text-[12px] font-medium border rounded-button inline-flex items-center gap-1.5 transition-colors ${
                  showSections ? "border-accent bg-accent/5 text-accent" : "border-border bg-white text-text-secondary hover:bg-surface-page"
                }`}
              >
                <List size={13} strokeWidth={1.5} />
                Sections <span className="text-[10px] font-medium px-1 py-0.5 rounded bg-surface-secondary text-text-tertiary">{sections.length}</span>
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="h-8 px-3 text-[12px] font-medium border border-border rounded-button bg-white text-text-secondary hover:bg-surface-page transition-colors inline-flex items-center gap-1"
              >
                {expanded ? <><ChevronUp size={13} strokeWidth={1.5} /> Collapse</> : <><Maximize2 size={12} strokeWidth={1.5} /> Expand</>}
              </button>
              <button className="h-8 px-3.5 text-[12px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors">
                Save Changes
              </button>
            </div>
          </div>

          {/* Section Navigation Panel */}
          {showSections && expanded && (
            <div className="px-5 py-3 border-b border-border-subtle bg-surface-page/50">
              <div className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-2">Navigate Sections</div>
              <div className="flex flex-wrap gap-1.5">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-badge transition-colors ${
                      activeSection === section.id
                        ? "bg-accent text-white"
                        : "bg-white text-text-secondary border border-border hover:border-accent/30 hover:text-text-primary"
                    }`}
                  >
                    {section.title.length > 30 ? section.title.slice(0, 30) + "..." : section.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt body — Tiptap editor */}
          {expanded && (
            <div className="p-5">
              <div className="w-full min-h-[320px] max-h-[500px] overflow-y-auto p-4 bg-surface-page border border-border rounded-card">
                <EditorContent editor={editor} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Greeting + Voice (~40%) */}
      <div className="w-[340px] shrink-0 flex flex-col gap-4">
        {/* Greeting Message */}
        <div className="bg-white border border-border rounded-card p-5">
          <h3 className="text-[14px] font-semibold text-text-primary mb-3">Greeting Message</h3>
          <div className="p-3 bg-surface-page border border-border rounded-card text-[13px] leading-relaxed text-text-primary">
            <TemplateText text={agent.greetingTemplate} />
          </div>
        </div>

        {/* Voice */}
        <div className="bg-white border border-border rounded-card p-5">
          <h3 className="text-[14px] font-semibold text-text-primary mb-3">Voice</h3>
          <select
            defaultValue={agent.voiceId}
            className="w-full h-9 px-3 text-[13px] bg-white border border-border rounded-button text-text-primary appearance-none cursor-pointer"
          >
            <option value={agent.voiceId}>{agent.voiceName}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
