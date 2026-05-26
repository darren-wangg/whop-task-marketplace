import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Header } from "@/components/header/Header";
import { getThemePrefs } from "@/server/theme";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Whop Tasks",
  description: "A task marketplace inspired by Whop. Earn by completing real work.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getThemePrefs();

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      data-appearance={theme.appearance}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider appearance={theme.appearance} accent={theme.accent}>
          <Header />
          <main className="flex-1">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
