import "./globals.css";
import { CartProvider } from "./context/CartContext";
import ChatWidget from "./components/ChatWidget";
import { Playfair_Display, Inter } from "next/font/google";
import AmplifyConfig from "./components/AmplifyConfig";
import ConditionalLayout from "./components/ConditionalLayout";
import { LanguageProvider } from "../context/LanguageContext";
import Header from "./components/Header";
import Footer from "./components/Footer";

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "Aureate Forest | Premium Saxophone Boutique",
  description: "Nhạc cụ Saxophone chính hãng cao cấp - Aureate Forest. Trải nghiệm âm thanh tuyệt hảo với dịch vụ bảo hành uy tín.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={`${inter.variable} ${playfair.variable}`}>
        <AmplifyConfig>
          <LanguageProvider>
            <CartProvider>
              <ConditionalLayout
                header={<Header />}
                chatWidget={<ChatWidget />}
                footer={<Footer />}
              >
                {children}
              </ConditionalLayout>
            </CartProvider>
          </LanguageProvider>
        </AmplifyConfig>
      </body>
    </html>
  );
}