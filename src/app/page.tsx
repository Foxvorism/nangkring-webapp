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

export default function Dashboard() {
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    const res = await fetch("http://127.0.0.1:8000/logs");
    const data = await res.json();
    setLogs(data);
  };

  useEffect(() => {
    fetchLogs(); // Load data awal

    const socket = new WebSocket("ws://127.0.0.1:8000/ws");

    socket.onmessage = (event) => {
      if (event.data === "update_data") {
        fetchLogs(); // Ambil data baru secara otomatis
      }
    };

    return () => socket.close();
  }, []);

  return (
    <main className="p-10 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            NAngkrIng Dashboard
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
