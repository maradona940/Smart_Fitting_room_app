"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Unlock, Clock, CheckCircle } from "lucide-react";

interface UnlockRequest {
  id: string;
  roomNumber: number;
  requestedBy: string;
  requestTime: Date;
  reason: string;
  status: "pending" | "approved" | "rejected";
}

interface UnlockRequestsPanelProps {
  requests: UnlockRequest[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

const UnlockRequestsPanel = ({ requests, onApprove, onReject }: UnlockRequestsPanelProps) => {
  const pendingRequests = requests.filter(r => r.status === "pending");
  const processedRequests = requests.filter(r => r.status !== "pending");

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Unlock Requests</h2>
        <Badge variant="destructive">{pendingRequests.length} Pending</Badge>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No pending unlock requests</p>
            </div>
          ) : (
            pendingRequests.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 space-y-3 bg-amber-50 border-amber-200"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Unlock className="h-4 w-4 text-amber-600" />
                      <span className="font-semibold">Room {request.roomNumber}</span>
                      <Badge variant="outline" className="text-xs">
                        PENDING
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Requested by: <span className="font-medium">{request.requestedBy}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {request.requestTime.toLocaleTimeString()}
                  </div>
                </div>

                <div className="bg-white rounded p-2 text-sm">
                  <span className="font-medium">Reason: </span>
                  {request.reason}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => onApprove(request.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve Unlock
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onReject(request.id)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}

          {processedRequests.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Recent ({processedRequests.length})
                </h3>
              </div>
              {processedRequests.slice(0, 3).map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-3 space-y-2 bg-muted/50 opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className={`h-4 w-4 ${
                        request.status === "approved" ? "text-green-600" : "text-red-600"
                      }`} />
                      <span className="text-sm font-medium">
                        Room {request.roomNumber}
                      </span>
                      <Badge
                        variant={request.status === "approved" ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {request.status.toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {request.requestTime.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default UnlockRequestsPanel;
