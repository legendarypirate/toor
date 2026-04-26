// app/layout.tsx
import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from './context/AuthContext';
import ReOrderHandler from './components/ReOrderHandler';

const nunito = Nunito({
  subsets: ["latin", "cyrillic"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TOOR.MN",
    template: "%s | TOOR.MN"
  },
  description: "E-commerce app",
  icons: {
    icon: [
      { url: "/toor_logo.png", type: "image/png" },
    ],
    shortcut: "/toor_logo.png",
    apple: "/toor_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" className={nunito.variable}>
      <body className={nunito.className}>
        <AuthProvider>
          <CartProvider>
            <ReOrderHandler />
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}