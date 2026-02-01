"use client";
import React, { useState, useEffect } from "react";
import { Settings, ShieldAlert, Cpu, Database, Save, AlertTriangle } from "lucide-react";
import "./SystemSettings.scss";
import { getSystemConfig, updateSystemConfig } from "@/lib/api/admin-finance";
import { setMaintenanceMode } from "@/lib/api/admin-users";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole, isAdminRole } from "@/lib/layoutConfig";
import { useToast } from "@/Components/Common/Toast/ToastContext";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export default function SystemSettingsPage() {
  const { role } = useLayoutState();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [configs, setConfigs] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch live maintenance status (single source of truth)
  const fetchMaintenanceStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/status`);
      const response = await res.json();
      const statusData = response.data ?? response;
      setMaintenanceEnabled(statusData.maintenance === true);
    } catch (error) {
      console.error("Failed to fetch maintenance status", error);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSystemConfig();
        setConfigs(data);
        const maintenance = data.find((c: any) => c.key === "maintenance_mode");
        if (maintenance) setMaintenanceEnabled(maintenance.value === "true");
        // Sync with live status so toggle always matches reality
        await fetchMaintenanceStatus();
      } catch (error) {
        console.error("Failed to fetch settings", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Keep toggle in sync with live status when viewing this page
  useEffect(() => {
    const interval = setInterval(fetchMaintenanceStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleMaintenance = async () => {
    setIsProcessing(true);
    const newValue = !maintenanceEnabled;
    try {
      await setMaintenanceMode(newValue);
      setMaintenanceEnabled(newValue);
      toast.success(`Platform maintenance mode has been ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error("Failed to update maintenance mode");
    } finally {
      setIsProcessing(false);
    }
  };

  // Settings accessible by SUPER_ADMIN, ADMIN, and SYSTEM_ADMIN
  if (!isAdminRole(role)) {
    return <div className="p-8 text-red-500">Access Denied</div>;
  }

  return (
    <div className="system-settings">
      <div className="page-header">
        <h1>System Settings</h1>
        <p>Global configurations, platform status, and environment control</p>
      </div>

      <div className="settings-grid">
        <div className={`settings-card maintenance-box ${maintenanceEnabled ? 'active' : ''}`}>
          <h2><ShieldAlert /> Maintenance Mode</h2>
          <p className="card-description">
            When enabled, the public platform will be hidden behind a maintenance page. 
            Only administrators with active sessions will be able to browse the site. 
            Use this during critical updates or security patches.
          </p>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Platform Accessibility</span>
              <span className="setting-hint">Currently {maintenanceEnabled ? 'Closed' : 'Open'} to public</span>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={maintenanceEnabled} 
                onChange={handleToggleMaintenance}
                disabled={isProcessing}
              />
              <span className="slider round"></span>
            </label>
          </div>
          
          {maintenanceEnabled && (
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', color: '#f87171', fontSize: '0.9rem', alignItems: 'center' }}>
              <AlertTriangle size={18} />
              <span>WARNING: All non-admin users will be blocked.</span>
            </div>
          )}
        </div>

        <div className="settings-card">
          <h2><Database /> Data & Database</h2>
          <p className="card-description">
            Manage database connections and data retention policies. 
            Automated backups are handled by Neon.tech.
          </p>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Database Health</span>
              <span className="setting-hint">Connected to Neon PostgreSQL Cluster</span>
            </div>
            <div style={{ color: '#4ade80', fontSize: '0.85rem', fontWeight: 600 }}>OPTIMAL</div>
          </div>
        </div>
      </div>
    </div>
  );
}
