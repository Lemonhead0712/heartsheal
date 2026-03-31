import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HeartsHeal — Your Space for Healing",
    short_name: "HeartsHeal",
    description: "A safe, calming space for emotional healing, guided breathing, reflective journaling, and personal growth.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f5",
    theme_color: "#c9607a",
    orientation: "portrait",
    categories: ["health", "lifestyle", "medical"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  }
}
