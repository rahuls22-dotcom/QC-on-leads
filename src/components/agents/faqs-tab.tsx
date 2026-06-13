"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import type { AgentMvpDetail } from "@/lib/voice-agent-data";

interface FaqsTabProps {
  agent: AgentMvpDetail;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export function FaqsTab({ agent }: FaqsTabProps) {
  const [faqs, setFaqs] = useState<FaqItem[]>(() =>
    agent.faqs.map((f, i) => ({
      id: (f as FaqItem).id || `faq-${i}`,
      question: f.question,
      answer: f.answer,
    }))
  );
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");

  const filtered = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditId(null);
    setFormQuestion("");
    setFormAnswer("");
    setShowForm(true);
  };

  const openEdit = (faq: FaqItem) => {
    setEditId(faq.id);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormQuestion("");
    setFormAnswer("");
  };

  const saveForm = () => {
    if (!formQuestion.trim() || !formAnswer.trim()) return;

    if (editId) {
      setFaqs((prev) =>
        prev.map((f) =>
          f.id === editId
            ? { ...f, question: formQuestion.trim(), answer: formAnswer.trim() }
            : f
        )
      );
    } else {
      setFaqs((prev) => [
        ...prev,
        {
          id: `faq-${Date.now()}`,
          question: formQuestion.trim(),
          answer: formAnswer.trim(),
        },
      ]);
    }
    cancelForm();
  };

  const deleteFaq = (id: string) => {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[16px] font-semibold text-text-primary mb-1">
            Frequently Asked Questions
          </h3>
          <p className="text-[13px] text-text-secondary">
            Manage common questions and answers for your agent.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="h-9 px-4 text-[13px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors inline-flex items-center gap-1.5 shrink-0"
        >
          <Plus size={14} strokeWidth={1.5} />
          Add FAQ
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          strokeWidth={1.5}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="text"
          placeholder="Search FAQs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-3 text-[13px] bg-white border border-border rounded-button text-text-primary placeholder:text-text-tertiary"
        />
      </div>

      {/* Inline Add/Edit Form */}
      {showForm && (
        <div className="bg-white border border-border rounded-card p-5 space-y-3">
          <h4 className="text-[13px] font-semibold text-text-primary">
            {editId ? "Edit FAQ" : "Add FAQ"}
          </h4>
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1">
              Question
            </label>
            <input
              type="text"
              value={formQuestion}
              onChange={(e) => setFormQuestion(e.target.value)}
              placeholder="Enter the question..."
              className="w-full h-9 px-3 text-[13px] bg-white border border-border rounded-button text-text-primary placeholder:text-text-tertiary"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1">
              Answer
            </label>
            <textarea
              value={formAnswer}
              onChange={(e) => setFormAnswer(e.target.value)}
              placeholder="Enter the answer..."
              rows={3}
              className="w-full px-3 py-2 text-[13px] bg-white border border-border rounded-button text-text-primary placeholder:text-text-tertiary resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveForm}
              className="h-8 px-3.5 text-[12px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors"
            >
              Save
            </button>
            <button
              onClick={cancelForm}
              className="h-8 px-3.5 text-[12px] font-medium border border-border rounded-button bg-white text-text-secondary hover:bg-surface-page transition-colors inline-flex items-center gap-1"
            >
              <X size={12} strokeWidth={1.5} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-5 py-3">
                Question &amp; Answer
              </th>
              <th className="text-right text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-5 py-3 w-[100px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={2}
                  className="text-center text-[13px] text-text-secondary py-10"
                >
                  No FAQs found.
                </td>
              </tr>
            ) : (
              filtered.map((faq) => (
                <tr
                  key={faq.id}
                  className="border-b border-border last:border-b-0 hover:bg-surface-page/50 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] font-medium text-text-primary mb-0.5">
                      {faq.question}
                    </p>
                    <p className="text-[12px] text-text-secondary leading-relaxed">
                      {faq.answer}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openEdit(faq)}
                        className="p-1.5 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => deleteFaq(faq.id)}
                        className="p-1.5 rounded-button text-text-tertiary hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
