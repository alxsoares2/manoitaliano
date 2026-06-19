import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import MetaPixel from "@/components/MetaPixel";

const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Basílico Pizzas | Pizzaria Premium em João Pessoa",
  description:
    "Cardápio Basílico Pizzas — pizzas artesanais, entradas e doces. Peça online com entrega em João Pessoa/PB.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <MetaPixel />
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
