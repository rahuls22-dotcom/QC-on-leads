"use client";

// Chart grid. The 5 preset cards (Source / Company tier / Seniority /
// Geography / Income range) come first, followed by any user-built custom
// cards, followed by the "+ Build a chart" tile that opens the dialog.

import { useState } from "react";
import type {
  ChartCardId,
  CustomChartCard,
  LeadProfile,
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
    <section>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {defaultCards.map((cardId) => (
          <BreakdownChartCard
            key={cardId}
            mode="preset"
            cardId={cardId}
            profiles={profiles}
          />
        ))}
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
