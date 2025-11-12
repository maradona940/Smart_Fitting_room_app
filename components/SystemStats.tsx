"use client";

import { Card } from "@/components/ui/card";
import { Users, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

interface SystemStatsProps {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  activeAlerts: number;
}

const SystemStats = ({ totalRooms, availableRooms, occupiedRooms, activeAlerts }: SystemStatsProps) => {
  const stats = [
    {
      label: "Total Rooms",
      value: totalRooms,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Available",
      value: availableRooms,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Occupied",
      value: occupiedRooms,
      icon: TrendingUp,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Active Alerts",
      value: activeAlerts,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <p className="text-3xl font-bold mt-2">{stat.value}</p>
            </div>
            <div className={`${stat.bgColor} ${stat.color} p-3 rounded-full`}>
              <stat.icon className="h-6 w-6" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default SystemStats;
