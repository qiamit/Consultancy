import type { Metadata, Viewport } from "next";
import { Outfit, Sora, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { createClient } from "@backend/db/client/server";
import {
  getAppThemeOption,
  normalizeAppTheme,
  type AppThemeValue,
} from "@backend/shared/constants/app-themes";
import { QEAssistant } from "@/components/public/qe-assistant";
import "./globals.css";

/** Primary UI — geometric, modern, readable at larger sizes */
const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

/** Headings / brand accents */
const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Technical Consultancy — Operations",
  description:
    "BIS licensing, ISO accreditation, testing, calibration, clients, and finance.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

function resolveServerDark(theme: AppThemeValue): boolean {
  const option = getAppThemeOption(theme);
  // On the server we cannot know system preference; treat system as light for SSR.
  if (option.mode === "dark") return true;
  return false;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  let themeRaw = cookieStore.get("theme")?.value;

  if (!themeRaw) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("app_settings")
        .select("app_theme")
        .eq("id", 1)
        .maybeSingle();
      themeRaw = data?.app_theme || "system";
    } catch {
      themeRaw = "system";
    }
  }

  const theme = normalizeAppTheme(themeRaw);
  const isDark = resolveServerDark(theme);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme={theme}
      className={`${outfit.variable} ${sora.variable} ${jetbrainsMono.variable} h-full antialiased ${isDark ? "dark" : ""}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var cookieMatch = document.cookie.match(/(?:^|; )theme=([^;]*)/);
                var theme = cookieMatch ? decodeURIComponent(cookieMatch[1]) : ${JSON.stringify(theme)};
                var darkModes = { dark: 1, midnight: 1, ocean: 1, forest: 1, violet: 1 };
                var lightModes = { light: 1, sunrise: 1 };
                var preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var useDark = darkModes[theme] ? true : lightModes[theme] ? false : preferDark;
                document.documentElement.setAttribute('data-theme', theme);
                if (useDark) document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className={`${outfit.className} min-h-full flex flex-col gap-0`}>
        {children}
        <QEAssistant />
      </body>
    </html>
  );
}
