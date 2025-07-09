import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { TendermintProvider } from "./context/TendermintListener";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSans3 = Source_Sans_3({
  variable: "--font-source-sans-3",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"], // Add weights you need
});


export const metadata: Metadata = {
  title: "Conspulse - Tendermint Validator Dashboard",
  description: "Conspulse is a real-time dashboard for monitoring Tendermint consensus state, validator stats, and network health. Built by Vitwit.",
  metadataBase: new URL("https://conspulse.vitwit.com"),
  openGraph: {
    title: "Conspulse - Tendermint Validator Dashboard",
    description: "Monitor Tendermint consensus, validator stats, and network health in real time. Built by Vitwit.",
    url: "https://conspulse.vitwit.com",
    siteName: "Conspulse",
    images: [
      {
        url: "/conspulse-logo.svg",
        width: 1200,
        height: 630,
        alt: "Conspulse Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Conspulse - Tendermint Validator Dashboard",
    description: "Monitor Tendermint consensus, validator stats, and network health in real time. Built by Vitwit.",
    site: "@vitwit_",
    creator: "@vitwit_",
    images: [
      "/conspulse-logo.svg"
    ],
  },
  alternates: {
    canonical: "https://conspulse.vitwit.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sourceSans3.variable} antialiased`}
      >
        <TendermintProvider >
          {children}
        </TendermintProvider>
      </body>
    </html>
  );
}
