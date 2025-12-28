"use client";

import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase/client";
import { uploadLocalFiles } from "@/lib/uploads/client";
import { getCurrentProfile, isStaff } from "@/lib/security";
import type {
  Ticket,
  TicketAttachment,
  TicketCreateInput,
  TicketStatus,
} from "@/types/ticket";

const TICKET_COLLECTION = "tickets";
const NOTIFICATION_COLLECTION = "notifications";

function ensureFirebase() {
  if (!db || !isFirebaseConfigured) {
    return false;
  }
  return true;
}

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

function generateReadableNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `BC-${year}${month}-${suffix}`;
}

async function uploadAttachments(
  files: File[],
  onProgress?: (value: number) => void,
) {
  if (!files.length) {
    return [];
  }
  const results = await uploadLocalFiles(files, "tickets", onProgress);
  return results.map((file) => ({
    url: file.url,
    path: file.path,
    type: file.type,
    name: file.name,
  })) as TicketAttachment[];
}

export async function createTicket(
  input: TicketCreateInput,
  files: File[],
  onProgress?: (value: number) => void,
) {
  if (!ensureFirebase()) {
    return { ok: false, error: "Firebase is not configured." };
  }

  const user = ensureUser();
  if (!user) {
    return { ok: false, error: "Authentication is required." };
  }

  try {
    const firestore = db as Firestore;
    const profileSnap = await getDoc(doc(firestore, "users", user.uid));
    const profile = profileSnap.exists()
      ? (profileSnap.data() as {
          address?: {
            line1?: string;
            district?: string;
            province?: string;
            zip?: string;
          };
        })
      : null;
    const address = profile?.address;
    const hasAddress =
      !!address &&
      [address.line1, address.district, address.province, address.zip].every(
        (value) => typeof value === "string" && value.trim().length > 0,
      );
    if (!hasAddress) {
      return {
        ok: false,
        error: "Please update your address before submitting a ticket.",
      };
    }

    const now = new Date().toISOString();
    const readableNo = generateReadableNo();

    const docRef = await addDoc(collection(firestore, TICKET_COLLECTION), {
      ...input,
      readableNo,
      userId: user.uid,
      status: "NEW",
      assignedTo: null,
      attachments: [],
      timeline: [{ status: "NEW", at: now, by: user.uid }],
      createdAt: now,
      updatedAt: now,
    });

    const attachments = await uploadAttachments(files, onProgress);
    if (attachments.length) {
      await updateDoc(doc(firestore, TICKET_COLLECTION, docRef.id), {
        attachments,
        updatedAt: new Date().toISOString(),
      });
    }

    await addDoc(collection(firestore, NOTIFICATION_COLLECTION), {
      type: "new-ticket",
      ticketId: docRef.id,
      toRole: "technician",
      title: "New ticket",
      message: `New ticket ${readableNo}`,
      link: `/bo/tickets/${docRef.id}`,
      read: false,
      createdAt: now,
    });

    return { ok: true, id: docRef.id, readableNo };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create ticket.";
    return { ok: false, error: message };
  }
}

export function subscribeTicketsForUser(
  userId: string,
  onChange: (tickets: Ticket[]) => void,
  onError?: (error: Error) => void,
) {
  if (!ensureFirebase()) {
    onError?.(new Error("Firebase is not configured."));
    return () => {};
  }

  const firestore = db as Firestore;
  const ticketQuery = query(
    collection(firestore, TICKET_COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    ticketQuery,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) =>
        mapTicketFromData({ id: docSnap.id, ...docSnap.data() }),
      );
      onChange(items);
    },
    (error) => onError?.(error),
  );
}

export function subscribeTickets(
  onChange: (tickets: Ticket[]) => void,
  onError?: (error: Error) => void,
) {
  if (!ensureFirebase()) {
    onError?.(new Error("Firebase is not configured."));
    return () => {};
  }

  let cancelled = false;
  (async () => {
    const profile = await getCurrentProfile();
    if (!profile || !isStaff(profile.role)) {
      onError?.(new Error("No backoffice access."));
      cancelled = true;
      return;
    }
    if (cancelled) return;
    const firestore = db as Firestore;
    const ticketQuery = query(
      collection(firestore, TICKET_COLLECTION),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(
      ticketQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) =>
          mapTicketFromData({ id: docSnap.id, ...docSnap.data() }),
        );
        onChange(items);
      },
      (error) => onError?.(error),
    );
  })();

  return () => {
    cancelled = true;
  };
}

