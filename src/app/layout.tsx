import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PaperPortfolioProvider } from "@/lib/portfolio-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TradeX — Indian Market Intelligence",
  description: "Research terminal for tracking the full Indian listed universe and surfacing early business-trajectory change.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex h-full min-h-screen bg-background text-foreground">
        <TooltipProvider delay={150}>
          <PaperPortfolioProvider>
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <TopBar />
              <main className="flex-1 overflow-y-auto px-4 py-5 lg:px-6 lg:py-6">
                <div className="mx-auto w-full max-w-[1600px]">{children}</div>
              </main>
            </div>
          </PaperPortfolioProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
