"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteCookie } from "cookies-next";
import { toast } from "sonner";
import { LogOut, Car, Bike, ClipboardList, ArrowRightLeft } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminLandingPage() {
  const router = useRouter();

  const handleLogout = () => {
    deleteCookie("token");
    toast.info("Berhasil Logout", {
      description: "Sesi Anda telah berakhir.",
    });
    router.push("/admin/login");
  };

  const menuButtons = [
    {
      label: "Gate-In (Motorbike)",
      icon: <Bike className="w-5 h-5" />,
      href: "/admin/dashboard/gate-in?type=motorbike",
    },
    {
      label: "Gate-Out (Motorbike)",
      icon: <Bike className="w-5 h-5" />,
      href: "/admin/dashboard/gate-out?type=motorbike",
    },
    {
      label: "Gate-In (Car)",
      icon: <Car className="w-5 h-5" />,
      href: "/admin/dashboard/gate-in?type=car",
    },
    {
      label: "Gate-Out (Car)",
      icon: <Car className="w-5 h-5" />,
      href: "/admin/dashboard/gate-out?type=car",
    },
    {
      label: "Parking Log",
      icon: <ClipboardList className="w-5 h-5" />,
      href: "/admin/dashboard/logs",
    },
  ];

  return (
    <main className="min-h-screen bg-background-color flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl flex flex-col items-center space-y-8 text-center">
        {/* Logo & Avatar */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-32 h-32 relative bg-quaternary-color rounded-2xl shadow-sm p-2">
            <Image
              src="/images/reyna.jpg"
              alt="Mascot"
              fill
              className="object-contain p-2"
            />
          </div>
          <div className="flex md:flex-row justify-center items-center md:items-center">
            <h1 className="text-[48px] text-text-color">
              N<span className="text-secondary-color">A</span>NGKR
              <span className="text-secondary-color">I</span>NG Dashboard
            </h1>
          </div>
        </div>

        {/* Grid Menu - Responsive: 1 kolom di mobile, 2 kolom di tablet ke atas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {menuButtons.map((btn, index) => (
            <Link key={index} href={btn.href} className="w-full">
              <button className="w-full flex items-center justify-center gap-3 bg-quaternary-color border-2 border-primary-color py-4 px-6 rounded-xl text-primary-color font-bold text-lg hover:bg-primary-color hover:text-quaternary-color transition-all duration-200 shadow-sm active:scale-95">
                {btn.icon}
                {btn.label}
              </button>
            </Link>
          ))}

          {/* Logout Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center justify-center gap-3 bg-quaternary-color border-2 border-red-500 py-4 px-6 rounded-xl text-red-500 font-bold text-lg hover:bg-red-500 hover:border-red-500 hover:text-quaternary-color transition-all duration-200 shadow-sm active:scale-95">
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Konfirmasi Logout</AlertDialogTitle>
                <AlertDialogDescription>
                  Apakah Anda yakin ingin logout dari sesi ini?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>
                  Logout
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Footer */}
        <footer className="pt-8">
          <p className="text-[12px] text-muted-color font-semibold tracking-wide">
            © 2026 Team 14 of Computer Vision Lecture - SPPG Ngawi. <br />
            All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}
