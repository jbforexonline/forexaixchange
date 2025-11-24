"use client";

import { useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import {
  Home,
  Wallet,
  User,
  AppWindow,
  BookOpen,
  HelpCircle,
  Sword,
  Settings,
} from "lucide-react";
import "../Layout/DashboardLayout.scss";

export default function Sidebar() {
  const [open, setOpen] = useState(true);

  const menuItems = [
    { icon: Home, label: "Spin" },
    { icon: Wallet, label: "Finances" },
    { icon: User, label: "Profile" },
    { icon: AppWindow, label: "Apps" },
    { icon: BookOpen, label: "Education" },
    { icon: HelpCircle, label: "Help" },
    { icon: Sword, label: "Battles" },
    { icon: Settings, label: "Settings" },
  ];

  return (
    <div className="eo-container">
      <MotionConfig reducedMotion="user">
        <motion.aside
          animate={{ width: open ? 90 : 60 }}
          transition={{ duration: 0.25 }}
          className="eo-sidebar"
        >
          <button
            onClick={() => setOpen(!open)}
            className="eo-toggle-btn"
          >
            {open ? "⟨" : "⟩"}
          </button>

          <div className="eo-menu">
            {menuItems.map((item, idx) => (
              <button key={idx} className="eo-menu-item">
                <item.icon size={22} />
                {open && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        </motion.aside>
      </MotionConfig>

      <main className="eo-main">Your Main Page Content</main>
    </div>
  );
}
