"use client";

import dynamic from "next/dynamic";

// Import dynamique pour éviter les problèmes de SSR avec les modales
const UsersTable = dynamic(() => import("./table"), { ssr: false });

export default function AdminUsersPage() {
  return <UsersTable />;
}
