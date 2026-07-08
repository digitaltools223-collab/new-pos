import React, { useState, useEffect } from "react";
import { LogOut, Clock, Calendar, User, Shield } from "lucide-react";

interface TopbarProps {
  userName: string;
  userRole: "admin" | "manager" | "cashier";
  onLogout: () => void;
}

export default function Topbar({ userName, userRole, onLogout }: TopbarProps) {
  const [time, setTime] = useState(new Date());
  const [ownerName, setOwnerName] = useState("Shoaib Hassan");

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem("mdr_pos_token");
        if (!token) return;
        const res = await fetch("/api/settings", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.ownerName) {
            setOwnerName(data.ownerName);
          }
        }
      } catch (err) {
        console.error("Failed to fetch settings in Topbar:", err);
      }
    };
    fetchSettings();
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      case "manager":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      default:
        return "bg-slate-100 text-slate-800 border border-slate-200";
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm">
      {/* Welcome / Owner Name */}
      <div className="flex items-center space-x-2">
        <span className="text-slate-400 text-sm italic">Welcome,</span>
        <span className="font-semibold text-slate-700">{ownerName}</span>
        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded font-mono ml-2 ${getRoleBadgeColor(userRole)}`}>
          {userRole}
        </span>
      </div>

      {/* Date & Time / Avatar */}
      <div className="flex items-center space-x-6">
        <div className="text-right">
          <p className="text-sm font-bold text-slate-800 leading-none">{formatDate(time)}</p>
          <p className="text-xs text-slate-500 mt-1">{formatTime(time)}</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold select-none">
          {ownerName ? ownerName.charAt(0).toUpperCase() : "O"}
        </div>
        
        {/* Quick Logout Button */}
        <button
          onClick={onLogout}
          title="Logout"
          className="p-2 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
