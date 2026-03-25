"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<{
    id: string | number;
    username: string;
    email: string;
    url_photo: string;
    role_id: number;
  } | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLLIElement>(null);

  // Fonction pour formater correctement l'URL de la photo
  const formatPhotoUrl = (url: string | null | undefined) => {
    if (!url) return "/images/faces/face5.jpg";
    // Si l'URL commence par /uploads, on la laisse telle quelle car elle est déjà dans le dossier public
    // Sinon, on suppose que c'est un chemin relatif au dossier public
    return url.startsWith("/") ? url : `/${url}`;
  };

  // Fonction pour charger l'utilisateur depuis le localStorage
  const loadUserFromLocalStorage = () => {
    console.log("Chargement des données utilisateur depuis le localStorage...");
    const storedUser = localStorage.getItem("user");
    console.log(
      "Chargement des données utilisateur depuis le localStorage:",
      storedUser,
    );

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);

        const userData = {
          id: parsedUser.id,
          username:
            parsedUser.username ||
            parsedUser.email?.split("@")[0] ||
            "Utilisateur",
          email: parsedUser.email || "",
          url_photo: formatPhotoUrl(parsedUser.url_photo || ""),
          role_id: parsedUser.role_id || 0,
        };

        console.log("Données utilisateur formatées:", userData);
        setUser(userData);
      } catch (error) {
        console.error("Erreur lors du parsing des données utilisateur:", error);
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };

  // Fonction pour charger les messages
  const fetchMessages = async () => {
    if (!user?.id) return;

    console.log(' Header fetchMessages - Début du chargement');
    console.log(' User ID:', user.id);

    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/messages?user_id=${user.id}`);
      console.log(' Header fetchMessages - Response status:', response.status);
      
      const data = await response.json();
      console.log(' Header fetchMessages - Response data:', data);

      if (data.success) {
        console.log(' Header fetchMessages - Messages chargés:', data.data);
        setMessages(data.data || []);
      } else {
        console.log(' Header fetchMessages - Erreur API:', data.message);
        setMessages([]);
      }
    } catch (error) {
      console.error(" Header fetchMessages - Erreur lors du chargement des messages:", error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
      console.log(' Header fetchMessages - Fin du chargement');
    }
  };

  // Fonction pour charger les notifications
  const fetchNotifications = async () => {
    if (!user?.id) return;

    setLoadingNotifications(true);
    try {
      const response = await fetch(`/api/notifications?user_id=${user.id}`);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications || data.data || []);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Fonction pour masquer un message (ne pas le supprimer de la base)
  const deleteMessage = async (messageId: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!user?.id) return;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
      return;
    }

    try {
      const response = await fetch('/api/messages/hide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          message_id: messageId
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log(' Message masqué avec succès pour l\'utilisateur');
        // Rafraîchir les messages
        await fetchMessages();
      } else {
        console.error(' Erreur lors du masquage du message:', data.message);
      }
    } catch (error) {
      console.error(' Erreur réseau lors du masquage du message:', error);
    }
  };

  // Charger l'utilisateur au montage et écouter les changements
  useEffect(() => {
    // Charger les données initiales
    loadUserFromLocalStorage();

    // Fonction pour gérer les changements de stockage (depuis d'autres onglets)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user" || e.key === null) {
        console.log(
          "Changement détecté dans le localStorage, rechargement des données utilisateur",
        );
        loadUserFromLocalStorage();
      }
    };

    // Fonction pour gérer les mises à jour de l'utilisateur (même onglet)
    const handleUserUpdated = (e: CustomEvent) => {
      console.log(
        "Événement userUpdated reçu, mise à jour des données utilisateur",
      );
      if (e.detail) {
        setUser({
          id: e.detail.id,
          username:
            e.detail.username || e.detail.email?.split("@")[0] || "Utilisateur",
          email: e.detail.email || "",
          url_photo: formatPhotoUrl(e.detail.url_photo || ""),
          role_id: e.detail.role_id || 0,
        });
      } else {
        loadUserFromLocalStorage();
      }
    };

    // Ajouter les écouteurs d'événements
    window.addEventListener("storage", handleStorageChange);
    // @ts-ignore - TypeScript ne connaît pas encore ce type d'événement personnalisé
    window.addEventListener("userUpdated", handleUserUpdated as EventListener);

    // Nettoyer les écouteurs d'événements lors du démontage
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      // @ts-ignore
      window.removeEventListener(
        "userUpdated",
        handleUserUpdated as EventListener,
      );
    };
  }, []);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const toggleDropdown = async (name: string) => {
    const isOpening = openDropdown !== name;
    setOpenDropdown(prev => prev === name ? null : name);
    
    // Marquer les notifications comme lues quand on ouvre le dropdown
    if (isOpening && name === "notifications" && user?.id) {
      try {
        await fetch("/api/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id })
        });
        // Mettre à jour localement
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } catch (e) {
        console.error("Erreur marquage notifications:", e);
      }
    }
  };

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.nav-item.dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Charger les messages et notifications quand l'utilisateur change
  useEffect(() => {
    if (user?.id) {
      fetchMessages();
      fetchNotifications();
    }
  }, [user?.id]);

  // Rafraîchir les notifications périodiquement
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000); // Rafraîchir toutes les 30 secondes

    return () => clearInterval(interval);
  }, [user?.id]);

  // Fermer le menu quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      // Supprimer les données de l'utilisateur du localStorage
      localStorage.removeItem("user");
      localStorage.removeItem("role");

      // Réinitialiser l'état utilisateur
      setUser(null);

      // Rediriger vers la page de connexion
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);
      // En cas d'erreur, on nettoie quand même le localStorage et on redirige
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      setUser(null);
      router.push("/login");
    }
  };

  console.log("Rendu du Header - État utilisateur:", user);
  console.log("Rendu du Header - Messages:", messages);
  console.log("Rendu du Header - Messages count:", messages?.filter(m => !m.isRead).length || 0);

  return (
    <nav className="navbar col-lg-12 col-12 p-0 fixed-top d-flex flex-row">
      <div className="navbar-brand-wrapper d-flex justify-content-center">
        <div className="navbar-brand-inner-wrapper d-flex justify-content-between align-items-center w-100">
          <a className="navbar-brand brand-logo" href="#">
            <Image src="/images/logo.png" width={120} height={40} alt="logo" />
          </a>
          <a className="navbar-brand brand-logo-mini" href="#">
            <Image
              src="/images/logo-mini.png"
              width={40}
              height={40}
              alt="logo mini"
            />
          </a>
          <button
            className="navbar-toggler align-self-center"
            type="button"
            onClick={() => {
              const container = document.querySelector('.container-scroller');
              if (container) {
                container.classList.toggle("sidebar-icon-only");
              } else {
                document.body.classList.toggle("sidebar-icon-only");
              }
            }}
          >
            <span className="mdi mdi-sort-variant"></span>
          </button>
        </div>
      </div>
      <div className="navbar-menu-wrapper d-flex align-items-center justify-content-end">
        <ul className="navbar-nav navbar-nav-right">
          {/* Messages Dropdown */}
          <li className="nav-item dropdown mr-1">
            <a
              className="nav-link d-flex justify-content-center align-items-center"
              href="#"
              onClick={(e) => { e.preventDefault(); toggleDropdown("messages"); }}
              aria-expanded={openDropdown === "messages"}
            >
              <i className="mdi mdi-message-text mx-0" style={{ fontSize: '20px' }}></i>
            </a>

            <div className={`dropdown-menu dropdown-menu-right navbar-dropdown${openDropdown === 'messages' ? ' show' : ''}`} style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <p className="mb-0 font-weight-normal float-left dropdown-header">
                Messages
              </p>
              {loadingMessages ? (
                <div className="dropdown-item">
                  <p className="font-weight-light small-text text-muted mb-0">
                    Chargement...
                  </p>
                </div>
              ) : messages?.length === 0 ? (
                <div className="dropdown-item">
                  <p className="font-weight-light small-text text-muted mb-0">
                    Aucun message
                  </p>
                </div>
              ) : (
                messages?.length > 0 && messages.map((message) => (
                  <div key={message?.id || Math.random()} className="dropdown-item position-relative">
                    <button
                      onClick={(e) => deleteMessage(message?.id, e)}
                      className="position-absolute top-0 right-0 btn btn-sm btn-link text-danger p-1"
                      style={{ zIndex: 10 }}
                      title="Masquer le message"
                    >
                      <i className="mdi mdi-close" style={{ fontSize: '14px' }}></i>
                    </button>
                    <div className="item-content flex-grow pr-4">
                      <h6 className="ellipsis font-weight-normal">
                        {message.user_name || 'Utilisateur'}
                        {!message.is_public && (
                          <span className="badge badge-warning ml-2">Privé</span>
                        )}
                      </h6>
                      <p className="font-weight-light small-text text-muted mb-0">
                        {message.content?.length > 1000 ? message.content.substring(0, 50) + '...' : message.content || 'Pas de contenu'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </li>

          {/* Notifications */}
          <li className="nav-item dropdown mr-1" style={{ position: "relative" }}>
            <a
              className="nav-link d-flex justify-content-center align-items-center"
              href="#"
              onClick={(e) => { e.preventDefault(); toggleDropdown("notifications"); }}
              aria-expanded={openDropdown === "notifications"}
            >
              <i className="mdi mdi-bell mx-0" style={{ fontSize: "20px" }}></i>
            </a>
            {notifications?.filter((n) => !n.isRead).length > 0 && (
              <span className="badge badge-danger" style={{ fontSize: "10px", position: "absolute", top: "4px", right: "4px", zIndex: 10 }}>
                {notifications.filter((n) => !n.isRead).length}
              </span>
            )}
            <div className={`dropdown-menu dropdown-menu-right navbar-dropdown${openDropdown === 'notifications' ? ' show' : ''}`} style={{ maxHeight: "400px", overflowY: "auto" }}>
              <p className="mb-0 font-weight-normal float-left dropdown-header">Notifications</p>
              {loadingNotifications ? (
                <div className="dropdown-item">
                  <p className="font-weight-light small-text text-muted mb-0">Chargement...</p>
                </div>
              ) : notifications?.length === 0 ? (
                <div className="dropdown-item">
                  <p className="font-weight-light small-text text-muted mb-0">Aucune notification</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id || Math.random()} className="dropdown-item">
                    <div className="item-content">
                      <h6 className="font-weight-normal">{notif.title}</h6>
                      <p className="font-weight-light small-text text-muted mb-0">{notif.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </li>
          {/* Profile Dropdown */}
          <li
            className="nav-item nav-profile dropdown"
            ref={menuRef}
            style={{ position: "relative" }}
          >
            <a
              className="nav-link dropdown-toggle d-flex align-items-center"
              href="#"
              role="button"
              onClick={toggleMenu}
              style={{ cursor: "pointer" }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  marginRight: "8px",
                }}
              >
                <Image
                  src={user?.url_photo || "/images/faces/face5.jpg"}
                  width={40}
                  height={40}
                  alt="Profile"
                  style={{
                    objectFit: "cover",
                    width: "100%",
                    height: "100%",
                  }}
                  onError={(e) => {
                    // En cas d'erreur de chargement, utiliser l'image par défaut
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/faces/face5.jpg";
                  }}
                />
              </div>
              <span className="nav-profile-name d-none d-sm-inline">
                {user?.username || user?.email?.split("@")[0] || "Utilisateur"}
              </span>
            </a>

            <div
              className={`dropdown-menu dropdown-menu-right navbar-dropdown${isMenuOpen ? " show" : ""}`}
              style={{
                display: isMenuOpen ? "block" : "none",
                position: "absolute",
                top: "100%",
                right: 0,
                zIndex: 1050,
                minWidth: "200px",
                padding: "0.5rem 0",
                margin: "0.125rem 0 0",
                fontSize: "0.875rem",
                color: "#212529",
                textAlign: "left",
                backgroundColor: "#fff",
                border: "1px solid rgba(0,0,0,.15)",
                borderRadius: "0.25rem",
                boxShadow: "0 0.5rem 1rem rgba(0,0,0,.175)",
              }}
            >
              <Link
                href="/profile"
                className="dropdown-item"
                onClick={closeMenu}
              >
                <i
                  className="mdi mdi-settings text-primary"
                  style={{ marginRight: "0.75rem", fontSize: "1.25rem" }}
                ></i>
                Profil
              </Link>
              <button onClick={handleLogout} className="dropdown-item">
                <i
                  className="mdi mdi-logout text-primary"
                  style={{ marginRight: "0.75rem", fontSize: "1.25rem" }}
                ></i>
                Logout
              </button>
            </div>
          </li>
        </ul>

        <button
          className="navbar-toggler navbar-toggler-right d-lg-none align-self-center"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="mdi mdi-menu"></span>
        </button>
      </div>
    </nav>
  );
}
