"use client";

import {
  doc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase/client";
import { announcements } from "@/data/announcements";
import { promotions } from "@/data/promotions";
import { faqs, manuals } from "@/data/support";

function ensureUser() {
  if (!auth) {
    return null;
  }
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    return null;
  }
  return user;
}

async function shouldCreateDoc(collectionName: string, docId: string) {
  if (!db) {
    return false;
  }
  const snap = await getDoc(doc(db, collectionName, docId));
  return !snap.exists();
}

export async function seedCollections() {
  if (!db || !auth || !isFirebaseConfigured) {
    return { ok: false, error: "Firebase is not configured." };
  }

  const user = ensureUser();
  if (!user) {
    return { ok: false, error: "Authentication is required." };
  }

  const bootstrapRef = doc(db, "system", "bootstrap");
  const bootstrapSnap = await getDoc(bootstrapRef);
  if (bootstrapSnap.exists()) {
    return { ok: true, seeded: false };
  }

  const batch = writeBatch(db);
  const now = new Date().toISOString();

  for (const item of promotions) {
    if (await shouldCreateDoc("promotions", item.id)) {
      batch.set(doc(db, "promotions", item.id), { ...item, seed: true, createdAt: now });
    }
  }

  for (const item of announcements) {
    if (await shouldCreateDoc("announcements", item.id)) {
      batch.set(doc(db, "announcements", item.id), { ...item, seed: true, createdAt: now });
    }
  }

  for (const item of manuals) {
    if (await shouldCreateDoc("manuals", item.id)) {
      batch.set(doc(db, "manuals", item.id), {
        ...item,
        published: true,
        seed: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  for (const item of faqs) {
    if (await shouldCreateDoc("faqs", item.id)) {
      batch.set(doc(db, "faqs", item.id), {
        ...item,
        published: true,
        seed: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  batch.set(bootstrapRef, {
    seeded: true,
    seededAt: now,
    seededBy: user.uid,
  });

  await batch.commit();
  return { ok: true, seeded: true };
}
