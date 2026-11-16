'use client';

import React from 'react';
import useAdmin from '../../../../hooks/useAdmin';

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { admin, isLoading } = useAdmin();

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