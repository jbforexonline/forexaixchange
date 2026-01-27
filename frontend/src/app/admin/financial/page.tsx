"use client";
import React from "react";
import FinancialManagement from "./FinancialManagement";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole } from "@/lib/layoutConfig";

export default function FinancialManagementPage() {
  const { role } = useLayoutState();

  if (role !== UserRole.SUPER_ADMIN && role !== UserRole.ADMIN) {
    return (
      <div style={{ padding: "2rem", color: "#dc2626" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  return <FinancialManagement />;
}
