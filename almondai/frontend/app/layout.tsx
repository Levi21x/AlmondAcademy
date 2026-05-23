import { Bricolage_Grotesque, DM_Sans } from 'next/font/google'
import type { Metadata } from "next";

import { Providers } from "./providers";

import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--bricolage-grotesque',
  display: 'swap',
})

const geist = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--geist',
  display: 'swap',
})

const themeInitScript = `(() => {
  try {
    const key = "almond-theme";
    const stored = localStorage.getItem(key);
    const theme = stored === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  } catch (_) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();`;

export const metadata: Metadata = {
  title: "AlmondAI",
  description: "Your smartest friend who knows all of medicine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${bricolage.variable} ${geist.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=optional"
        />
      </head>
      <body className="bg-background text-on-surface antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
