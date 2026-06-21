import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { QEAssistant } from "@/components/public/qe-assistant";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Technical Consultancy — Operations",
  description:
    "BIS licensing, ISO accreditation, testing, calibration, clients, and finance.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  let theme = cookieStore.get("theme")?.value;

  if (!theme) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("app_settings")
        .select("app_theme")
        .eq("id", 1)
        .maybeSingle();
      theme = data?.app_theme || "system";
    } catch {
      theme = "system";
    }
  }

  const isDark = theme === "dark";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} h-full antialiased ${isDark ? "dark" : ""}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = ${JSON.stringify(theme)};
                if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col gap-0">
        {children}
        <QEAssistant />
      </body>
    </html>
  );
}
