export type MessageType = "text" | "image" | "video" | "audio" | "document" | "location";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  status: string;
  last_seen_at: string;
  created_at: string;
  family_id: string | null;
  family_role: "admin" | "member";
  approval_status: "pending" | "approved";
  birth_date: string | null;
  is_adult: boolean;
  username: string | null;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string | null;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  last_message_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  last_read_at: string;
  profile?: Profile;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  storage_path: string;
  mime_type: string;
  file_name: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
}

export interface LocationMetadata {
  lat: number;
  lng: number;
  label?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: MessageType;
  body: string | null;
  metadata: Record<string, unknown>;
  reply_to_id: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  sender?: Profile;
  attachments?: MessageAttachment[];
}

export interface ConversationWithMeta extends Conversation {
  participants: ConversationParticipant[];
  last_message?: Message;
  unread_count: number;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_label: string | null;
  created_at: string;
}
