"use client";

import { SessionProvider } from "next-auth/react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [user, setUser] = useState<{ id: number; role_id: number } | null>(null);

  // Récupérer l'utilisateur connecté
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser({
              id: data.user.id,
              role_id: data.user.role_id || 0,
            });
          }
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error);
      }
    }

    if (!isLoginPage) {
      fetchUser();
    }
  }, [isLoginPage]);

  if (isLoginPage) {
    return <div className="container-scroller">{children}</div>;
  }

  return (
    <div className="container-scroller">
      <Header />
      <div className="container-fluid page-body-wrapper">
        <Sidebar />
        <div className="main-panel">
          <div className="content-wrapper">{children}</div>
          <Footer />
        </div>
      </div>
    </div>
  );
}
