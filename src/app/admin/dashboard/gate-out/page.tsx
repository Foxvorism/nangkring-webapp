"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircleArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function GateOutPage() {
  const searchParams = useSearchParams();
  const vehicleType = searchParams.get("type") || "car";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState("00:00:00");
  const [licensePlate, setLicensePlate] = useState("B1234XYZ");
  const [gateStatus, setGateStatus] = useState("Closed");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<
    Array<{ deviceId: string; label: string }>
  >([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [parkingLogs, setParkingLogs] = useState<any[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const loadCameraDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(
      (device) => device.kind === "videoinput",
    );

    setCameraDevices(
      videoInputs.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
      })),
    );

    setSelectedDeviceId((currentDeviceId) => {
      if (currentDeviceId) {
        return currentDeviceId;
      }

      return videoInputs[0]?.deviceId || "";
    });
  };

  const startCamera = async (deviceId?: string) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Browser ini tidak mendukung akses kamera.");
      return;
    }

    try {
      setCameraError(null);
      setCameraReady(false);

      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
      await loadCameraDevices();
    } catch (error) {
      setCameraReady(false);
      setCameraError(
        error instanceof Error
          ? error.message
          : "Tidak bisa mengakses kamera. Pastikan izin kamera sudah diberikan.",
      );
    }
  };

  // Fetch parking logs from API (newest first)
  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({
        vehicle_type: vehicleType,
        status: "parked-out",
        limit: "50",
      });

      const res = await fetch(
        `http://localhost:8000/logs?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();

      // Format logs: include timestamp for sorting and human-readable 24h time
      const formatted = (data.logs || []).map((l: any) => {
        const dt = l.exit_time ? new Date(l.exit_time) : null;
        const timeStr = dt
          ? dt.toLocaleTimeString(undefined, {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "-";

        return {
          id: l.id,
          plate: l.plate_number,
          time: timeStr,
          ts: dt ? dt.getTime() : 0,
          vehicle_type: l.vehicle_type,
          status: l.status,
        };
      });

      // sort newest-first by timestamp
      formatted.sort((a: any, b: any) => b.ts - a.ts);

      setParkingLogs(formatted);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void fetchLogs();
    // Keep polling as a fallback every 30s
    const id = setInterval(() => void fetchLogs(), 30000);
    return () => clearInterval(id);
  }, [vehicleType]);

  // WebSocket for realtime updates
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      ws = new WebSocket(`ws://${location.hostname}:8000/ws`);

      ws.onopen = () => {
        console.log("WS connected");
        toast.success("WebSocket Terhubung", {
          description: "Sinkronisasi realtime aktif.",
        });
      };

      ws.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);

          // Always refresh logs when any event comes
          void fetchLogs();

          // Only show toast for parked-out events (VEHICLE_EXIT)
          // and only when the vehicle_type matches the current URL param
          if (payload?.event === "VEHICLE_EXIT") {
            const incomingType = payload.vehicle_type ?? "";
            if (incomingType && incomingType !== vehicleType) {
              return;
            }

            const plate = payload.plate_number ?? "";
            toast.info("Kendaraan Keluar", {
              description: plate
                ? `${plate} berhasil keluar dari area parkir.`
                : "Kendaraan berhasil keluar dari area parkir.",
            });
          }
        } catch (e) {
          console.error("WS parse error", e);
        }
      };

      ws.onclose = () => {
        console.log("WS closed, reconnecting in 3s");
        toast.warning("WebSocket Terputus", {
          description: "Mencoba menyambung ulang dalam 3 detik.",
        });
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error("WS error", err);
        toast.error("WebSocket Error", {
          description: "Terjadi masalah koneksi ke server real-time.",
        });
        ws?.close();
      };
    };

    connect();

    const handleFocus = () => {
      void fetchLogs();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      try {
        ws?.close();
      } catch {}
    };
  }, [vehicleType]);

  return (
    <div className="px-15 py-12.5 bg-background-color min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex md:flex-row justify-center items-center md:items-center mb-7.5">
        <h1 className="text-[48px] text-text-color flex items-center">
          <Link href={"/admin/dashboard"}>
            <CircleArrowLeft className="w-8 h-8 mr-5 hover:text-primary-color" />
          </Link>
          N<span className="text-secondary-color">A</span>
          NGKR
          <span className="text-secondary-color">I</span>NG | Gate-
          <span className="text-secondary-color">
            Out ({vehicleType === "motorbike" ? "Motorbike" : "Car"})
          </span>
        </h1>
      </div>

      <div className="grid grid-cols-7 grid-rows-8 gap-7.5 w-full flex-1 min-h-0">
        <div className="col-span-5 row-span-6 h-full min-h-0">
          <Card className="w-full h-full flex flex-col p-0 overflow-hidden">
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-0">
              <div className="relative h-full min-h-0 flex-1 overflow-hidden rounded-xl border bg-muted">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {!cameraReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85 px-6 text-center">
                    <div className="max-w-md space-y-2">
                      <p className="text-lg font-semibold text-text-color">
                        Kamera belum aktif
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Klik tombol aktifkan untuk meminta izin kamera dari
                        user.
                        {cameraDevices.length > 1
                          ? " Setelah izin diberikan, sumber kamera bisa dipilih."
                          : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => void startCamera(selectedDeviceId)}
                    >
                      Minta Akses Kamera
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="col-span-2 row-span-2 h-full min-h-0">
          <Card className="w-full h-full p-5">
            <CardHeader>
              <CardTitle className="flex items-center gap-5">
                <h1 className="tracking-[5%]">Real-Time Server Clock</h1>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-7xl font-bold tracking-widest text-center">
                {currentTime}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="col-span-2 row-span-6 h-full min-h-0">
          <Card className="w-full h-full p-5">
            <CardHeader>
              <CardTitle className="flex items-center gap-5">
                <h1 className="tracking-[5%]">Gate-Out log</h1>
              </CardTitle>
            </CardHeader>
            <hr />
            <CardContent>
              <div className="text-left gap-2 flex flex-col max-h-[45vh] overflow-auto">
                {parkingLogs.map((log) => (
                  <div
                    key={log.id}
                    className="text-lg font-mono flex justify-between pr-3"
                  >
                    <span className="text-secondary-color">{log.time}</span>
                    <span className="truncate capitalize">
                      {log.plate}{" "}
                      {log.vehicle_type ? `(${log.vehicle_type})` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="col-span-3 row-span-2 h-full min-h-0">
          <Card className="w-full h-full p-5">
            <CardHeader>
              <CardTitle className="flex items-center gap-5">
                <h1 className="tracking-[5%]">License Plate Number </h1>
                <Button>Manual Input</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-7xl font-bold tracking-widest">
                {licensePlate || "XXXX-XXXX"}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="col-span-2 row-span-2 h-full min-h-0">
          <Card className="w-full h-full p-5">
            <CardHeader>
              <CardTitle className="flex items-center gap-5">
                <h1 className="tracking-[5%]">Gate Status</h1>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-7xl font-bold tracking-widest text-center">
                {gateStatus}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
