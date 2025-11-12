"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Lock, Unlock, Package, CreditCard, Clock, Barcode, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { RoomStatus } from "./FittingRoomCard";
import { useEffect, useState } from "react";

interface Product {
  id: string;
  code: string;
  name: string;
  size: string;
  color: string;
  scannedIn: boolean;
  scannedOut: boolean;
}

interface RoomDetails {
  id: string;
  number: number;
  status: RoomStatus;
  itemCount: number;
  duration: number;
  customerCard: string;
  products: Product[];
  entryTime?: Date;
  unlockRequested?: boolean;
  ai?: {
    predictedDurationMinutes: number;
  };
}

interface RoomDetailsModalProps {
  room: RoomDetails | null;
  open: boolean;
  onClose: () => void;
  onRequestUnlock?: (roomId: string) => void;
  userRole?: string;
}

const RoomDetailsModal = ({ room, open, onClose, onRequestUnlock, userRole }: RoomDetailsModalProps) => {
  const getStatusColor = (status: RoomStatus) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "occupied":
        return "bg-blue-100 text-blue-800";
      case "checking-out":
        return "bg-amber-100 text-amber-800";
      case "alert":
        return "bg-red-100 text-red-800";
    }
  };

  const [liveSeconds, setLiveSeconds] = useState<number>(() => {
    if (room && room.entryTime instanceof Date) {
      return Math.max(0, Math.floor((Date.now() - room.entryTime.getTime()) / 1000));
    }
    return Math.max(0, Math.floor(((room?.duration || 0)) * 60));
  });

  const formatHMS = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const h = String(hours).padStart(2, "0");
    const m = String(minutes).padStart(2, "0");
    const s = String(seconds).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  useEffect(() => {
    if (!room) return;
    // Initialize
    if (room.entryTime instanceof Date) {
      setLiveSeconds(Math.max(0, Math.floor((Date.now() - room.entryTime.getTime()) / 1000)));
    } else {
      setLiveSeconds(Math.max(0, Math.floor(((room.duration || 0)) * 60)));
    }

    const interval = setInterval(() => {
      if (!room) return;
      if (room.entryTime instanceof Date) {
        setLiveSeconds(Math.max(0, Math.floor((Date.now() - room.entryTime.getTime()) / 1000)));
      } else {
        // Without entryTime we can only tick from the existing minutes baseline
        setLiveSeconds(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room?.id, room?.entryTime, room?.duration]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{room ? `Fitting Room ${room.number}` : "Fitting Room"}</span>
            {room && (
              <Badge className={getStatusColor(room.status)}>
                {room.status.toUpperCase()}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {room && (
        <div className="space-y-6">
          {/* Session Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm">Customer Card</span>
              </div>
              <p className="font-mono text-sm">{room.customerCard}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Duration</span>
              </div>
              <p className="font-semibold">{formatHMS(liveSeconds)}</p>
            </div>

            {room.ai?.predictedDurationMinutes !== undefined && room.ai.predictedDurationMinutes > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Predicted Duration</span>
                </div>
                <p className="font-semibold">{Math.round(room.ai.predictedDurationMinutes * 10) / 10} minutes</p>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span className="text-sm">Items</span>
              </div>
              <p className="font-semibold">{room.itemCount} items</p>
            </div>

            {room.entryTime && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm">Entry Time</span>
                </div>
                <p className="text-sm">{room.entryTime.toLocaleTimeString()}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Products List */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              Scanned Products
            </h3>
            <div className="space-y-2">
              {room.products.map((product) => {
                const isMissing = product.scannedIn && !product.scannedOut && room.status === "alert";
                const isPresent = product.scannedIn && !product.scannedOut;
                
                return (
                  <div
                    key={product.id}
                    className={`border rounded-lg p-3 ${
                      isMissing ? "bg-red-50 border-red-200" : "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                          <span>Size: {product.size}</span>
                          <span>Color: {product.color}</span>
                          <span className="font-mono text-xs">{product.code}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {product.scannedIn ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-xs font-medium">Scanned In</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {product.scannedOut ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-xs font-medium">Scanned Out</span>
                        </div>
                        {isMissing && (
                          <div className="flex items-center gap-2 mt-1">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <span className="text-xs font-bold text-red-600">MISSING</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Close
            </Button>
            {room.status === "alert" && onRequestUnlock && (
              <Button
                variant={room.unlockRequested ? "outline" : "destructive"}
                onClick={() => {
                  if (!room.unlockRequested) {
                    onRequestUnlock(room.id);
                    onClose();
                  }
                }}
                disabled={room.unlockRequested}
              >
                <Unlock className="h-4 w-4 mr-2" />
                {room.unlockRequested 
                  ? "Requested" 
                  : userRole === "manager" 
                    ? "Emergency Unlock" 
                    : "Request Unlock"}
              </Button>
            )}
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RoomDetailsModal;
