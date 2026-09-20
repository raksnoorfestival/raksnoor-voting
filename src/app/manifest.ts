import type { MetadataRoute } from "next";

// What the phone reads when the site is added to the home screen: name,
// icon, colours, and "standalone" so it opens without the browser bar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Raks Noor Festival Voting",
    short_name: "Raks Noor",
    description: "Competition scoring for the Raks Noor Festival.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f8",
    theme_color: "#8b1e3f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
