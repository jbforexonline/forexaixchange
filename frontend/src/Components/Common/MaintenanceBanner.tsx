"use client";
import React, { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import "./MaintenanceBanner.scss";

interface MaintenanceBannerProps {
  onDismiss?: () => void;
}

export default function MaintenanceBanner({ onDismiss }: MaintenanceBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/status`);
        const response = await res.json();
        // Backend wraps response in { data: ..., message: ..., statusCode: ... }
        const statusData = response.data || response;
        setIsMaintenanceMode(statusData.maintenance === true);
      } catch (error) {
        console.error("Failed to check maintenance status:", error);
      }
    };

    checkMaintenanceStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkMaintenanceStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isMaintenanceMode || !isVisible) {
    return null;
  }

  return (
    <div className="maintenance-banner">
      <div className="banner-content">
        <AlertTriangle size={20} className="banner-icon" />
        <span className="banner-text">
          <strong>MAINTENANCE MODE ACTIVE</strong> — The platform is currently in maintenance mode. 
          Regular users cannot access the site. Go to <a href="/admin/settings">System Settings</a> to disable.
        </span>
      </div>
      <button className="banner-dismiss" onClick={handleDismiss} title="Dismiss">
        <X size={18} />
      </button>
    </div>
  );
}
