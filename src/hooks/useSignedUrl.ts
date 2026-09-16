"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { getSignedAttachmentUrl } from "@/lib/messages";

export function useSignedUrl(storagePath: string | undefined) {
  const { supabase } = useSupabase();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath) return;
    let active = true;
    getSignedAttachmentUrl(supabase, storagePath).then((signed) => {
      if (active) setUrl(signed);
    });
    return () => {
      active = false;
    };
  }, [storagePath, supabase]);

  return url;
}
