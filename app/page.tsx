"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, LogOut } from "lucide-react";
import FittingRoomCard, { RoomStatus } from "@/components/FittingRoomCard";
import AlertsPanel from "@/components/AlertsPanel";
import RoomDetailsModal from "@/components/RoomDetailsModal";
import SystemStats from "@/components/SystemStats";
import UnlockRequestsPanel from "@/components/UnlockRequestsPanel";
import { toast, Toaster } from "sonner";
import { roomsAPI, alertsAPI, unlockRequestsAPI } from "@/lib/api";

type AlertType = "missing-item" | "time-exceeded" | "forced-entry" | "scan-discrepancy";
type AlertSeverity = "high" | "medium" | "low";

interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  roomNumber: number;
  message: string;
  timestamp: Date | string;
  resolved?: boolean;
}

interface UnlockRequest {
  id: string;
  roomNumber: number;
  requestedBy: string;
  requestTime: Date | string;
  reason: string;
  status: "pending" | "approved" | "rejected";
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [unlockRequests, setUnlockRequests] = useState<UnlockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
    } else {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        fetchAllData();
      } catch (error) {
        console.error("Error parsing user data:", error);
        router.push("/login");
      }
    }
  }, [router]);

  // Fetch all data from database
  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchRooms(),
        fetchAlerts(),
        fetchUnlockRequests(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data from database");
    } finally {
      setLoading(false);
    }
  };

  // Fetch rooms from database
  const fetchRooms = async () => {
    try {
      const data = await roomsAPI.getAllRooms();
      
      // Map API response to component format
      const mappedRooms = data.map((room: any) => ({
        id: room.id.toString(),
        number: room.number,
        status: room.status as RoomStatus,
        customerCard: room.customerCard || undefined,
        itemCount: room.itemCount || 0,
        duration: room.duration || 0,
        entryTime: room.entryTime ? new Date(room.entryTime) : undefined,
        alert: room.alert,
        unlockRequested: room.unlockRequested || false, // Include unlockRequested flag
      }));
      
      setRooms(mappedRooms);
    } catch (error: any) {
      console.error("Error fetching rooms:", error);
      toast.error(error.message || "Failed to fetch rooms");
    }
  };

  // Fetch alerts from database
  const fetchAlerts = async () => {
    try {
      const data = await alertsAPI.getAllAlerts();
      
      // Map API response to component format
      const mappedAlerts: Alert[] = data.map((alert: any) => ({
        id: alert.id.toString(),
        type: alert.type as AlertType,
        severity: alert.severity as AlertSeverity,
        roomNumber: alert.roomNumber,
        message: alert.message,
        timestamp: alert.timestamp ? new Date(alert.timestamp) : new Date(),
        resolved: alert.resolved || false,
      }));
      
      setAlerts(mappedAlerts);
    } catch (error: any) {
      console.error("Error fetching alerts:", error);
      toast.error(error.message || "Failed to fetch alerts");
    }
  };

  // Fetch unlock requests from database
  const fetchUnlockRequests = async () => {
    try {
      const data = await unlockRequestsAPI.getUnlockRequests();
      
      // Map API response to component format
      const mappedRequests: UnlockRequest[] = data.map((req: any) => ({
        id: req.id.toString(),
        roomNumber: req.roomNumber,
        requestedBy: req.requestedBy,
        requestTime: req.requestTime ? new Date(req.requestTime) : new Date(),
        reason: req.reason,
        status: req.status,
      }));
      
      setUnlockRequests(mappedRequests);
    } catch (error: any) {
      console.error("Error fetching unlock requests:", error);
      toast.error(error.message || "Failed to fetch unlock requests");
    }
  };

  // Live duration updater for rooms with entryTime
  useEffect(() => {
    const interval = setInterval(() => {
      setRooms(prev => prev.map(r => {
        if ((r.status === "occupied" || r.status === "alert") && r.entryTime instanceof Date) {
          const entry = r.entryTime as Date;
          const minutes = Math.max(0, Math.round((Date.now() - entry.getTime()) / 60000));
          if (r.duration !== minutes) {
            return { ...r, duration: minutes };
          }
        }
        return r;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    toast.info("Logged out successfully");
    router.push("/login");
  };

  const handleViewDetails = async (room: any) => {
    try {
      const details = await roomsAPI.getRoomDetails(room.id);
      
      // Map API response to component format
      const mappedDetails = {
        id: details.id?.toString() || room.id,
        number: details.number || room.number,
        status: details.status as RoomStatus,
        itemCount: details.itemCount || 0,
        duration: details.duration || 0,
        customerCard: details.customerCard || undefined,
        entryTime: details.entryTime ? new Date(details.entryTime) : undefined,
        ai: details.ai,
        unlockRequested: room.unlockRequested || false, // Preserve unlockRequested from room list
        products: (details.products || []).map((p: any) => ({
          id: p.id?.toString() || p.code,
          code: p.code,
          name: p.name,
          size: p.size,
          color: p.color,
          scannedIn: p.scannedIn || false,
          scannedOut: p.scannedOut || false,
          isMissing: p.isMissing || false,
        })),
      };
      
      setSelectedRoom(mappedDetails);
      setDetailsOpen(true);
    } catch (error: any) {
      console.error("Error fetching room details:", error);
      toast.error(error.message || "Failed to fetch room details");
    }
  };

  const handleRequestUnlock = async (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room || !user) return;

    try {
      // If user is manager, unlock directly without creating a request
      if (user.role === "manager") {
        await unlockRequestsAPI.directUnlockRoom(roomId);
        
        // Refresh data from database
        await Promise.all([
          fetchUnlockRequests(),
          fetchRooms(),
        ]);
        
        toast.success(`Room ${room.number} unlocked successfully`);
      } else {
        // Optimistically update the UI immediately
        setRooms(prev => prev.map(r => 
          r.id === roomId ? { ...r, unlockRequested: true } : r
        ));
        
        // For non-managers, create an unlock request
        const reason = room.alert || "Emergency access required";
        await unlockRequestsAPI.createUnlockRequest(roomId, reason);
        
        // Refresh unlock requests to get the new one from database
        await fetchUnlockRequests();
        
        // Refresh rooms to confirm unlockRequested flag from database
        await fetchRooms();
        
        toast.success(`Unlock request submitted for Room ${room.number}`);
      }
    } catch (error: any) {
      console.error("Error unlocking room:", error);
      toast.error(error.message || "Failed to unlock room");
    }
  };

  const handleApproveUnlock = async (requestId: string) => {
    try {
      await unlockRequestsAPI.approveUnlockRequest(requestId);
      
      // Refresh data from database
      await Promise.all([
        fetchUnlockRequests(),
        fetchRooms(),
      ]);
      
      toast.success("Unlock request approved and room unlocked");
    } catch (error: any) {
      console.error("Error approving unlock request:", error);
      toast.error(error.message || "Failed to approve unlock request");
    }
  };

  const handleRejectUnlock = async (requestId: string) => {
    try {
      await unlockRequestsAPI.rejectUnlockRequest(requestId);
      
      // Refresh unlock requests from database
      await fetchUnlockRequests();
      
      toast.success("Unlock request rejected");
    } catch (error: any) {
      console.error("Error rejecting unlock request:", error);
      toast.error(error.message || "Failed to reject unlock request");
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await alertsAPI.resolveAlert(alertId);
      
      // Refresh alerts from database
      await fetchAlerts();
      
      toast.success("Alert resolved successfully");
    } catch (error: any) {
      console.error("Error resolving alert:", error);
      // Show the detailed error message from the backend
      // The error message should already include the detailed message from the API
      toast.error(error.message || "Failed to resolve alert");
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchAllData();
      toast.success("System refreshed from database");
    } catch (error: any) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  const availableRooms = rooms.filter((r) => r.status === "available").length;
  const occupiedRooms = rooms.filter((r) => r.status === "occupied" || r.status === "alert").length;
  const activeAlerts = alerts.filter((a) => !a.resolved).length;

  // Show loading while checking auth or fetching initial data
  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Smart Fitting Room System
              </h1>
              <p className="text-sm text-muted-foreground">
                RFID-Enabled Retail Management Dashboard
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right mr-2">
                <p className="text-sm font-medium">{user.username}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <SystemStats
          totalRooms={rooms.length}
          availableRooms={availableRooms}
          occupiedRooms={occupiedRooms}
          activeAlerts={activeAlerts}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fitting Rooms Grid */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-4">Fitting Rooms</h2>
            {rooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No rooms found. Please check your database connection.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rooms.map((room) => (
                  <FittingRoomCard
                    key={room.id}
                    room={room}
                    onViewDetails={handleViewDetails}
                    onRequestUnlock={handleRequestUnlock}
                    userRole={user.role}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Panel - Conditional based on role */}
          <div className="lg:col-span-1 space-y-6">
            {user.role === "manager" && (
              <UnlockRequestsPanel
                requests={unlockRequests}
                onApprove={handleApproveUnlock}
                onReject={handleRejectUnlock}
              />
            )}
            <AlertsPanel alerts={alerts} onResolveAlert={handleResolveAlert} />
          </div>
        </div>
      </main>

      {/* Room Details Modal */}
      <RoomDetailsModal
        room={selectedRoom}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onRequestUnlock={handleRequestUnlock}
        userRole={user.role}
      />
    </div>
  );
}
