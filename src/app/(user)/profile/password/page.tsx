"use client";

import PageHeader from "@/components/sections/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";

export default function ProfilePasswordPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("profile.changePassword")}
        subtitle={t("profile.subtitle")}
        backHref="/profile"
      />
      <Card className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Input type="password" placeholder="********" />
          <Input type="password" placeholder="********" />
        </div>
        <div className="flex gap-2">
          <Button>{t("actions.save")}</Button>
          <Button variant="danger">{t("actions.cancel")}</Button>
        </div>
      </Card>
    </div>
  );
}
