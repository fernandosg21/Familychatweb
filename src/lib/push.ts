import type { SupabaseClient } from "@supabase/supabase-js";

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function subscribeToPush(supabase: SupabaseClient) {
  if (!("PushManager" in window)) return null;

  // A chave pública vem sempre do mesmo lugar que o servidor usa para
  // assinar os pushes (Vault, via RPC) — nunca de uma env var separada, que
  // poderia divergir e fazer o push ser aceito pelo servidor mas nunca
  // exibido no aparelho.
  const { data: publicKey } = await supabase.rpc("get_vapid_public_key");
  if (!publicKey || typeof publicKey !== "string") return null;

  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = urlBase64ToUint8Array(publicKey);

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    const existingKey = existing.options.applicationServerKey
      ? new Uint8Array(existing.options.applicationServerKey as ArrayBuffer)
      : null;
    const sameKey =
      existingKey !== null &&
      existingKey.length === applicationServerKey.length &&
      existingKey.every((byte, i) => byte === applicationServerKey[i]);
    if (sameKey) return existing;
    // Inscrição antiga usava uma chave diferente da atual — descarta e
    // recria, senão o push continua sendo aceito pelo servidor mas nunca
    // chega no aparelho.
    await existing.unsubscribe();
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
}
