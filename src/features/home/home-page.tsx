"use client";

import Link from "next/link";
import PageHeader from "@/components/sections/page-header";
import PromoCard from "@/components/sections/promo-card";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { SupportIcon, WrenchIcon, StatusIcon } from "@/components/icons";
import { useI18n } from "@/components/i18n-provider";
import { promotions } from "@/data/promotions";
import { announcements } from "@/data/announcements";

export default function HomePage() {
  const { t, pick } = useI18n();
  const repairHint = t("ticket.newSubtitle");
  const statusHint = t("ticket.subtitle");
  const supportHint = t("support.subtitle");

  return (
    <div className="space-y-6">
      <PageHeader title={t("home.title")} subtitle={t("home.subtitle")} />
      <section className="space-y-4">
        <SectionTitle title={t("home.quickActions")} />
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/tickets/new" className="group">
            <Card className="flex items-center gap-3 p-4 transition group-hover:-translate-y-1">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <WrenchIcon />
              </span>
              <div>
                <div className="text-sm font-semibold">{t("nav.repair")}</div>
                <div className="text-xs text-[--text-soft]">{repairHint}</div>
              </div>
            </Card>
          </Link>
          <Link href="/tickets" className="group">
            <Card className="flex items-center gap-3 p-4 transition group-hover:-translate-y-1">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <StatusIcon />
              </span>
              <div>
                <div className="text-sm font-semibold">{t("nav.status")}</div>
                <div className="text-xs text-[--text-soft]">{statusHint}</div>
              </div>
            </Card>
          </Link>
          <Link href="/help" className="group">
            <Card className="flex items-center gap-3 p-4 transition group-hover:-translate-y-1">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <SupportIcon />
              </span>
              <div>
                <div className="text-sm font-semibold">{t("nav.support")}</div>
                <div className="text-xs text-[--text-soft]">{supportHint}</div>
              </div>
            </Card>
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle title={t("home.promotions")} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {promotions.map((item) => (
            <PromoCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle title={t("home.announcements")} />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {announcements.map((item) => (
            <Card key={item.id} className="space-y-1 p-4">
              <div className="text-sm font-semibold text-[--text-strong]">
                {pick(item.title)}
              </div>
              <div className="text-xs text-[--text-soft]">
                {pick(item.detail)}
              </div>
              <div className="text-xs text-[--text-soft]">{item.date}</div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
