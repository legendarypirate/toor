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
    default: "Outdoor World",
    template: "%s | Outdoor World"
  },
  description: "E-commerce app",
  icons: {
    icon: [
      { url: "/outlogo.png", type: "image/png" },
    ],
    shortcut: "/outlogo.png",
    apple: "/outlogo.png",
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