"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, setDoc, updateDoc, type Firestore } from "firebase/firestore";
import PageHeader from "@/components/sections/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { db, isFirebaseConfigured } from "@/lib/firebase/client";
import { buildProfileFromUser, emptyAddress } from "@/lib/user-profile";
import { showErrorAlert, showSuccessAlert } from "@/lib/alerts";
import { uploadLocalFile } from "@/lib/uploads/client";
import type { UserProfile } from "@/types/user";

export default function ProfileEditPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<UserProfile | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
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
    const firestore = db as Firestore;
    const ref = doc(firestore, "users", user.uid);
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
          setAvatarFile(null);
          setHydrated(true);
        }
      },
      (err) => setError(err.message),
    );
    return () => unsubscribe();
  }, [user]);

  const avatarPreview = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile);
    }
    return form?.avatarUrl ?? "";
  }, [avatarFile, form?.avatarUrl]);

  useEffect(() => {
    if (!avatarFile) return;
    return () => {
      URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarFile, avatarPreview]);

  const handleSave = async () => {
    if (!user || !form || !db || !isFirebaseConfigured) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const firestore = db as Firestore;
      const ref = doc(firestore, "users", user.uid);
      let avatarUrl = form.avatarUrl;
      if (avatarFile) {
        const upload = await uploadLocalFile(avatarFile, "avatars");
        avatarUrl = upload.url;
      }
      const payload = {
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        avatarUrl,
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
      setAvatarFile(null);
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
    setAvatarFile(null);
    router.push("/profile");
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
        title={t("profile.editNameAction")}
        subtitle={t("profile.subtitle")}
        backHref="/profile"
      />
      <Card className="space-y-3">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[--text-mid]">
            {lang === "th" ? "รูปโปรไฟล์" : "Profile photo"}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-emerald-100 bg-white">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={form.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[--text-soft]">
                  {lang === "th" ? "ไม่มีรูป" : "No photo"}
                </div>
              )}
            </div>
            <Input
              type="file"
              accept="image/*"
              onChange={(event) =>
                setAvatarFile(event.target.files?.[0] ?? null)
              }
            />
          </div>
        </div>
        <Input
          value={form.displayName}
          onChange={(event) =>
            setForm((prev) =>
              prev ? { ...prev, displayName: event.target.value } : prev,
            )
          }
          placeholder={t("auth.displayName")}
        />
        <Input
          value={form.phone}
          onChange={(event) =>
            setForm((prev) =>
              prev ? { ...prev, phone: event.target.value } : prev,
            )
          }
          placeholder={t("fields.contactPhone")}
        />
        <Input
          value={form.email}
          onChange={(event) =>
            setForm((prev) =>
              prev ? { ...prev, email: event.target.value } : prev,
            )
          }
          placeholder={t("auth.email")}
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
