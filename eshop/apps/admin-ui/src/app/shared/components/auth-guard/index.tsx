'use client';

import React, { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import useAdmin from '../../../../hooks/useAdmin';
import axiosInstance from '../../../utils/axiosinstance';

const ADMIN_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { admin, isLoading } = useAdmin();
  const queryClient = useQueryClient();
  const router = useRouter();
  const lastActivityAt = useRef(Date.now());

  useEffect(() => {
    if (!admin?.id) return;

    let timeoutId: number;
    let heartbeatId: number;
    let isLoggingOut = false;
    lastActivityAt.current = Date.now();

    const checkInactivity = () => {
      window.clearTimeout(timeoutId);
      const remaining = ADMIN_IDLE_TIMEOUT_MS - (Date.now() - lastActivityAt.current);
      if (remaining > 0) {
        timeoutId = window.setTimeout(checkInactivity, remaining);
        return;
      }
      if (isLoggingOut) return;

      isLoggingOut = true;
      void axiosInstance.post('/api/logout-admin')
        .catch((error) => {
          console.error('Could not complete automatic admin logout:', error);
        })
        .finally(() => {
          queryClient.setQueryData(['admin'], null);
          router.replace('/');
        });
    };

    const recordActivity = () => {
      if (isLoggingOut) return;
      lastActivityAt.current = Date.now();
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(checkInactivity, ADMIN_IDLE_TIMEOUT_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkInactivity();
    };

    const heartbeat = () => {
      void axiosInstance.post('/api/admin/session-heartbeat').catch((error) => {
        console.error('Could not update admin activity status:', error);
      });
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'mousemove',
      'scroll',
      'touchstart',
    ];
    activityEvents.forEach((event) => {
      window.addEventListener(event, recordActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    timeoutId = window.setTimeout(checkInactivity, ADMIN_IDLE_TIMEOUT_MS);
    heartbeat();
    heartbeatId = window.setInterval(heartbeat, 30_000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(heartbeatId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, recordActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [admin?.id, queryClient, router]);

  if (isLoading || !admin) {
    return (
      <div className="w-full min-h-screen bg-black flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-gray-100 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;