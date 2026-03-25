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
  chef_id?: number;
  team_id?: string;
}

export default function AllDaoPage() {
  const router = useRouter();
  const [daos, setDaos] = useState<Dao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enCours" | "aRisque">("all");

  const computeStatus = (dao: Dao): { label: string; className: string } => {
    const today = new Date();
    const rawStatut = String(dao.statut || "").toUpperCase();

    // 1) Si terminé (équivalent à 100% d'avancement) => vert
    if (rawStatut === "TERMINEE" || rawStatut === "TERMINE") {
      return {
        label: "Terminée",
        className: "bg-green-100 text-green-800",
      };
    }

    // 2) Sinon, on applique la règle sur la date de dépôt
    if (!dao.date_depot) {
      return {
        label: "En cours",
        className: "bg-yellow-100 text-yellow-800",
      };
    }

    const dateDepot = new Date(dao.date_depot);
    const diffMs = dateDepot.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Si Date dépôt - Date aujourd'hui ≥ 5 jours => En cours (jaune)
    if (diffDays >= 5 || diffDays === 4) {
      return {
        label: "EN COURS",
        className: "bg-yellow-100 text-yellow-800",
      };
    }

    // Si Date dépôt - Date aujourd'hui ≤ 3 jours (ou passée) => À risque (rouge)
    if (diffDays <= 3) {
      return {
        label: "À risque",
        className: "bg-red-100 text-red-800",
      };
    }

    // Fallback
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

      const daoRes = await fetch("/api/dao", { cache: "no-store" });
      const daoJson = await daoRes.json().catch(() => ({}));

      if (!daoRes.ok) {
        console.error("API /api/dao error:", daoJson);
        setDaos([]);
        setError(daoJson?.message || "Erreur lors du chargement des DAO");
        return;
      }

      const allDaos = Array.isArray(daoJson?.data) ? (daoJson.data as Dao[]) : [];
      setDaos(allDaos);
    } catch (err) {
      console.error("Error fetching DAOs:", err);
      setDaos([]);
      setError("Erreur réseau lors du chargement des données");
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
          <p className="mt-2 text-gray-600">Chargement des DAO...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={loadDaos}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
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
              <h3 className="text-xl font-bold text-gray-900">Tous les DAO</h3>

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
                    ? "Filtrer par statut"
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
              {filteredDaos.length} DAO{filteredDaos.length > 1 ? 's' : ''} trouvé{filteredDaos.length > 1 ? 's' : ''}
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
                  className="bg-white p-4 rounded shadow cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h6 className="font-semibold text-lg">N° {dao.numero}</h6>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {dao.reference} - {dao.autorite}
                      </p>
                    </div>
                    {(() => {
                      const s = computeStatus(dao);
                      return (
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${s.className}`}
                        >
                          {s.label}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Date dépôt</span>
                      <span className="font-medium">
        {new Date(dao.date_depot || '').toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric'
                          })}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Chef projet</span>
                      <span className="font-medium">
                        {dao.chef_projet || "N/A"}
                      </span>
                    </div>
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
