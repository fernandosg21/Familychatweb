import type { SupabaseClient } from "@supabase/supabase-js";
import { isAudio, isImage, isVideo, readImageDimensions, readMediaDuration } from "@/lib/media";
import { optimizeImage } from "@/lib/image";
import type { Message, MessageType } from "@/lib/types";

const MESSAGE_SELECT = "*, sender:profiles(id,display_name,avatar_url), attachments:message_attachments(*)";

function mimeToMessageType(mime: string): MessageType {
  if (isImage(mime)) return "image";
  if (isVideo(mime)) return "video";
  if (isAudio(mime)) return "audio";
  return "document";
}

export async function sendTextMessage(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  body: string,
  replyToId?: string | null
) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      type: "text",
      body,
      reply_to_id: replyToId ?? null,
    })
    .select(MESSAGE_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as Message;
}

export async function sendLocationMessage(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  lat: number,
  lng: number,
  label?: string
) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      type: "location",
      metadata: { lat, lng, label: label ?? null },
    })
    .select(MESSAGE_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as Message;
}

export async function sendFileMessage(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  rawFile: File,
  caption?: string
) {
  const type = mimeToMessageType(rawFile.type);
  const file = type === "image" ? await optimizeImage(rawFile) : rawFile;

  const { data: message, error: messageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      type,
      body: caption || null,
    })
    .select(MESSAGE_SELECT)
    .single();

  if (messageError || !message) throw messageError;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${conversationId}/${message.id}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    await supabase.from("messages").delete().eq("id", message.id);
    throw uploadError;
  }

  let width: number | null = null;
  let height: number | null = null;
  let duration: number | null = null;

  if (type === "image") {
    const dims = await readImageDimensions(file);
    width = dims.width || null;
    height = dims.height || null;
  } else if (type === "video" || type === "audio") {
    duration = (await readMediaDuration(file, type)) || null;
  }

  const { error: attachmentError } = await supabase.from("message_attachments").insert({
    message_id: message.id,
    storage_path: storagePath,
    mime_type: file.type || "application/octet-stream",
    file_name: file.name,
    size_bytes: file.size,
    width,
    height,
    duration_seconds: duration,
  });

  if (attachmentError) throw attachmentError;

  return message as unknown as Message;
}

export async function getSignedAttachmentUrl(supabase: SupabaseClient, storagePath: string) {
  const { data, error } = await supabase.storage
    .from("attachments")
    .createSignedUrl(storagePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
