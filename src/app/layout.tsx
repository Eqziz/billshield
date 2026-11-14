import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "BillShield — Make sense of your internet bill",
    template: "%s · BillShield",
  },
  description:
    "Understand your internet charges, prepare a provider conversation, and track confirmed savings. No signup required.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
