// components/LogoutButton.tsx
"use client";

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Utiliser la redirection fournie par le serveur ou '/login' par défaut
        const redirectUrl = data.redirectTo || "/login";
        // Forcer un rechargement complet de la page pour nettoyer l'état de l'application
        window.location.href = redirectUrl;
      } else {
        console.error(
          "Erreur lors de la déconnexion:",
          data.message || "Erreur inconnue",
        );
        // En cas d'erreur, rediriger vers la page de connexion
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      // En cas d'erreur, rediriger vers la page de connexion
      window.location.href = "/login";
    }
  };

  return (
    <button onClick={handleLogout} className="btn btn-outline-danger">
      <i className="mdi mdi-logout"></i> Déconnexion
    </button>
  );
}
