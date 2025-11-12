"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, AlertTriangle, Clock, Package } from "lucide-react";
import { useEffect, useState } from "react";

export type RoomStatus = "available" | "occupied" | "alert" | "checking-out";

interface FittingRoom {
  id: string;
  number: number;
  status: RoomStatus;
  itemCount?: number;
  duration?: number;
  customerCard?: string;
  alert?: string;
  unlockRequested?: boolean;
  entryTime?: Date;
}

interface FittingRoomCardProps {
  room: FittingRoom;
  onViewDetails: (room: FittingRoom) => void;
  onRequestUnlock?: (roomId: string) => void;
  userRole?: string;
}

const FittingRoomCard = ({ room, onViewDetails, onRequestUnlock, userRole }: FittingRoomCardProps) => {
  const getStatusColor = (status: RoomStatus) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 border-green-300";
      case "occupied":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "checking-out":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "alert":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusIcon = (status: RoomStatus) => {
    switch (status) {
      case "available":
        return <Unlock className="h-4 w-4" />;
      case "occupied":
        return <Lock className="h-4 w-4" />;
      case "checking-out":
        return <Clock className="h-4 w-4" />;
      case "alert":
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatHMS = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const h = String(hours).padStart(2, "0");
    const m = String(minutes).padStart(2, "0");
    const s = String(seconds).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const [liveDurationLabel, setLiveDurationLabel] = useState<string>(() => {
    if (room.entryTime instanceof Date) {
      const secs = Math.max(0, Math.floor((Date.now() - room.entryTime.getTime()) / 1000));
      return formatHMS(secs);
    }
    if (room.duration !== undefined) {
      return `${room.duration} minutes`;
    }
    return "";
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (room.entryTime instanceof Date) {
        const secs = Math.max(0, Math.floor((Date.now() - room.entryTime.getTime()) / 1000));
        setLiveDurationLabel(formatHMS(secs));
      } else if (room.duration !== undefined) {
        // Without entryTime, tick from baseline minutes for a smoother UI
        setLiveDurationLabel(prev => {
          // If prev is in mm:ss or hh:mm:ss, attempt to parse and increment; otherwise, keep minutes label
          const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(prev);
          if (match) {
            const total = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + 1;
            return formatHMS(total);
          }
          // Start from provided minutes
          return formatHMS(Math.max(0, Math.floor((room.duration || 0) * 60) + 1));
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [room.entryTime, room.duration]);

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold">Room {room.number}</h3>
        </div>
        <Badge className={`${getStatusColor(room.status)} flex items-center gap-1`}>
          {getStatusIcon(room.status)}
          {room.status.replace("-", " ").toUpperCase()}
        </Badge>
      </div>

      {room.status !== "available" && (
        <div className="space-y-3 mb-4">
          {room.itemCount !== undefined && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>{room.itemCount} items scanned</span>
            </div>
          )}
          {(room.entryTime || room.duration !== undefined) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{liveDurationLabel}</span>
            </div>
          )}
          {room.customerCard && (
            <div className="text-xs text-muted-foreground">
              Card: {room.customerCard}
            </div>
          )}
          {room.alert && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{room.alert}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1" 
          onClick={() => onViewDetails(room)}
          disabled={room.status === "available"}
        >
          View Details
        </Button>
        {room.status === "alert" && onRequestUnlock && (
          <Button 
            variant={room.unlockRequested ? "outline" : "destructive"}
            size="sm"
            onClick={() => !room.unlockRequested && onRequestUnlock(room.id)}
            disabled={room.unlockRequested}
          >
            <Unlock className="h-4 w-4 mr-1" />
            {room.unlockRequested ? "Requested" : userRole === "manager" ? "Unlock" : "Request"}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default FittingRoomCard;
