"use client";
import React, { useState, useEffect } from "react";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole } from "@/lib/layoutConfig";

interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  spinEnabled: boolean;
  withdrawalEnabled: boolean;
  depositEnabled: boolean;
  maxDailyWithdrawal: number;
  minWithdrawalAmount: number;
  maxWithdrawalAmount: number;
  platformFeePercentage: number;
}

export default function SystemSettingsPage() {
  const { user, role } = useLayoutState();
  const [settings, setSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    registrationEnabled: true,
    spinEnabled: true,
    withdrawalEnabled: true,
    depositEnabled: true,
    maxDailyWithdrawal: 1000,
    minWithdrawalAmount: 10,
    maxWithdrawalAmount: 5000,
    platformFeePercentage: 2.5,
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (role !== UserRole.SUPER_ADMIN) {
      return;
    }
    
    fetchSettings();
  }, [role]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/settings", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || settings);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const handleChange = (key: keyof SystemSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (role !== UserRole.SUPER_ADMIN) {
    return (
      <div style={{ padding: "2rem", color: "#dc2626" }}>
        <h2>Access Denied</h2>
        <p>Only Super Admins can access system settings.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginTop: 0, color: "#fff" }}>System Settings</h1>
        <p style={{ color: "#d1d5db" }}>
          Configure platform-wide settings and feature toggles.
        </p>
      </div>

      {saved && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "rgba(34, 197, 94, 0.2)",
            border: "1px solid rgba(34, 197, 94, 0.5)",
            borderRadius: "8px",
            color: "#86efac",
            marginBottom: "2rem",
            fontSize: "0.9rem",
          }}
        >
          ✓ Settings saved successfully
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", color: "#d1d5db" }}>
          <p>Loading settings...</p>
        </div>
      ) : (
        <>
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "2rem",
              marginBottom: "2rem",
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: "1.2rem", color: "#93c5fd" }}>
              Platform Status
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1.5rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    cursor: "pointer",
                    color: "#fff",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) =>
                      handleChange("maintenanceMode", e.target.checked)
                    }
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  <span>Maintenance Mode</span>
                </label>
                <p
                  style={{
                    marginTop: "0.5rem",
                    color: "#9ca3af",
                    fontSize: "0.85rem",
                  }}
                >
                  When enabled, only admins can access the platform
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    cursor: "pointer",
                    color: "#fff",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.registrationEnabled}
                    onChange={(e) =>
                      handleChange("registrationEnabled", e.target.checked)
                    }
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  <span>User Registration</span>
                </label>
                <p
                  style={{
                    marginTop: "0.5rem",
                    color: "#9ca3af",
                    fontSize: "0.85rem",
                  }}
                >
                  Allow new users to register
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    cursor: "pointer",
                    color: "#fff",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.spinEnabled}
                    onChange={(e) => handleChange("spinEnabled", e.target.checked)}
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  <span>Spin Feature</span>
                </label>
                <p
                  style={{
                    marginTop: "0.5rem",
                    color: "#9ca3af",
                    fontSize: "0.85rem",
                  }}
                >
                  Enable spin/betting feature
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    cursor: "pointer",
                    color: "#fff",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.withdrawalEnabled}
                    onChange={(e) =>
                      handleChange("withdrawalEnabled", e.target.checked)
                    }
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  <span>Withdrawal Feature</span>
                </label>
                <p
                  style={{
                    marginTop: "0.5rem",
                    color: "#9ca3af",
                    fontSize: "0.85rem",
                  }}
                >
                  Allow users to withdraw funds
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    cursor: "pointer",
                    color: "#fff",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.depositEnabled}
                    onChange={(e) =>
                      handleChange("depositEnabled", e.target.checked)
                    }
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  <span>Deposit Feature</span>
                </label>
                <p
                  style={{
                    marginTop: "0.5rem",
                    color: "#9ca3af",
                    fontSize: "0.85rem",
                  }}
                >
                  Allow users to deposit funds
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "2rem",
              marginBottom: "2rem",
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: "1.2rem", color: "#93c5fd" }}>
              Financial Settings
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1.5rem",
              }}
            >
              <div>
                <label style={{ color: "#d1d5db", fontSize: "0.9rem" }}>
                  Max Daily Withdrawal ($)
                </label>
                <input
                  type="number"
                  value={settings.maxDailyWithdrawal}
                  onChange={(e) =>
                    handleChange("maxDailyWithdrawal", parseFloat(e.target.value))
                  }
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    marginTop: "0.5rem",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
              </div>

              <div>
                <label style={{ color: "#d1d5db", fontSize: "0.9rem" }}>
                  Min Withdrawal Amount ($)
                </label>
                <input
                  type="number"
                  value={settings.minWithdrawalAmount}
                  onChange={(e) =>
                    handleChange("minWithdrawalAmount", parseFloat(e.target.value))
                  }
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    marginTop: "0.5rem",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
              </div>

              <div>
                <label style={{ color: "#d1d5db", fontSize: "0.9rem" }}>
                  Max Withdrawal Amount ($)
                </label>
                <input
                  type="number"
                  value={settings.maxWithdrawalAmount}
                  onChange={(e) =>
                    handleChange("maxWithdrawalAmount", parseFloat(e.target.value))
                  }
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    marginTop: "0.5rem",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
              </div>

              <div>
                <label style={{ color: "#d1d5db", fontSize: "0.9rem" }}>
                  Platform Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.platformFeePercentage}
                  onChange={(e) =>
                    handleChange("platformFeePercentage", parseFloat(e.target.value))
                  }
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    marginTop: "0.5rem",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={handleSaveSettings}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#0ea5e9",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Save Settings
            </button>
            <button
              onClick={() => fetchSettings()}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Reload
            </button>
          </div>
        </>
      )}
    </div>
  );
}
