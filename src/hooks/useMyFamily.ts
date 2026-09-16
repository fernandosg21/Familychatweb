"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";

interface MyFamily {
  id: string;
  name: string;
  member_count: number;
  pending_count: number;
}

export function useMyFamily() {
  const { supabase, user } = useSupabase();
  const [family, setFamily] = useState<MyFamily | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase
      .rpc("get_my_family")
      .single()
      .then(({ data }) => {
        if (active) setFamily((data as MyFamily) ?? null);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [supabase, user]);

  return { family, loading };
}
