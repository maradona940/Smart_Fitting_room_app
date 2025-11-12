"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Package, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export type AlertType = "missing-item" | "time-exceeded" | "forced-entry" | "scan-discrepancy";
export type AlertSeverity = "high" | "medium" | "low";

interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  roomNumber: number;
  message: string;
  timestamp: Date;
  resolved?: boolean;
}

interface AlertsPanelProps {
  alerts: Alert[];
  onResolveAlert: (alertId: string) => void;
}

const AlertsPanel = ({ alerts, onResolveAlert }: AlertsPanelProps) => {
  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-300";
      case "medium":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case "missing-item":
        return <Package className="h-4 w-4" />;
      case "time-exceeded":
        return <Clock className="h-4 w-4" />;
      case "forced-entry":
        return <AlertTriangle className="h-4 w-4" />;
      case "scan-discrepancy":
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const activeAlerts = alerts.filter(alert => !alert.resolved);
  const resolvedAlerts = alerts.filter(alert => alert.resolved);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">System Alerts</h2>
        <Badge variant="destructive">{activeAlerts.length} Active</Badge>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {activeAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No active alerts</p>
            </div>
          ) : (
            activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="border rounded-lg p-4 space-y-3 bg-background"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getAlertIcon(alert.type)}
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Room {alert.roomNumber}
                  </span>
                </div>

                <p className="text-sm font-medium">{alert.message}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {alert.timestamp.toLocaleTimeString()}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResolveAlert(alert.id)}
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            ))
          )}

          {resolvedAlerts.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Resolved ({resolvedAlerts.length})
                </h3>
              </div>
              {resolvedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="border rounded-lg p-4 space-y-2 bg-muted/50 opacity-60"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium line-through">
                        {alert.message}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Room {alert.roomNumber}
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

export default AlertsPanel;
