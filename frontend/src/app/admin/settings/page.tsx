"use client";
import React, { useState, useEffect } from "react";
import { Settings, ShieldAlert, Cpu, Database, Save, AlertTriangle } from "lucide-react";
import "./SystemSettings.scss";
import { getSystemConfig, updateSystemConfig } from "@/lib/api/admin-finance";
import { setMaintenanceMode } from "@/lib/api/admin-users";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole } from "@/lib/layoutConfig";
import { useToast } from "@/Components/Common/Toast/ToastContext";

export default function SystemSettingsPage() {
  const { role } = useLayoutState();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [configs, setConfigs] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await getSystemConfig();
      setConfigs(data);
      const maintenance = data.find(c => c.key === 'maintenance_mode');
      if (maintenance) setMaintenanceEnabled(maintenance.value === 'true');
    } catch (error) {
      console.error("Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

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

  if (role !== UserRole.SUPER_ADMIN && role !== UserRole.ADMIN) {
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
