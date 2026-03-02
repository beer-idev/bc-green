import type { LocalizedText } from "@/types/locale";

export type AnnouncementItem = {
  id: string;
  title: LocalizedText;
  detail: LocalizedText;
  date: string;
  published?: boolean;
  source?: string;
  seed?: boolean;
  createdAt?: string;
  updatedAt?: string;
};
