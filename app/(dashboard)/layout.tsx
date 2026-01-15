'use client';

import React from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sidebar is already rendered by AuthLayout, so we just need to pass through children
  // This layout can be used for dashboard-specific styling or providers if needed
  return (
    <>
      {children}
    </>
  );
}