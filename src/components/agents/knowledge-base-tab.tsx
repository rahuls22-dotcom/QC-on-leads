"use client";

import { Upload, FileText } from "lucide-react";
import type { AgentMvpDetail } from "@/lib/voice-agent-data";

interface KnowledgeBaseTabProps {
  agent: AgentMvpDetail;
}

export function KnowledgeBaseTab({ agent }: KnowledgeBaseTabProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-[16px] font-semibold text-text-primary mb-1">
          Knowledge Base
        </h3>
        <p className="text-[13px] text-text-secondary">
          Existing files your agent has learned from.
        </p>
      </div>

      {/* Upload area */}
      <div className="border-2 border-dashed border-border rounded-card p-8 flex flex-col items-center justify-center text-center hover:border-accent/40 transition-colors cursor-pointer">
        <div className="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center mb-3">
          <Upload size={18} strokeWidth={1.5} className="text-text-secondary" />
        </div>
        <p className="text-[13px] font-medium text-text-primary mb-1">
          Click to upload or drag and drop
        </p>
        <p className="text-[12px] text-text-secondary">
          PDF, DOC, DOCX, TXT, MD allowed
        </p>
      </div>

      {/* Uploaded Files */}
      {agent.knowledgeFiles.length > 0 && (
        <div>
          <h4 className="text-[13px] font-semibold text-text-primary mb-3">
            Uploaded Files
          </h4>
          <div className="space-y-2">
            {agent.knowledgeFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 bg-white border border-border rounded-card px-4 py-3"
              >
                <div className="w-8 h-8 rounded-[6px] bg-surface-secondary flex items-center justify-center shrink-0">
                  <FileText
                    size={15}
                    strokeWidth={1.5}
                    className="text-text-secondary"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-primary truncate">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-text-secondary">
                    Uploaded File
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
