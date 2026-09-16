"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import type { Profile } from "@/lib/types";

export function useProfiles() {
  const { supabase, user } = useSupabase();
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .neq("id", user.id)
      .order("display_name")
      .then(({ data }) => setProfiles((data as Profile[]) ?? []));
  }, [supabase, user]);

  return profiles;
}
