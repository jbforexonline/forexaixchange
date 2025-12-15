"use client";
import React, { useState, useEffect } from "react";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole } from "@/lib/layoutConfig";

interface SecurityAlert {
  id: string;
  type: "critical" | "warning" | "info";
  message: string;
  timestamp: string;
}

interface SecuritySettings {
  twoFactorAuthEnabled: boolean;
  ipWhitelistEnabled: boolean;
  rateLimit: number;
  sessionTimeout: number;
  passwordMinLength: number;
  requireStrongPassword: boolean;
}

export default function SecurityPage() {
  const { user, role } = useLayoutState();
  const [settings, setSettings] = useState<SecuritySettings>({
    twoFactorAuthEnabled: true,
    ipWhitelistEnabled: false,
    rateLimit: 100,
    sessionTimeout: 3600,
    passwordMinLength: 8,
    requireStrongPassword: true,
  });
  const [alerts, setAlerts] = useState<SecurityAlert[]>([
    {
      id: "1",
      type: "info",
      message: "SSL certificate valid until 2025-12-31",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (role !== UserRole.SUPER_ADMIN) {
      return;
    }

    fetchSecuritySettings();
  }, [role]);

  const fetchSecuritySettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/security/settings", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || settings);
        setAlerts(data.alerts || alerts);
      }
    } catch (error) {
      console.error("Failed to fetch security settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const response = await fetch("/api/admin/security/settings", {
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

  const handleChange = (key: keyof SecuritySettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const getAlertColor = (
    type: "critical" | "warning" | "info"
  ): { bg: string; text: string; border: string } => {
    switch (type) {
      case "critical":
        return {
          bg: "rgba(239, 68, 68, 0.1)",
          text: "#fca5a5",
          border: "rgba(239, 68, 68, 0.3)",
        };
      case "warning":
        return {
          bg: "rgba(251, 146, 60, 0.1)",
          text: "#fdba74",
          border: "rgba(251, 146, 60, 0.3)",
        };
      case "info":
        return {
          bg: "rgba(59, 130, 246, 0.1)",
          text: "#93c5fd",
          border: "rgba(59, 130, 246, 0.3)",
        };
    }
  };

  if (role !== UserRole.SUPER_ADMIN) {
    return (
      <div style={{ padding: "2rem", color: "#dc2626" }}>
        <h2>Access Denied</h2>
        <p>Only Super Admins can access security settings.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginTop: 0, color: "#fff" }}>Security Settings</h1>
        <p style={{ color: "#d1d5db" }}>
          Manage security policies and monitor threats
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
          <p>Loading security settings...</p>
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
              Security Alerts
            </h2>

            <div style={{ marginTop: "1rem" }}>
              {alerts.length === 0 ? (
                <p style={{ color: "#d1d5db", textAlign: "center" }}>
                  No security alerts at this time
                </p>
              ) : (
                alerts.map((alert) => {
                  const colors = getAlertColor(alert.type);
                  return (
                    <div
                      key={alert.id}
                      style={{
                        backgroundColor: colors.bg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "8px",
                        padding: "1rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                        }}
                      >
                        <div>
                          <p
                            style={{
                              margin: 0,
                              color: colors.text,
                              fontWeight: "600",
                              fontSize: "0.9rem",
                            }}
                          >
                            {alert.type.toUpperCase()}: {alert.message}
                          </p>
                          <p
                            style={{
                              margin: "0.5rem 0 0 0",
                              color: "#9ca3af",
                              fontSize: "0.8rem",
                            }}
                          >
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
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
              Authentication & Access
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1.5rem",
                marginTop: "1rem",
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
                    checked={settings.twoFactorAuthEnabled}
                    onChange={(e) =>
                      handleChange("twoFactorAuthEnabled", e.target.checked)
                    }
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  <span>Two-Factor Authentication</span>
                </label>
                <p
                  style={{
                    marginTop: "0.5rem",
                    color: "#9ca3af",
                    fontSize: "0.85rem",
                  }}
                >
                  Require 2FA for all admin accounts
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
                    checked={settings.requireStrongPassword}
                    onChange={(e) =>
                      handleChange("requireStrongPassword", e.target.checked)
                    }
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  <span>Require Strong Password</span>
                </label>
                <p
                  style={{
                    marginTop: "0.5rem",
                    color: "#9ca3af",
                    fontSize: "0.85rem",
                  }}
                >
                  Enforce strong password requirements
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
                    checked={settings.ipWhitelistEnabled}
                    onChange={(e) =>
                      handleChange("ipWhitelistEnabled", e.target.checked)
                    }
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  <span>IP Whitelist</span>
                </label>
                <p
                  style={{
                    marginTop: "0.5rem",
                    color: "#9ca3af",
                    fontSize: "0.85rem",
                  }}
                >
                  Restrict access by IP address
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
              Session & Rate Limiting
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1.5rem",
                marginTop: "1rem",
              }}
            >
              <div>
                <label style={{ color: "#d1d5db", fontSize: "0.9rem" }}>
                  Session Timeout (seconds)
                </label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) =>
                    handleChange("sessionTimeout", parseInt(e.target.value))
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
                <p
                  style={{
                    marginTop: "0.5rem",
                    color: "#9ca3af",
                    fontSize: "0.8rem",
                  }}
                >
                  {(settings.sessionTimeout / 60).toFixed(0)} minutes
                </p>
              </div>

              <div>
                <label style={{ color: "#d1d5db", fontSize: "0.9rem" }}>
                  Rate Limit (requests/minute)
                </label>
                <input
                  type="number"
                  value={settings.rateLimit}
                  onChange={(e) =>
                    handleChange("rateLimit", parseInt(e.target.value))
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
                  Minimum Password Length
                </label>
                <input
                  type="number"
                  value={settings.passwordMinLength}
                  onChange={(e) =>
                    handleChange("passwordMinLength", parseInt(e.target.value))
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
              onClick={() => fetchSecuritySettings()}
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
