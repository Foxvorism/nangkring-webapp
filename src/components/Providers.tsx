"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" storageKey="theme">
      <Toaster position="top-center" richColors />
      {children}
    </ThemeProvider>
  );
}
