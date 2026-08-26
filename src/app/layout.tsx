import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "GZFieldOne",
    template: "%s | GZFieldOne",
  },
  description:
    "A powerful CRM for marketing teams to manage leads, follow-ups, and client conversions.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jakarta.variable} font-jakarta antialiased`}>
        {children}
        <Toaster position="top-right" richColors closeButton duration={4000} />
      </body>
    </html>
  );
}