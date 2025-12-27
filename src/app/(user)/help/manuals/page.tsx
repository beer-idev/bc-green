"use client";

import PageHeader from "@/components/sections/page-header";
import { useI18n } from "@/components/i18n-provider";
import ManualList from "@/features/support/manual-list";

export default function HelpManualPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("support.manuals")}
        subtitle={t("support.subtitle")}
        backHref="/help"
      />
      <ManualList />
    </div>
  );
}
