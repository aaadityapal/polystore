import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PolyStore Dashboard",
  description: "Next-generation distributed storage interface.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
