"use client";

import { useEffect, useState } from "react";

export default function Sidebar() {
  const [roleId, setRoleId] = useState<number | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setRoleId(user.role_id);
    }
  }, []);

  if (!roleId) return null; // évite le flash au chargement

  return (
    <nav className="sidebar sidebar-offcanvas" id="sidebar">
      <ul className="nav">
        {/* DASHBOARD (tous les rôles) */}
        <li className="nav-item active">
          <a
            className="nav-link"
            href={
              roleId === 1
                ? "/dash/DirecteurGeneral"
                : roleId === 2
                  ? "/dash/admin"
                  : roleId === 3
                    ? "/dash/ChefProjet"
                    : roleId === 4
                      ? "/dash/MembreEquipe"
                      : "/dash/Lecteur"
            }
          >
            <i className="mdi mdi-view-dashboard menu-icon"></i>
            <span className="menu-title">Dashboard</span>
          </a>
        </li>

        {/* ADMIN SEULEMENT */}
        {roleId === 2 && (
          <>
            <li className="nav-item">
              <a className="nav-link" href="/admin/add">
                <i className="mdi mdi-account-plus menu-icon"></i>
                <span className="menu-title">Créer un utilisateur</span>
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/dash/admin/CreateDao">
                <i className="mdi mdi-folder-plus menu-icon"></i>
                <span className="menu-title">Créer un DAO</span>
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/dash/admin/MyDao/">
                <i className="mdi mdi-file-document-multiple menu-icon"></i>
                <span className="menu-title">Mes DAO</span>
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/dash/admin/allDao/">
                <i className="mdi mdi-file-document-multiple menu-icon"></i>
                <span className="menu-title">Tous les DAO</span>
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/dash/admin/MyTasks/">
                <i className="mdi mdi-clipboard-check menu-icon"></i>
                <span className="menu-title">Mes tâches</span>
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/dash/admin/History/">
                <i className="mdi mdi-history menu-icon"></i>
                <span className="menu-title">Historique</span>
              </a>
            </li>
          </>
        )}

        {/* CHEF DE PROJET */}
        {roleId === 3 && (
          <>
            <li className="nav-item">
              <a className="nav-link" href="/dash/ChefProjet/MyDao/">
                <i className="mdi mdi-file-document-multiple menu-icon"></i>
                <span className="menu-title">Mes DAO</span>
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/dash/ChefProjet/MesEquipes/">
                <i className="mdi mdi-account-group menu-icon"></i>
                <span className="menu-title">Mes equipes</span>
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/dash/admin/MyTasks/">
                <i className="mdi mdi-clipboard-check menu-icon"></i>
                <span className="menu-title">Mes tâches</span>
              </a>
            </li>
          </>
        )}

        {/* DirecteurGeneral */}
        {roleId === 1 && (
          <li className="nav-item">
          </li>
        )}

        {/* MembreEquipe */}
        {roleId === 4 && (
          <li className="nav-item">
            <a className="nav-link" href="/dash/MembreEquipe/task">
              <i className="mdi mdi-file-document-multiple menu-icon"></i>
              <span className="menu-title">Mes taches</span>
            </a>
          </li>
        )}

        {/* Lecteur */}
        {roleId === 5 && (
          <li className="nav-item">
            <a className="nav-link" href="/dash/Lecteur/allDao">
              <i className="mdi mdi-folder-plus menu-icon"></i>
              <span className="menu-title">Tous les DAO</span>
            </a>
          </li>
        )}
      </ul>
    </nav>
  );
}
