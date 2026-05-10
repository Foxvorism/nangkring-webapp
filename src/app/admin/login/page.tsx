"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { setCookie } from "cookies-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setCookie("token", data.access_token, {
          maxAge: 60 * 60 * 24,
          path: "/",
        });
        // localStorage.setItem("token", data.access_token);
        toast.success("Login Berhasil");
        router.push("/admin/dashboard");
      } else {
        toast.error("Login Gagal", { description: data.detail });
      }
    } catch (error) {
      toast.error("Kesalahan Jaringan", {
        description: "Gagal terhubung ke server.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background-color">
      {/* SISI KIRI: Gambar (Tersembunyi di Mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <Image
          src="/images/login-bg.jpg" // Ganti dengan path gambar Anda
          alt="Parking Gate"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-primary-color/20 backdrop-blur-[2px]" />
      </div>

      {/* SISI KANAN: Form Login */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md space-y-8 text-center">
          {/* Logo & Maskot */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 relative bg-white rounded-xl shadow-sm p-2">
              <Image
                src="/images/reyna.jpg"
                alt="Logo"
                fill
                className="object-contain p-2"
              />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-text-color uppercase italic">
              N<span className="text-secondary-color">A</span>ngkr
              <span className="text-secondary-color">I</span>ng
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 text-left">
            <div className="space-y-2">
              <label className="text-[16px] font-semibold text-text-color ml-2.5">
                Username
              </label>
              <Input
                type="text"
                placeholder="Enter your username here"
                className="bg-quaternary-color border-muted-color focus:ring-primary-color px-7 py-5 text-xxl mt-2.5"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUsername(e.target.value)
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[16px] font-semibold text-text-color ml-2.5 ">
                Password
              </label>
              <Input
                type="password"
                placeholder="Enter your password here"
                className="bg-quaternary-color border-muted-color focus:ring-primary-color px-7 py-5 text-xxl mt-2.5"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-primary-color hover:bg-secondary-color text-quaternary-color text-lg font-bold transition-all"
              disabled={isLoading}
            >
              {isLoading ? "Authenticating..." : "Login"}
            </Button>
          </form>

          <p className="text-[12px] text-muted-color font-semibold">
            © 2026 Team 14 of Computer Vision Lecture - SPPG Ngawi. <br /> All
            rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
