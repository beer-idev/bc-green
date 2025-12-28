"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, getDoc, type Firestore } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth/auth-provider";
import { useI18n } from "@/components/i18n-provider";
import { showErrorAlert, showSuccessAlert } from "@/lib/alerts";
import { db, isFirebaseConfigured } from "@/lib/firebase/client";
import { vehicles } from "@/data/vehicles";
import { createTicket } from "@/services/tickets";

const ticketSchema = z.object({
  repairDate: z.string().min(1, "Please select a date."),
  vehicleId: z.string().min(1, "Please select a vehicle."),
  description: z.string().min(5, "Please add more details."),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

export default function TicketForm() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string>("");
  const [addressReady, setAddressReady] = useState(false);
  const [addressChecked, setAddressChecked] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      repairDate: "",
      vehicleId: vehicles[0]?.id ?? "",
      description: "",
    },
  });

  useEffect(() => {
    let cancelled = false;
    async function checkAddress() {
      if (!user || !db || !isFirebaseConfigured) {
        if (!cancelled) {
          setAddressReady(false);
          setAddressChecked(true);
        }
        return;
      }
        try {
          const firestore = db as Firestore;
          const snap = await getDoc(doc(firestore, "users", user.uid));
        const data = snap.data() as
          | {
              address?: {
                line1?: string;
                district?: string;
                province?: string;
                zip?: string;
              };
            }
          | undefined;
        const address = data?.address;
        const hasAddress =
          !!address &&
          [address.line1, address.district, address.province, address.zip].every(
            (value) => typeof value === "string" && value.trim().length > 0,
          );
        if (!cancelled) {
          setAddressReady(hasAddress);
          setAddressChecked(true);
        }
      } catch {
        if (!cancelled) {
          setAddressReady(false);
          setAddressChecked(true);
        }
      }
    }
    void checkAddress();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const onSubmit = async (values: TicketFormValues) => {
    setMessage("");
    setProgress(0);
    if (!addressReady) {
      const text =
        lang === "th"
          ? "กรุณากรอกที่อยู่ในโปรไฟล์ก่อนแจ้งซ่อม"
          : "Please update your address before submitting a ticket.";
      setMessage(text);
      await showErrorAlert({ title: "Error", text });
      return;
    }
    const selectedVehicle =
      vehicles.find((vehicle) => vehicle.id === values.vehicleId) ?? vehicles[0];
    const title = selectedVehicle?.name ?? values.vehicleId;
    const result = await createTicket(
      {
        title,
        category: "repair",
        description: values.description,
        vehicleId: values.vehicleId,
        repairDate: values.repairDate,
      },
      files,
      setProgress,
    );
    if (result.ok) {
      await showSuccessAlert({ title: t("ticket.success") });
      reset();
      setFiles([]);
      setProgress(0);
      router.push(`/tickets/${result.id}`);
      return;
    }
    const errorText =
      result.error ?? (lang === "th" ? "ส่งคำร้องไม่สำเร็จ" : "Submit failed.");
    setMessage(errorText);
    await showErrorAlert({ title: "Error", text: errorText });
  };

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[--text-strong]">
          {t("ticket.formTitle")}
        </h3>
        <p className="text-sm text-[--text-soft]">{t("ticket.formHint")}</p>
      </div>
      <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[--text-mid]">
            {lang === "th" ? "วันที่แจ้งซ่อม" : "Repair date"}
          </label>
          <Input type="date" {...register("repairDate")} />
          {errors.repairDate ? (
            <p className="text-xs text-rose-600">{errors.repairDate.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[--text-mid]">
            {lang === "th" ? "รายการที่ซ่อม" : "Vehicle"}
          </label>
          <Select {...register("vehicleId")}>
            {vehicles.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          {errors.vehicleId ? (
            <p className="text-xs text-rose-600">{errors.vehicleId.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[--text-mid]">
            {lang === "th" ? "สาเหตุที่แจ้งซ่อม" : "Issue detail"}
          </label>
          <Textarea
            {...register("description")}
            placeholder={
              lang === "th"
                ? "อธิบายรายละเอียด อาการ และข้อมูลเพิ่มเติมที่เกี่ยวข้อง"
                : "Describe the issue, when it happens, and any extra context."
            }
            rows={5}
          />
          {errors.description ? (
            <p className="text-xs text-rose-600">{errors.description.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[--text-mid]">
            {t("fields.attachments")}
          </label>
          <Input
            type="file"
            multiple
            onChange={(event) =>
              setFiles(Array.from(event.target.files ?? []))
            }
          />
          {files.length ? (
            <div className="text-xs text-[--text-soft]">
              {files.map((file) => file.name).join(", ")}
            </div>
          ) : null}
          {progress > 0 ? (
            <div className="space-y-1">
              <div className="text-xs text-[--text-soft]">
                {t("actions.uploading")} {progress}%
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
        {addressChecked && !addressReady ? (
          <p className="text-sm text-rose-600">
            {lang === "th"
              ? "กรุณากรอกที่อยู่ในโปรไฟล์ก่อนแจ้งซ่อม"
              : "Please update your address before submitting a ticket."}
          </p>
        ) : null}
        {message ? <p className="text-sm text-rose-600">{message}</p> : null}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting || (addressChecked && !addressReady)}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isSubmitting ? "..." : t("actions.submit")}
          </Button>
          <Button
            type="button"
            variant="danger"
            className="bg-rose-600 text-white hover:bg-rose-700"
            onClick={() => {
              reset();
              setFiles([]);
              setMessage("");
            }}
          >
            {t("actions.cancel")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