export function subscribeTicketById(
  ticketId: string,
  onChange: (ticket: Ticket | null) => void,
  onError?: (error: Error) => void,
) {
  if (!ensureFirebase()) {
    onError?.(new Error("Firebase is not configured."));
    return () => {};
  }

  let cancelled = false;
  (async () => {
    const profile = await getCurrentProfile();
    if (!profile) {
      onError?.(new Error("Authentication is required."));
      cancelled = true;
      return;
    }
    const firestore = db as Firestore;
    let ticketRef = doc(firestore, TICKET_COLLECTION, ticketId);
    let ticketSnap = await getDoc(ticketRef);
    if (!ticketSnap.exists()) {
      // Fallback: allow lookup by readableNo slug
      const fallbackQuery = query(
        collection(firestore, TICKET_COLLECTION),
        where("readableNo", "==", ticketId),
      );
      const fallbackSnap = await getDocs(fallbackQuery);
      const first = fallbackSnap.docs[0];
      if (first) {
        ticketRef = doc(firestore, TICKET_COLLECTION, first.id);
        ticketSnap = await getDoc(ticketRef);
      } else {
        onChange(null);
        cancelled = true;
        return;
      }
    }
    const ticketData = mapTicketFromData({
      id: ticketSnap.id,
      ...ticketSnap.data(),
    });
    if (!isStaff(profile.role) && ticketData.userId !== profile.uid) {
      onError?.(new Error("No permission to view this ticket."));
      cancelled = true;
      return;
    }
    if (cancelled) return;
    return onSnapshot(
      ticketRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onChange(null);
          return;
        }
        onChange(mapTicketFromData({ id: snapshot.id, ...snapshot.data() }));
      },
      (error) => onError?.(error),
    );
  })();

  return () => {
    cancelled = true;
  };
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  note?: string,
  assignedTo?: string | null,
) {
  if (!ensureFirebase()) {
    return { ok: false, error: "Firebase is not configured." };
  }
  const user = ensureUser();
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    status,
    updatedAt: now,
    timeline: arrayUnion({
      status,
      at: now,
      by: user?.uid,
      note,
    }),
  };
  if (assignedTo !== undefined) {
    payload.assignedTo = assignedTo;
  }
  const firestore = db as Firestore;
  await updateDoc(doc(firestore, TICKET_COLLECTION, ticketId), payload);
  return { ok: true };
}

export async function assignTicketToSelf(ticketId: string) {
  const user = ensureUser();
  if (!user) {
    return { ok: false, error: "Authentication is required." };
  }
  return updateTicketStatus(ticketId, "CHECKING", undefined, user.uid);
}

export async function getTicketById(ticketId: string) {
  if (!ensureFirebase()) {
    return { ok: false, error: "Firebase is not configured." };
  }
  const firestore = db as Firestore;
  const snap = await getDoc(doc(firestore, TICKET_COLLECTION, ticketId));
  if (!snap.exists()) {
    return { ok: false, error: "Ticket not found." };
  }
  return { ok: true, data: mapTicketFromData({ id: snap.id, ...snap.data() }) };
}

export function mapTicketFromData(data: Record<string, unknown>): Ticket {
  return {
    id: String(data.id ?? ""),
    readableNo: String(data.readableNo ?? ""),
    userId: String(data.userId ?? ""),
    title: String(data.title ?? ""),
    category: String(data.category ?? ""),
    description: String(data.description ?? ""),
    vehicleId: data.vehicleId ? String(data.vehicleId) : undefined,
    repairDate: data.repairDate ? String(data.repairDate) : undefined,
    attachments: (data.attachments as TicketAttachment[]) ?? [],
    status: (data.status as TicketStatus) ?? "NEW",
    assignedTo: (data.assignedTo as string | null | undefined) ?? null,
    timeline: (data.timeline as Ticket["timeline"]) ?? [],
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? ""),
  };
}
