"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, type Firestore } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/components/i18n-provider";
import { db, isFirebaseConfigured } from "@/lib/firebase/client";
import { formatDateTime } from "@/lib/format";
import type { UserProfile } from "@/types/user";

type UserRole = NonNullable<UserProfile["role"]>;

type UserRow = UserProfile & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};

type UserForm = {
  displayName: string;
  email: string;
  phone: string;
  role: UserRole;
  password: string;
  confirmPassword: string;
};

const emptyForm: UserForm = {
  displayName: "",
  email: "",
  phone: "",
  role: "technician",
  password: "",
  confirmPassword: "",
};

const roleLabels: Record<UserRole, { th: string; en: string }> = {
  user: { th: "ผู้ใช้", en: "User" },
  technician: { th: "ช่าง", en: "Technician" },
  admin: { th: "แอดมิน", en: "Admin" },
};

export default function UserManager() {
  const { lang } = useI18n();
  const [items, setItems] = useState<UserRow[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!db || !isFirebaseConfigured) {
      setMessage(
        lang === "th"
          ? "Firebase ยังไม่พร้อมใช้งาน"
          : "Firebase is not configured.",
      );
      return;
    }
    const firestore = db as Firestore;
    const userQuery = query(
      collection(firestore, "users"),
      orderBy("updatedAt", "desc"),
    );
    const unsubscribe = onSnapshot(
      userQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<UserRow, "id">),
        }));
        setItems(data);
      },
      (err) => {
        setMessage(err.message);
      },
    );
    return () => unsubscribe();
  }, [lang]);

  const handleSave = async () => {
    if (!db || !isFirebaseConfigured) {
      setMessage(
        lang === "th"
          ? "Firebase ยังไม่พร้อมใช้งาน"
          : "Firebase is not configured.",
      );
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const email = form.email.trim();
      const name = form.displayName.trim();
      const phone = form.phone.trim();
      const isEditing = Boolean(editingId);
      if (!email) {
        setMessage(
          lang === "th"
            ? "กรุณาใส่อีเมลผู้ใช้"
            : "Please provide an email address.",
        );
        setSaving(false);
        return;
      }
      if (!isEditing) {
        if (!form.password) {
          setMessage(
            lang === "th"
              ? "กรุณาใส่รหัสผ่าน"
              : "Please provide a password.",
          );
          setSaving(false);
          return;
        }
        if (form.password !== form.confirmPassword) {
          setMessage(
            lang === "th"
              ? "รหัสผ่านไม่ตรงกัน"
              : "Passwords do not match.",
          );
          setSaving(false);
          return;
        }
      }

      const response = await fetch("/api/backoffice/users", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: editingId ?? undefined,
          displayName: name,
          email,
          phone,
          role: form.role,
          password: form.password || undefined,
        }),
      });
      let data: { error?: string } = {};
      try {
        data = (await response.json()) as { error?: string };
      } catch {
        // Ignore JSON parse errors – handle via status below.
      }
      if (!response.ok) {
        throw new Error(data.error || response.statusText || "Unable to save user.");
      }
      setForm(emptyForm);
      setEditingId(null);
      setModalOpen(false);
      setMessage(lang === "th" ? "บันทึกข้อมูลผู้ใช้แล้ว" : "User saved.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unable to save user.";
      setMessage(text);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user: UserRow) => {
    setEditingId(user.id);
    setForm({
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      role: user.role ?? "user",
      password: "",
      confirmPassword: "",
    });
    setModalOpen(true);
  };

  const handleClear = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
  };

  const rows = useMemo(() => items, [items]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[--text-strong]">
          {lang === "th" ? "จัดการผู้ใช้" : "User management"}
        </div>
        <Button onClick={() => setModalOpen(true)}>
          {lang === "th" ? "เพิ่มผู้ใช้" : "Add user"}
        </Button>
      </div>

      <Card className="space-y-3 overflow-hidden">
        <div className="text-sm font-semibold text-[--text-strong]">
          {lang === "th" ? "รายการผู้ใช้" : "User list"}
        </div>
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="min-w-[720px] table-auto text-xs sm:w-full sm:min-w-0 sm:text-sm">
            <thead>
              <tr className="text-left text-xs text-[--text-soft]">
                <th className="pb-2 whitespace-nowrap">UID</th>
                <th className="pb-2 whitespace-nowrap">{lang === "th" ? "ชื่อ" : "Name"}</th>
                <th className="pb-2 whitespace-nowrap">{lang === "th" ? "อีเมล" : "Email"}</th>
                <th className="pb-2 whitespace-nowrap">{lang === "th" ? "เบอร์โทร" : "Phone"}</th>
                <th className="pb-2 whitespace-nowrap">{lang === "th" ? "สิทธิ์" : "Role"}</th>
                <th className="pb-2 whitespace-nowrap">{lang === "th" ? "อัปเดต" : "Updated"}</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <tr key={user.id} className="border-t border-emerald-100">
                  <td className="py-2 pr-3 text-xs text-[--text-soft]">
                    {user.id}
                  </td>
                  <td className="py-2 pr-3">{user.displayName || "-"}</td>
                  <td className="py-2 pr-3">{user.email || "-"}</td>
                  <td className="py-2 pr-3">{user.phone || "-"}</td>
                  <td className="py-2 pr-3">
                    {user.role
                      ? lang === "th"
                        ? roleLabels[user.role].th
                        : roleLabels[user.role].en
                      : "-"}
                  </td>
                  <td className="py-2 pr-3 text-xs text-[--text-soft]">
                    {user.updatedAt ? formatDateTime(user.updatedAt) : "-"}
                  </td>
                  <td className="py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(user)}
                    >
                      {lang === "th" ? "แก้ไข" : "Edit"}
                    </Button>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-3 text-xs text-[--text-soft]"
                  >
                    {lang === "th" ? "ยังไม่มีผู้ใช้" : "No users found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[--text-strong]">
                {lang === "th" ? "เพิ่ม/แก้ไขผู้ใช้" : "Add / edit user"}
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-[--text-soft]"
                onClick={() => setModalOpen(false)}
              >
                {lang === "th" ? "ปิด" : "Close"}
              </button>
            </div>
            <Input
              value={form.displayName}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  displayName: event.target.value,
                }))
              }
              placeholder={lang === "th" ? "ชื่อผู้ใช้" : "Display name"}
            />
            <Input
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder={lang === "th" ? "อีเมล" : "Email"}
            />
            <Input
              value={form.phone}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, phone: event.target.value }))
              }
              placeholder={lang === "th" ? "เบอร์โทร" : "Phone"}
            />
            <Input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              placeholder={lang === "th" ? "รหัสผ่าน" : "Password"}
            />
            <Input
              type="password"
              value={form.confirmPassword}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  confirmPassword: event.target.value,
                }))
              }
              placeholder={lang === "th" ? "ยืนยันรหัสผ่าน" : "Confirm password"}
            />
            <Select
              value={form.role}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  role: event.target.value as UserRole,
                }))
              }
            >
              {Object.keys(roleLabels).map((role) => {
                const key = role as UserRole;
                return (
                  <option key={role} value={role}>
                    {lang === "th" ? roleLabels[key].th : roleLabels[key].en}
                  </option>
                );
              })}
            </Select>
            {message ? (
              <div className="text-xs text-emerald-700">{message}</div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "..." : lang === "th" ? "บันทึก" : "Save"}
              </Button>
              <Button variant="outline" onClick={handleClear}>
                {lang === "th" ? "ล้างฟอร์ม" : "Clear"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
