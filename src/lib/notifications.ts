import { supabase } from "@/integrations/supabase/client";

type NotificationInput = {
  userId: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
};

const createUuid = () => {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
};

export async function createAppNotification({ userId, title, message, type = "info", link = "" }: NotificationInput) {
  const now = new Date().toISOString();
  return supabase.from("notifications").insert({
    id: createUuid(),
    user_id: userId,
    title,
    message,
    type,
    link,
    is_read: false,
    created_at: now,
    updated_at: now,
  });
}
