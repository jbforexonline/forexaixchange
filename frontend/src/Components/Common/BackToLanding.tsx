"use client";

import Link from "next/link";
import "../Styles/BackToLanding.scss";

export default function BackToLanding() {
  return (
    <div className="back-to-landing">
      <Link href="/" className="landing-button">
        ← Go to Landing Page
      </Link>
    </div>
  );
}
