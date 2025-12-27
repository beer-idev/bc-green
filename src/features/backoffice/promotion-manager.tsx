"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/i18n-provider";
import { db, isFirebaseConfigured } from "@/lib/firebase/client";
import { uploadLocalFile } from "@/lib/uploads/client";
import { promotions as seedPromotions } from "@/data/promotions";
import type { PromotionItem } from "@/types/promotion";

type FormState = {
  titleTh: string;
  subtitleTh: string;
  titleEn: string;
  subtitleEn: string;
  contentTh: string;
  contentEn: string;
};

const emptyForm: FormState = {
  titleTh: "",
  subtitleTh: "",
  titleEn: "",
  subtitleEn: "",
  contentTh: "",
  contentEn: "",
};

export default function PromotionManager() {
  const { lang } = useI18n();
  const [items, setItems] = useState<PromotionItem[]>(seedPromotions);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const imagePreview = useMemo(() => {
    if (!imageFile) {
      return "";
    }
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    if (!db || !isFirebaseConfigured) {
      return;
    }
    const promoQuery = query(
      collection(db, "promotions"),
      orderBy("updatedAt", "desc"),
    );
    const unsubscribe = onSnapshot(promoQuery, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<PromotionItem, "id">),
      }));
      setItems(data);
    });
    return () => unsubscribe();
  }, []);

  const handleCreate = async () => {
    if (!db || !isFirebaseConfigured) {
      setMessage(
        lang === "th"
          ? "Firebase ยังไม่พร้อมใช้งาน"
          : "Firebase is not configured.",
      );
      return;
    }
    if (!imageFile) {
      setMessage(lang === "th" ? "กรุณาอัพรูปภาพ" : "Please upload an image.");
      return;
    }
    setMessage("");
    setUploading(true);
    try {
      const now = new Date().toISOString();
      const upload = await uploadLocalFile(imageFile, "promotions");
      await addDoc(collection(db, "promotions"), {
        title: { th: form.titleTh, en: form.titleEn },
        subtitle: { th: form.subtitleTh, en: form.subtitleEn },
        content: { th: form.contentTh, en: form.contentEn },
        image: upload.url,
        published: true,
        createdAt: now,
        updatedAt: now,
      });
      setForm(emptyForm);
      setImageFile(null);
      setMessage(lang === "th" ? "เพิ่มโปรโมชั่นแล้ว" : "Promotion added.");
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Unable to save promotion.";
      setMessage(text);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (promoId: string) => {
    if (!db || !isFirebaseConfigured) {
      return;
    }
    await deleteDoc(doc(db, "promotions", promoId));
  };

  const togglePublish = async (promo: PromotionItem) => {
    if (!db || !isFirebaseConfigured) {
      return;
    }
    await updateDoc(doc(db, "promotions", promo.id), {
      published: !promo.published,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="text-sm font-semibold text-[--text-strong]">
          {lang === "th" ? "เพิ่มโปรโมชั่นใหม่" : "Add new promotion"}
        </div>
        <Input
          value={form.titleTh}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, titleTh: event.target.value }))
          }
          placeholder={lang === "th" ? "ชื่อโปรโมชั่น (TH)" : "Title (TH)"}
        />
        <Textarea
          value={form.subtitleTh}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, subtitleTh: event.target.value }))
          }
          placeholder={lang === "th" ? "คำอธิบาย (TH)" : "Subtitle (TH)"}
        />
        <Input
          value={form.titleEn}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, titleEn: event.target.value }))
          }
          placeholder={lang === "th" ? "ชื่อโปรโมชั่น (EN)" : "Title (EN)"}
        />
        <Textarea
          value={form.subtitleEn}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, subtitleEn: event.target.value }))
          }
          placeholder={lang === "th" ? "คำอธิบาย (EN)" : "Subtitle (EN)"}
        />
        <Textarea
          value={form.contentTh}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, contentTh: event.target.value }))
          }
          placeholder={lang === "th" ? "รายละเอียด (TH)" : "Content (TH)"}
        />
        <Textarea
          value={form.contentEn}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, contentEn: event.target.value }))
          }
          placeholder={lang === "th" ? "รายละเอียด (EN)" : "Content (EN)"}
        />
        <div className="space-y-2">
          <Input
            type="file"
            accept="image/*"
            onChange={(event) =>
              setImageFile(event.target.files?.[0] ?? null)
            }
          />
          {imagePreview ? (
            <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white">
              <img
                src={imagePreview}
                alt="Promotion preview"
                className="h-40 w-full object-cover"
              />
            </div>
          ) : null}
        </div>
        {message ? <div className="text-xs text-emerald-700">{message}</div> : null}
        <Button onClick={handleCreate} disabled={uploading}>
          {uploading
            ? "..."
            : lang === "th"
              ? "บันทึกโปรโมชั่น"
              : "Save promotion"}
        </Button>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((promo) => (
          <Card key={promo.id} className="space-y-2">
            {promo.image ? (
              <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white">
                <img
                  src={promo.image}
                  alt={lang === "th" ? promo.title.th : promo.title.en}
                  className="h-40 w-full object-cover"
                />
              </div>
            ) : null}
            <div className="text-sm font-semibold text-[--text-strong]">
              {lang === "th" ? promo.title.th : promo.title.en}
            </div>
            <div className="text-xs text-[--text-soft]">
              {lang === "th" ? promo.subtitle.th : promo.subtitle.en}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => togglePublish(promo)}
              >
                {promo.published
                  ? lang === "th"
                    ? "ยกเลิกเผยแพร่"
                    : "Unpublish"
                  : lang === "th"
                    ? "เผยแพร่"
                    : "Publish"}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleDelete(promo.id)}
              >
                {lang === "th" ? "ลบ" : "Delete"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
