import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "TES · Trinium Energy System" },
      {
        name: "description",
        content: "Interactive 3D simulation of the CIVIS Tech Global Trinium Energy System.",
      },
      { name: "theme-color", content: "#1f4a90" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "CIVIS Tech Global" },
      { property: "og:title", content: "TES · Trinium Energy System" },
      {
        property: "og:description",
        content: "Interactive 3D simulation of the CIVIS Tech Global Trinium Energy System. Reliable power. Recoverable water. Carbon utilization.",
      },
      { property: "og:url", content: "https://tes-reference-simulation.vercel.app/" },
      { property: "og:image", content: "https://tes-reference-simulation.vercel.app/og.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "CIVIS Tech Global Trinium Energy System reference model" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TES · Trinium Energy System" },
      {
        name: "twitter:description",
        content: "Interactive 3D simulation of the CIVIS Tech Global Trinium Energy System.",
      },
      { name: "twitter:image", content: "https://tes-reference-simulation.vercel.app/og.jpg" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;600;700&family=Inter:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
