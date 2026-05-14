"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Filter,
  Search,
  EllipsisVertical,
  CircleArrowLeft,
  Calendar as CalendarIcon,
  CalendarX2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

type ParkingLog = {
  id: number;
  plate_number: string;
  vehicle_type: string;
  entry_time: string;
  exit_time: string | null;
  status: string;
  total_amount: number;
};

export default function ParkingLogPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fetchLogsRef = useRef<() => Promise<void>>(async () => {});

  const [logs, setLogs] = useState<ParkingLog[]>([]);
  const [total, setTotal] = useState(0);
  const [plateNumber, setPlateNumber] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Sync state dengan URL
  const vehicleType = searchParams.get("vehicle_type") || "all";
  const status = searchParams.get("status") || "all";
  const limit = parseInt(searchParams.get("limit") || "10");
  const page = parseInt(searchParams.get("page") || "1");
  const startDateParam = searchParams.get("start_date");
  const endDateParam = searchParams.get("end_date");
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Helper functions untuk format/parse tanggal tanpa timezone offset
  const formatDateToString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseStringToDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-");
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  // Parse dates from URL params
  useEffect(() => {
    if (startDateParam) {
      setStartDate(parseStringToDate(startDateParam));
    }
    if (endDateParam) {
      setEndDate(parseStringToDate(endDateParam));
    }
  }, [startDateParam, endDateParam]);

  const paginationItems = (): Array<number | "ellipsis"> => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (page <= 4) {
      return [1, 2, 3, 4, 5, "ellipsis", totalPages];
    }

    if (page >= totalPages - 3) {
      return [
        1,
        "ellipsis",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages];
  };

  const updateDateRange = (
    newStartDate: Date | undefined,
    newEndDate: Date | undefined,
  ) => {
    const params = new URLSearchParams(searchParams);
    if (newStartDate) {
      params.set("start_date", formatDateToString(newStartDate));
    } else {
      params.delete("start_date");
    }
    if (newEndDate) {
      params.set("end_date", formatDateToString(newEndDate));
    } else {
      params.delete("end_date");
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const clearDateFilter = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("start_date");
    params.delete("end_date");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const updatePage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", nextPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const fetchLogs = useCallback(async () => {
    const offset = (page - 1) * limit;
    const params = new URLSearchParams({
      vehicle_type: vehicleType === "all" ? "" : vehicleType,
      status: status === "all" ? "" : status,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    if (startDateParam) params.set("start_date", startDateParam);
    if (endDateParam) params.set("end_date", endDateParam);
    const url = `http://localhost:8000/logs?${params.toString()}`;
    const res = await fetch(url);
    const data = await res.json();
    setLogs(data.logs);
    setTotal(data.total);
  }, [vehicleType, status, limit, page, startDateParam, endDateParam]);

  useEffect(() => {
    fetchLogsRef.current = fetchLogs;
  }, [fetchLogs]);

  useEffect(() => {
    const initialFetchTimer = window.setTimeout(() => {
      void fetchLogs();
    }, 0);

    return () => {
      window.clearTimeout(initialFetchTimer);
    };
  }, [fetchLogs]);

  useEffect(() => {
    let socket: WebSocket;
    let isUnmounting = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connectWS = () => {
      socket = new WebSocket("ws://localhost:8000/ws");

      socket.onopen = () => {
        toast.success("WebSocket Terhubung", {
          description: "Data log akan diperbarui otomatis saat ada perubahan.",
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

        fetchLogsRef.current();

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

        toast.success("Data Log Diperbarui", {
          description: "Daftar log parkir telah dimuat ulang secara otomatis.",
        });
      };

      socket.onclose = () => {
        if (isUnmounting) {
          return;
        }

        toast.warning("WebSocket Terputus", {
          description: "Mencoba menyambung ulang dalam 3 detik.",
        });

        reconnectTimer = setTimeout(connectWS, 3000);
      };

      socket.onerror = (error) => {
        console.error("WebSocket Error:", error);
        toast.error("WebSocket Error", {
          description: "Terjadi masalah koneksi ke server real-time.",
        });
      };
    };

    connectWS();

    const handleFocus = () => {
      fetchLogsRef.current();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      isUnmounting = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      socket?.close();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    <main className="px-15 py-12.5 bg-background-color min-h-screen">
      <div className="w-full">
        {/* HEADER & TOP FILTERS */}
        <div className="flex md:flex-row justify-center items-center md:items-center mb-7.5">
          <h1 className="text-[48px] text-text-color flex items-center">
            <Link href={"/admin/dashboard"}>
              <CircleArrowLeft className="w-8 h-8 mr-5 hover:text-primary-color" />
            </Link>
            N<span className="text-secondary-color">A</span>
            NGKR
            <span className="text-secondary-color">I</span>NG | Parking
            <span className="text-secondary-color ml-3">Logs</span>
          </h1>
        </div>

        <Card className="border-none shadow-md bg-quaternary-color overflow-hidden px-15 py-12.5 gap-5">
          <div className="grid grid-cols-2">
            <div className="flex justify-start items-center">
              <div className="relative w-fit">
                <Input
                  type="text"
                  placeholder="Search for license number"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  className="px-6.25 py-3.75 mr-25 rounded-[10px] border border-muted-color bg-white text-base shadow-sm placeholder:text-muted-color"
                />
                <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-color" />
              </div>
            </div>
            <div className="flex justify-end items-center">
              {/* <Button
                variant="outline"
                className="border-primary-color text-primary-color hover:bg-primary-color/10"
              >
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button> */}
            </div>
          </div>
          {/* FILTER BAR - Disesuaikan dengan gambar */}
          <div className="grid grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <Filter className="w-4 h-4 text-muted-color" />
                <span className="text-sm font-bold text-text-color">
                  Filters:
                </span>
              </div>

              <Select
                value={vehicleType}
                onValueChange={(v) => updateFilters("vehicle_type", v)}
              >
                <SelectTrigger className="w-35 h-9">
                  <SelectValue placeholder="Vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicles</SelectItem>
                  <SelectItem value="motorbike">Motorbike</SelectItem>
                  <SelectItem value="car">Car</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={status}
                onValueChange={(v) => updateFilters("status", v)}
              >
                <SelectTrigger className="w-35 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="parked-in">Parked In</SelectItem>
                  <SelectItem value="parked-out">Parked Out</SelectItem>
                  <SelectItem value="overstay">Overstay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-end gap-5">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 w-37.5 justify-between text-left font-normal"
                    >
                      <span>
                        {startDate
                          ? startDate.toLocaleDateString("id-ID")
                          : "Pilih tanggal"}
                      </span>
                      <CalendarIcon className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => updateDateRange(date, endDate)}
                      disabled={(date) => (endDate ? date > endDate : false)}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-text-color">-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 w-37.5 justify-between text-left font-normal"
                    >
                      <span>
                        {endDate
                          ? endDate.toLocaleDateString("id-ID")
                          : "Pilih tanggal"}
                      </span>
                      <CalendarIcon className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => updateDateRange(startDate, date)}
                      disabled={(date) =>
                        startDate ? date < startDate : false
                      }
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  onClick={clearDateFilter}
                  disabled={!startDate && !endDate}
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 hover:bg-neon-danger-color/10 hover:text-danger-color hover:border-danger-color transition-colors"
                >
                  <CalendarX2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* TABLE SECTION */}
          <CardContent className="p-0 bg-quaternary-color rounded-xl">
            <Table>
              <TableHeader className="bg-quaternary-color hover:bg-primary-color/15 transition-colors">
                <TableRow>
                  <TableHead className="font-bold text-primary-color">
                    No
                  </TableHead>
                  <TableHead className="font-bold text-primary-color">
                    Plate Number
                  </TableHead>
                  <TableHead className="font-bold text-primary-color">
                    Type
                  </TableHead>
                  <TableHead className="font-bold text-primary-color">
                    Entry Time
                  </TableHead>
                  <TableHead className="font-bold text-primary-color">
                    Exit Time
                  </TableHead>
                  <TableHead className="font-bold text-primary-color">
                    Status
                  </TableHead>
                  <TableHead className="font-bold text-primary-color">
                    Amount
                  </TableHead>
                  <TableHead className="text-right font-bold text-primary-color">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center  font-medium text-muted-color hover:bg-primary-color/10 hover:text-primary-color/80 transition-colors"
                    >
                      No Log Data Available
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log, index) => (
                    <TableRow
                      key={log.id}
                      className="hover:bg-primary-color/10 transition-colors font-medium"
                    >
                      <TableCell className=" font-medium text-text-color">
                        {(page - 1) * limit + index + 1}
                      </TableCell>
                      <TableCell className="font-mono font-semibold uppercase text-secondary-color">
                        {log.plate_number}
                      </TableCell>
                      <TableCell className="capitalize">
                        {log.vehicle_type}
                      </TableCell>
                      <TableCell className="">
                        {new Date(log.entry_time).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="">
                        {log.exit_time
                          ? new Date(log.exit_time).toLocaleString("id-ID")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            log.status === "parked-in"
                              ? "bg-neon-info-color/25 text-info-color capitalize p-2"
                              : log.status === "overstay"
                                ? "bg-neon-danger-color/25 text-danger-color capitalize p-2"
                                : "bg-neon-success-color/25 text-success-color capitalize p-2"
                          }
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">
                        Rp {log.total_amount.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="flex justify-end items-center">
                        <EllipsisVertical className="w-4 h-4 text-text-color" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* FOOTER / PAGINATION - Mirip gambar */}
          <div className="grid grid-cols-2">
            <div className="flex justify-start items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-color">Show:</span>
                <Select
                  value={limit.toString()}
                  onValueChange={(v) => updateFilters("limit", v)}
                >
                  <SelectTrigger className="w-20 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-color">datas.</span>
                <p className="text-sm text-muted-color font-medium">
                  Showing{" "}
                  <span className="text-text-color">
                    {total === 0 ? 0 : (page - 1) * limit + 1}
                  </span>{" "}
                  to{" "}
                  <span className="text-text-color">
                    {Math.min(page * limit, total)}
                  </span>{" "}
                  of <span className="text-text-color">{total}</span> logs
                </p>
              </div>
            </div>
            <div className="flex justify-end items-center">
              <Pagination className="justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        if (page > 1) {
                          updatePage(page - 1);
                        }
                      }}
                      aria-disabled={page === 1}
                      className={
                        page === 1 ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>

                  {paginationItems().map((item, index) => {
                    if (item === "ellipsis") {
                      return (
                        <PaginationItem key={`ellipsis-${index}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }

                    return (
                      <PaginationItem key={item}>
                        <PaginationLink
                          href="#"
                          isActive={item === page}
                          onClick={(event) => {
                            event.preventDefault();
                            updatePage(item as number);
                          }}
                          className={
                            item === page
                              ? "bg-primary-color text-white hover:bg-primary-color"
                              : ""
                          }
                        >
                          {item}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        if (page < totalPages) {
                          updatePage(page + 1);
                        }
                      }}
                      aria-disabled={page >= totalPages}
                      className={
                        page >= totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <footer className="pt-8">
          <p className="text-[12px] text-center text-muted-color font-semibold tracking-wide">
            © 2026 Team 14 of Computer Vision Lecture - SPPG Ngawi. <br />
            All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}
