// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Web3 Trend Desk",
  description: "Trends do mercado web3 em tempo quase real",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
