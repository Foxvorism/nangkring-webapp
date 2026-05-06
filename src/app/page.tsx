"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "sonner";

export default function Dashboard() {
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    const res = await fetch("http://localhost:8000/logs");
    const data = await res.json();
    setLogs(data);
  };

  useEffect(() => {
    let socket: WebSocket;
    let isUnmounting = false;
    fetchLogs();

    const connectWS = () => {
      socket = new WebSocket("ws://localhost:8000/ws");

      socket.onopen = () => {
        console.log("Terhubung ke Server nAngkrIng");
        toast.success("WebSocket Terhubung", {
          description: "Koneksi real-time ke server berhasil dibuka.",
        });
      };

      socket.onmessage = (event) => {
        let wsEvent = "update_data";
        let plateNumber = "";

        try {
          const payload = JSON.parse(event.data);
          wsEvent = payload.event ?? "update_data";
          plateNumber = payload.plate_number ?? "";
        } catch {
          wsEvent = event.data;
        }

        fetchLogs();

        if (wsEvent === "VEHICLE_ENTRY") {
          toast.info("Kendaraan Masuk", {
            description: plateNumber
              ? `${plateNumber} berhasil masuk ke area parkir.`
              : "Kendaraan berhasil masuk ke area parkir.",
          });
          return;
        }

        if (wsEvent === "VEHICLE_EXIT") {
          toast.info("Kendaraan Keluar", {
            description: plateNumber
              ? `${plateNumber} berhasil keluar dari area parkir.`
              : "Kendaraan berhasil keluar dari area parkir.",
          });
          return;
        }

        toast.success("Aktivitas Baru Terdeteksi", {
          description: "Data log parkir telah diperbarui secara otomatis.",
        });
      };

      socket.onclose = () => {
        if (isUnmounting) {
          return;
        }

        console.log("Koneksi terputus, mencoba menyambung kembali...");
        toast.warning("WebSocket Terputus", {
          description: "Mencoba menyambung ulang dalam 3 detik.",
        });
        setTimeout(connectWS, 3000); // Coba lagi dalam 3 detik
      };

      socket.onerror = (err) => {
        console.error("WebSocket Error:", err);
        toast.error("WebSocket Error", {
          description: "Terjadi masalah koneksi ke server real-time.",
        });
      };
    };

    connectWS();

    // Tambahan: Refresh otomatis saat operator kembali membuka tab nAngkrIng
    const handleFocus = () => {
      console.log("Operator kembali, menyegarkan data...");
      fetchLogs();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      isUnmounting = true;
      socket.close();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    <main className="p-10 bg-slate-50 min-h-screen">
      <Toaster position="top-center" richColors />
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            nAngkrIng Dashboard
          </h1>
          <Button onClick={fetchLogs}>Refresh Data</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Log Parkir Real-time</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plat Nomor</TableHead>
                  <TableHead>Waktu Masuk</TableHead>
                  <TableHead>Waktu Keluar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Biaya</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium uppercase">
                      {log.plate_number}
                    </TableCell>
                    <TableCell>
                      {new Date(log.entry_time).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell>
                      {log.exit_time
                        ? new Date(log.exit_time).toLocaleString("id-ID")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={log.status === "IN" ? "default" : "secondary"}
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      Rp {log.total_amount.toLocaleString("id-ID")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
