"use client";
import React from "react";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole } from "@/lib/layoutConfig";

export default function BannedUsersPage() {
  // Redirect to All Users — banned page removed
  if (typeof window !== 'undefined') {
    window.location.replace('/admin/users');
  }
  return null;
}
