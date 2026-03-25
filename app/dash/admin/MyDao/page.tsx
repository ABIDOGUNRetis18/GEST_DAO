"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Dao {
  id: number;
  numero: string;
  reference: string;
  autorite: string;
  date_depot?: string;
  statut?: string;
  chef_projet?: string;
}

export default function MyDaoPage() {
  const router = useRouter();
  const [daos, setDaos] = useState<Dao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enCours" | "aRisque">("all");

  const computeStatus = (dao: Dao): { label: string; className: string } => {
    const today = new Date();
    const rawStatut = String(dao.statut || "").toUpperCase();

    if (rawStatut === "TERMINEE" || rawStatut === "TERMINE") {
      return {
        label: "Terminée",
        className: "bg-green-100 text-green-800",
      };
    }

    if (!dao.date_depot) {
      return {
        label: "En cours",
        className: "bg-yellow-100 text-yellow-800",
      };
    }

    const dateDepot = new Date(dao.date_depot);
    const diffMs = dateDepot.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays >= 5 || diffDays === 4) {
      return {
        label: "EN COURS",
        className: "bg-yellow-100 text-yellow-800",
      };
    }

    if (diffDays <= 3) {
      return {
        label: "À risque",
        className: "bg-red-100 text-red-800",
      };
    }

    return {
      label: "En cours",
      className: "bg-yellow-100 text-yellow-800",
    };
  };

  useEffect(() => {
    loadDaos();
  }, []);

  async function loadDaos() {
    try {
      setLoading(true);
      setError("");
      // Récupérer l'utilisateur courant depuis le localStorage (même logique que le Header)
      const storedUser =
        typeof window !== "undefined" ? localStorage.getItem("user") : null;

      if (!storedUser) {
        setDaos([]);
        setError("Utilisateur non authentifié");
        return;
      }

      let currentUserId: number | null = null;
      let roleId: number | null = null;
      try {
        const parsed = JSON.parse(storedUser);
        currentUserId = Number(parsed.id);
        roleId = Number(parsed.role_id ?? parsed.roleId);
      } catch (e) {
        console.error("Erreur lors du parsing de l'utilisateur depuis localStorage:", e);
        setDaos([]);
        setError("Utilisateur non authentifié");
        return;
      }

      if (!currentUserId || Number.isNaN(currentUserId)) {
        setDaos([]);
        setError("Utilisateur non authentifié");
        return;
      }

      // Récupérer tous les DAO
      const res = await fetch("/api/dao", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("API /api/dao error:", json);
        setDaos([]);
        setError(json?.message || "Erreur lors du chargement des DAO");
        return;
      }

      // API renvoie { success: true, data: [...] }
      const rows = Array.isArray(json?.data) ? (json.data as Dao[]) : [];

      // Filtrer pour ne garder que les DAO dont le chef correspond à l'utilisateur courant
      const filtered = rows.filter(
        (dao: any) => Number(dao.chef_id) === Number(currentUserId),
      );

      setDaos(filtered);
    } catch (err) {
      console.error("Error fetching DAOs:", err);
      setDaos([]);
      setError("Erreur réseau lors du chargement des DAO");
    } finally {
      setLoading(false);
    }
  }

  const filteredDaos = daos.filter((dao: Dao) => {
    const term = searchTerm.toLowerCase();
    const numero = dao.numero?.toLowerCase() || "";
    const reference = dao.reference?.toLowerCase() || "";
    const autorite = dao.autorite?.toLowerCase() || "";

    const matchesSearch = !term
      ? true
      : numero.includes(term) || reference.includes(term) || autorite.includes(term);

    const rawStatut = String(dao.statut || "");
    const normalizedStatus =
      rawStatut === "aRisque" || rawStatut === "enCours" ? rawStatut : undefined;

    const matchesStatus =
      statusFilter === "all" || normalizedStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="sr-only">Chargement...</span>
          </div>
          <p className="mt-2">Chargement des DAO...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="alert alert-danger">{error}</div>
          <button className="btn btn-primary mt-3" onClick={loadDaos}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="bg-gray-50 p-6 no-print">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-gray-900">Mes DAO</h3>

              <div className="flex items-center gap-3">
                <input
                  placeholder="Rechercher (n°, objet, équipe...)"
                  className="px-3 py-2 border rounded w-72 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                  className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
                  type="button"
                  onClick={() =>
                    setStatusFilter((prev) =>
                      prev === "all" ? "enCours" : prev === "enCours" ? "aRisque" : "all",
                    )
                  }
                >
                  {statusFilter === "all"
                    ? "Tous les statuts"
                    : statusFilter === "enCours"
                      ? "En cours seulement"
                      : "À risque seulement"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* DAO list */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">
              Cliquer sur une carte pour ouvrir le détail
            </span>
          </div>

          {filteredDaos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Aucun DAO trouvé.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredDaos.map((dao) => (
                <article
                  key={dao.id}
                  onClick={() => router.push(`/dash/ChefProjet/task/${dao.id}`)}
                  className="bg-white p-4 rounded shadow cursor-pointer hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">N° {dao.numero}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {dao.reference} - {dao.autorite}
                      </p>
                    </div>
                    {(() => {
                      const s = computeStatus(dao);
                      return (
                        <span
                          className={`px-2 py-1 rounded text-xs ${s.className}`}
                        >
                          {s.label}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Date dépôt</span>
                      <span className="font-medium">
                      {new Date(dao.date_depot!).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric'
                          })}
                      </span>
                    </div>

                   
                  </div>

                  <div className="mt-3 text-sm text-gray-500">
                    Chef: {dao.chef_projet || "N/A"}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
