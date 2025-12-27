"use client";

import { useEffect, useState } from "react";
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
import { faqs as seedFaqs } from "@/data/support";
import type { FaqItem } from "@/types/support";

type FormState = {
  questionTh: string;
  answerTh: string;
  questionEn: string;
  answerEn: string;
  tags: string;
};

const emptyForm: FormState = {
  questionTh: "",
  answerTh: "",
  questionEn: "",
  answerEn: "",
  tags: "",
};

export default function FaqManager() {
  const { lang } = useI18n();
  const [items, setItems] = useState<FaqItem[]>(seedFaqs);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!db || !isFirebaseConfigured) {
      return;
    }
    const faqQuery = query(collection(db, "faqs"), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(faqQuery, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<FaqItem, "id">),
      }));
      setItems(data);
    });
    return () => unsubscribe();
  }, []);

  const handleCreate = async () => {
    if (!db || !isFirebaseConfigured) {
      setMessage(lang === "th" ? "Firebase ยังไม่พร้อมใช้งาน" : "Firebase is not configured.");
      return;
    }
    setMessage("");
    const now = new Date().toISOString();
    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    await addDoc(collection(db, "faqs"), {
      question: { th: form.questionTh, en: form.questionEn },
      answer: { th: form.answerTh, en: form.answerEn },
      tags,
      published: true,
      updatedAt: now,
    });
    setForm(emptyForm);
    setMessage(lang === "th" ? "เพิ่ม FAQ แล้ว" : "FAQ added.");
  };

  const handleDelete = async (faqId: string) => {
    if (!db || !isFirebaseConfigured) {
      return;
    }
    await deleteDoc(doc(db, "faqs", faqId));
  };

  const togglePublish = async (faq: FaqItem) => {
    if (!db || !isFirebaseConfigured) {
      return;
    }
    await updateDoc(doc(db, "faqs", faq.id), {
      published: !faq.published,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="text-sm font-semibold text-[--text-strong]">
          {lang === "th" ? "เพิ่ม FAQ ใหม่" : "Add new FAQ"}
        </div>
        <Input
          value={form.questionTh}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, questionTh: event.target.value }))
          }
          placeholder={lang === "th" ? "คำถาม (TH)" : "Question (TH)"}
        />
        <Textarea
          value={form.answerTh}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, answerTh: event.target.value }))
          }
          placeholder={lang === "th" ? "คำตอบ (TH)" : "Answer (TH)"}
        />
        <Input
          value={form.questionEn}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, questionEn: event.target.value }))
          }
          placeholder={lang === "th" ? "คำถาม (EN)" : "Question (EN)"}
        />
        <Textarea
          value={form.answerEn}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, answerEn: event.target.value }))
          }
          placeholder={lang === "th" ? "คำตอบ (EN)" : "Answer (EN)"}
        />
        <Input
          value={form.tags}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, tags: event.target.value }))
          }
          placeholder={lang === "th" ? "แท็ก (คั่นด้วย ,)" : "Tags (comma separated)"}
        />
        {message ? <div className="text-xs text-emerald-700">{message}</div> : null}
        <Button onClick={handleCreate}>
          {lang === "th" ? "บันทึก FAQ" : "Save FAQ"}
        </Button>
      </Card>
      <div className="space-y-3">
        {items.map((faq) => (
          <Card key={faq.id} className="space-y-2">
            <div className="text-sm font-semibold text-[--text-strong]">
              {lang === "th" ? faq.question.th : faq.question.en}
            </div>
            <div className="text-xs text-[--text-soft]">
              {lang === "th" ? faq.answer.th : faq.answer.en}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => togglePublish(faq)}>
                {faq.published
                  ? lang === "th"
                    ? "ยกเลิกเผยแพร่"
                    : "Unpublish"
                  : lang === "th"
                    ? "เผยแพร่"
                    : "Publish"}
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(faq.id)}>
                {lang === "th" ? "ลบ" : "Delete"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
