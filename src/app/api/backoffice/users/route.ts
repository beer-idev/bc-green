import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UserPayload = {
  uid?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  role?: "user" | "technician" | "admin";
  password?: string;
};

async function hasSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  return !!session?.value;
}

function validateRole(role?: string) {
  return role === "user" || role === "technician" || role === "admin";
}

export async function POST(request: Request) {
  if (!(await hasSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  let payload: UserPayload;
  try {
    payload = (await request.json()) as UserPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (!payload.email || !payload.password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }
  if (!validateRole(payload.role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  try {
    const auth = await getAdminAuth();
    const db = await getAdminDb();
    const userRecord = await auth.createUser({
      email: payload.email.trim(),
      password: payload.password,
      displayName: payload.displayName?.trim() || undefined,
    });
    const now = new Date().toISOString();
    await db.collection("users").doc(userRecord.uid).set({
      displayName: payload.displayName?.trim() || "",
      email: payload.email.trim(),
      phone: payload.phone?.trim() || "",
      role: payload.role,
      address: { line1: "", district: "", province: "", zip: "" },
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ ok: true, uid: userRecord.uid });
  } catch (error) {
    console.error("[api/backoffice/users] POST error", error);
    const message =
      error instanceof Error ? error.message : "Unable to create user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await hasSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  let payload: UserPayload;
  try {
    payload = (await request.json()) as UserPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (!payload.uid) {
    return NextResponse.json({ error: "Missing UID." }, { status: 400 });
  }
  if (payload.role && !validateRole(payload.role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  try {
    const auth = await getAdminAuth();
    const db = await getAdminDb();
    if (payload.email || payload.password || payload.displayName) {
      await auth.updateUser(payload.uid, {
        email: payload.email?.trim(),
        password: payload.password,
        displayName: payload.displayName?.trim(),
      });
    }
    const now = new Date().toISOString();
    await db
      .collection("users")
      .doc(payload.uid)
      .set(
        {
          displayName: payload.displayName?.trim(),
          email: payload.email?.trim(),
          phone: payload.phone?.trim(),
          role: payload.role,
          updatedAt: now,
        },
        { merge: true },
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/backoffice/users] PATCH error", error);
    const message =
      error instanceof Error ? error.message : "Unable to update user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
