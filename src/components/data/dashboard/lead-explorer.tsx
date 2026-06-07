"use client";

// Chart grid. Two fixed rows of preset cards:
//   Row 1, 3-up: Location · Years of experience · Company tier
//   Row 2, 2-up: Net worth · Salary range
// Followed by user-built custom cards, then the "+ Build a chart" tile.

import { useState } from "react";
import {
  DEMOGRAPHIC_EXTRA_CARDS,
  FINANCIAL_CHART_CARDS,
  type ChartCardId,
  type CustomChartCard,
  type LeadProfile,
} from "@/lib/dashboard/types";

import { BreakdownChartCard } from "./breakdown-chart-card";
import { AddChartCardMenu } from "./add-chart-card-menu";
import { ChartBuilderDialog } from "./chart-builder-dialog";

interface Props {
  profiles: LeadProfile[];
  defaultCards: ChartCardId[];
  customCards: CustomChartCard[];
  onCustomCardsChange: (cards: CustomChartCard[]) => void;
}

export function LeadExplorer({
  profiles,
  defaultCards,
  customCards,
  onCustomCardsChange,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomChartCard | undefined>();

  const openNew = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  const openEdit = (card: CustomChartCard) => {
    setEditing(card);
    setDialogOpen(true);
  };

  const handleSave = (card: CustomChartCard) => {
    const idx = customCards.findIndex((c) => c.id === card.id);
    if (idx === -1) onCustomCardsChange([...customCards, card]);
    else {
      const next = [...customCards];
      next[idx] = card;
      onCustomCardsChange(next);
    }
  };

  const handleRemove = (id: string) => {
    onCustomCardsChange(customCards.filter((c) => c.id !== id));
  };

  return (
    <section className="space-y-3">
      {/* Demographic 3-up */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {defaultCards.map((cardId) => (
          <BreakdownChartCard
            key={cardId}
            mode="preset"
            cardId={cardId}
            profiles={profiles}
          />
        ))}
      </div>

      {/* Age — single full-width horizontal bar row */}
      <div className="grid grid-cols-1 gap-3">
        {DEMOGRAPHIC_EXTRA_CARDS.map((cardId) => (
          <BreakdownChartCard
            key={cardId}
            mode="preset"
            cardId={cardId}
            profiles={profiles}
          />
        ))}
      </div>

      {/* Financial 2-up: Net worth + Salary range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FINANCIAL_CHART_CARDS.map((cardId) => (
          <BreakdownChartCard
            key={cardId}
            mode="preset"
            cardId={cardId}
            profiles={profiles}
          />
        ))}
      </div>

      {/* Custom-built cards + the add-tile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {customCards.map((card) => (
          <BreakdownChartCard
            key={card.id}
            mode="custom"
            card={card}
            profiles={profiles}
            onEdit={() => openEdit(card)}
            onRemove={() => handleRemove(card.id)}
          />
        ))}
        <AddChartCardMenu onClick={openNew} />
      </div>

      <ChartBuilderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        profiles={profiles}
        existing={editing}
        onSave={handleSave}
      />
    </section>
  );
}
