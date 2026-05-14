"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import ThemeToggle from "@/components/ThemeToggle";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" storageKey="theme">
      <Toaster position="top-right" richColors />
      <ThemeToggle />
      {children}
    </ThemeProvider>
  );
}
