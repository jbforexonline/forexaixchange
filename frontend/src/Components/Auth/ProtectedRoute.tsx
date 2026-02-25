"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) {
        // Store the intended destination
        const returnUrl = pathname !== '/login' ? pathname : '/';
        router.replace(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      } else {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  // While checking auth, keep showing whatever is currently on screen
  if (isChecking) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

