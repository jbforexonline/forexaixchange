"use client";
import React, { useState, useEffect } from "react";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole, isAdminRole } from "@/lib/layoutConfig";
import { useToast } from "@/Components/Common/Toast/ToastContext";

import { getAffiliateSettings, updateAffiliateSettings } from "@/lib/api/admin-affiliate";

interface AffiliateSettings {
  programEnabled: boolean;
  commissionPercentage: number;
  minWithdrawalAmount: number;
  payoutFrequency: "daily" | "weekly" | "monthly";
  tierLevels: TierLevel[];
}

interface TierLevel {
  id: string;
  name: string;
  minReferrals: number;
  commissionBonus: number;
  description: string;
}

export default function AffiliateSettingsPage() {
  const { user, role, isLoading } = useLayoutState();
  const toast = useToast();
  const [settings, setSettings] = useState<AffiliateSettings>({
    programEnabled: true,
    commissionPercentage: 15,
    minWithdrawalAmount: 50,
    payoutFrequency: "monthly",
    tierLevels: [
      {
        id: "1",
        name: "Bronze",
        minReferrals: 0,
        commissionBonus: 0,
        description: "Entry level affiliates",
      },
      {
        id: "2",
        name: "Silver",
        minReferrals: 10,
        commissionBonus: 2,
        description: "10 or more active referrals",
      },
      {
        id: "3",
        name: "Gold",
        minReferrals: 50,
        commissionBonus: 5,
        description: "50 or more active referrals",
      },
      {
        id: "4",
        name: "Platinum",
        minReferrals: 100,
        commissionBonus: 10,
        description: "100 or more active referrals",
      },
    ],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdminRole(role)) {
      return;
    }

    fetchSettings();
  }, [role]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await getAffiliateSettings();
      if (data && data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Failed to fetch affiliate settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateAffiliateSettings(settings);
      toast.success("Affiliate settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save affiliate settings");
    }
  };

  const handleChangeSetting = (key: keyof AffiliateSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleUpdateTier = (tierId: string, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      tierLevels: prev.tierLevels.map((tier) =>
        tier.id === tierId ? { ...tier, [key]: value } : tier
      ),
    }));
  };

  if (isLoading) {
    return null;
  }

  if (!isAdminRole(role)) {
    return (
      <div style={{ padding: "2rem", color: "#dc2626" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginTop: 0, color: "#fff" }}>Affiliate Settings</h1>
        <p style={{ color: "#d1d5db" }}>
          Configure and manage your affiliate program
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#d1d5db" }}>
          <p>Loading affiliate settings...</p>
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
              Program Settings
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
                    checked={settings.programEnabled}
                    onChange={(e) =>
                      handleChangeSetting("programEnabled", e.target.checked)
                    }
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  <span>Enable Affiliate Program</span>
                </label>
                <p
                  style={{
                    marginTop: "0.5rem",
                    color: "#9ca3af",
                    fontSize: "0.85rem",
                  }}
                >
                  Allow users to join the affiliate program
                </p>
              </div>

              <div>
                <label style={{ color: "#d1d5db", fontSize: "0.9rem" }}>
                  Base Commission (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.commissionPercentage}
                  onChange={(e) =>
                    handleChangeSetting(
                      "commissionPercentage",
                      parseFloat(e.target.value)
                    )
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
                  Minimum Withdrawal ($)
                </label>
                <input
                  type="number"
                  value={settings.minWithdrawalAmount}
                  onChange={(e) =>
                    handleChangeSetting(
                      "minWithdrawalAmount",
                      parseFloat(e.target.value)
                    )
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
                  Payout Frequency
                </label>
                <select
                  value={settings.payoutFrequency}
                  onChange={(e) =>
                    handleChangeSetting("payoutFrequency", e.target.value as any)
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
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
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
              Tier Levels
            </h2>

            <div style={{ marginTop: "1rem" }}>
              {settings.tierLevels.map((tier, idx) => (
                <div
                  key={tier.id}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <label style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                        Tier Name
                      </label>
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) =>
                          handleUpdateTier(tier.id, "name", e.target.value)
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          marginTop: "0.25rem",
                          backgroundColor: "rgba(255, 255, 255, 0.1)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          borderRadius: "6px",
                          color: "#fff",
                          fontSize: "0.9rem",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                        Min Referrals
                      </label>
                      <input
                        type="number"
                        value={tier.minReferrals}
                        onChange={(e) =>
                          handleUpdateTier(
                            tier.id,
                            "minReferrals",
                            parseInt(e.target.value)
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          marginTop: "0.25rem",
                          backgroundColor: "rgba(255, 255, 255, 0.1)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          borderRadius: "6px",
                          color: "#fff",
                          fontSize: "0.9rem",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                        Commission Bonus (%)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={tier.commissionBonus}
                        onChange={(e) =>
                          handleUpdateTier(
                            tier.id,
                            "commissionBonus",
                            parseFloat(e.target.value)
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          marginTop: "0.25rem",
                          backgroundColor: "rgba(255, 255, 255, 0.1)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          borderRadius: "6px",
                          color: "#fff",
                          fontSize: "0.9rem",
                        }}
                      />
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                        Description
                      </label>
                      <textarea
                        value={tier.description}
                        onChange={(e) =>
                          handleUpdateTier(
                            tier.id,
                            "description",
                            e.target.value
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          marginTop: "0.25rem",
                          backgroundColor: "rgba(255, 255, 255, 0.1)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          borderRadius: "6px",
                          color: "#fff",
                          fontSize: "0.9rem",
                          minHeight: "60px",
                          fontFamily: "inherit",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: "1rem" }}>
                    <p style={{ margin: 0, color: "#86efac", fontSize: "0.9rem" }}>
                      Total Commission: {settings.commissionPercentage + tier.commissionBonus}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "1.5rem",
            }}
          >
            <h3 style={{ marginTop: 0, color: "#93c5fd" }}>
              Commission Calculation
            </h3>
            <div style={{ color: "#d1d5db", fontSize: "0.9rem", lineHeight: "1.6" }}>
              <p>
                Each affiliate earns a base commission on all referral spins, plus bonus
                commissions based on their tier level.
              </p>
              <p>
                <strong>Example:</strong> A Gold tier affiliate (50+ referrals) with a base
                commission of 15% and 5% bonus earns 20% total commission per spin.
              </p>
            </div>
          </div>

          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
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
