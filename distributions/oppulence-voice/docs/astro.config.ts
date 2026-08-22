import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://docs.oppulence.io",
  integrations: [
    starlight({
      title: "Oppulence Voice",
      description: "Private voice capture that feeds Rowboat relationship memory.",
      customCss: ["./src/styles/custom.css"],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/Oppulence-Engineering/openwhispr",
        },
      ],
      sidebar: [
        { label: "Overview", slug: "index" },
        {
          label: "Get started",
          items: [
            { label: "Install and run", slug: "getting-started" },
            { label: "Local backend stack", slug: "local-stack" },
          ],
        },
        {
          label: "Cloud and data",
          items: [
            { label: "Authentication and sync", slug: "cloud-sync" },
            { label: "Privacy and encryption", slug: "privacy" },
            { label: "Rowboat handoff", slug: "rowboat-handoff" },
          ],
        },
        {
          label: "Developers",
          items: [
            { label: "API", slug: "api" },
            { label: "Troubleshooting", slug: "troubleshooting" },
          ],
        },
      ],
    }),
  ],
});
