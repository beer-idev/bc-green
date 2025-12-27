"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import PageHeader from "@/components/sections/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { db, isFirebaseConfigured } from "@/lib/firebase/client";
import { buildProfileFromUser, emptyAddress } from "@/lib/user-profile";
import { showErrorAlert, showSuccessAlert } from "@/lib/alerts";
import type { UserProfile } from "@/types/user";

export default function ProfileEditPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<UserProfile | null>(null);
  const [hasDoc, setHasDoc] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setHydrated(false);
    if (!user) {
      setProfile(null);
      setForm(null);
      return;
    }
    if (!db || !isFirebaseConfigured) {
      const nextProfile = buildProfileFromUser(user);
      setProfile(nextProfile);
      setForm(nextProfile);
      setHydrated(true);
      return;
    }
    const ref = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const nextProfile = snapshot.exists()
          ? buildProfileFromUser(user, snapshot.data())
          : buildProfileFromUser(user);
        setProfile(nextProfile);
        setHasDoc(snapshot.exists());
        if (!hydrated) {
          setForm(nextProfile);
          setHydrated(true);
        }
      },
      (err) => setError(err.message),
    );
    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    if (!user || !form || !db || !isFirebaseConfigured) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const ref = doc(db, "users", user.uid);
      const payload = {
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        updatedAt: new Date().toISOString(),
      };
      if (hasDoc) {
        await updateDoc(ref, payload);
      } else {
        await setDoc(ref, {
          ...payload,
          address: emptyAddress,
          role: "user",
          createdAt: new Date().toISOString(),
        });
      }
      await showSuccessAlert({
        title: t("actions.save"),
        text: lang === "th" ? "บันทึกข้อมูลเรียบร้อย" : "Profile saved.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to save profile.";
      setError(message);
      await showErrorAlert({ title: "Error", text: message });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setForm(profile);
    }
  };

  if (!user) {
    return <p className="text-sm text-[--text-soft]">Please sign in first.</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  if (!form) {
    return <p className="text-sm text-[--text-soft]">Loading profile...</p>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("profile.editName")}
        subtitle={t("profile.subtitle")}
        backHref="/profile"
      />
      <Card className="space-y-3">
        <Input
          value={form.displayName}
          onChange={(event) =>
            setForm((prev) =>
              prev ? { ...prev, displayName: event.target.value } : prev,
            )
          }
        />
        <Input
          value={form.phone}
          onChange={(event) =>
            setForm((prev) =>
              prev ? { ...prev, phone: event.target.value } : prev,
            )
          }
        />
        <Input
          value={form.email}
          onChange={(event) =>
            setForm((prev) =>
              prev ? { ...prev, email: event.target.value } : prev,
            )
          }
        />
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "..." : t("actions.save")}
          </Button>
          <Button variant="danger" onClick={handleCancel}>
            {t("actions.cancel")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
