import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Family Chat",
    short_name: "Family Chat",
    description: "Chat privado da família — mensagens, fotos, áudios, vídeos e localização em tempo real.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0b141a",
    theme_color: "#008069",
    lang: "pt-BR",
    categories: ["social", "communication"],
    icons: [
      { src: "/icons/icon-72.png", sizes: "72x72", type: "image/png", purpose: "any" },
      { src: "/icons/icon-96.png", sizes: "96x96", type: "image/png", purpose: "any" },
      { src: "/icons/icon-128.png", sizes: "128x128", type: "image/png", purpose: "any" },
      { src: "/icons/icon-144.png", sizes: "144x144", type: "image/png", purpose: "any" },
      { src: "/icons/icon-152.png", sizes: "152x152", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
