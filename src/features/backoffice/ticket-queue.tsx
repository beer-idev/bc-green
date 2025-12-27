"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/components/i18n-provider";
import { subscribeTickets } from "@/services/tickets";
import type { Ticket } from "@/types/ticket";

type TicketQueueProps = {
  items?: Ticket[];
};

export default function TicketQueue({ items: initialItems }: TicketQueueProps) {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<Ticket[]>(initialItems ?? []);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialItems) {
      setItems(initialItems);
      return;
    }
    const unsubscribe = subscribeTickets(
      (data) => setItems(data),
      (err) => setError(err.message),
    );
    return () => unsubscribe();
  }, [initialItems]);

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  if (!items.length) {
    return (
      <p className="text-sm text-[--text-soft]">
        {lang === "th" ? "ยังไม่มีรายการงาน" : "No tickets yet."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((ticket) => (
        <Card key={ticket.id} className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-[--text-strong]">
              {ticket.title}
            </div>
            <div className="text-xs text-[--text-soft]">
              {ticket.readableNo} - {ticket.category}
            </div>
            {ticket.assignedTo ? (
              <div className="text-xs text-[--text-soft]">
                {t("labels.assignedTo")}: {ticket.assignedTo}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/bo/tickets/${ticket.id}`}>
              <Button size="sm" variant="outline">
                {t("actions.viewTicket")}
              </Button>
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
