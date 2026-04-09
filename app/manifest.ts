import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Haven — Your Space for Healing",
    short_name: "Haven",
    description: "A safe, calming space for emotional healing, guided breathing, reflective journaling, and personal growth.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f5",
    theme_color: "#c9607a",
    orientation: "portrait",
    categories: ["health", "lifestyle", "medical"],
    icons: [
      {
        src: "/havenlogo.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/havenlogo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/havenlogo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  }
}
