"use client";

import { doc, getDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase/client";

export type UserRole = "user" | "technician" | "admin";

export async function getCurrentProfile() {
  if (!auth || !db || !isFirebaseConfigured) {
    return null;
  }
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) {
    return null;
  }
  const data = snap.data() as { role?: UserRole; email?: string; displayName?: string; userId?: string };
  return { uid: user.uid, role: data.role ?? "user", profile: data };
}

export function isStaff(role?: UserRole) {
  return role === "admin" || role === "technician";
}
