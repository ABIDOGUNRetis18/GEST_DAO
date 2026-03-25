"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DaoItem {
  id: number;
  numero: string;
  objet?: string;
  reference: string;
  autorite: string;
  date_depot: string | null;
  statut: string;
  chef_projet?: string;
  progression?: number;
  type_dao?: string;
}

export default function DashboardChefEquipe() {
  const router = useRouter();
  const [daos, setDaos] = useState<DaoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enCours" | "aRisque">("all");
  const [refreshing, setRefreshing] = useState(false);

  // Fonction pour rafraîchir la progression des DAOs
  const refreshProgression = async () => {
    setRefreshing(true);
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) return;

      const user = JSON.parse(storedUser);
      const chefId = user?.id;
      
      if (!chefId) return;

      const res = await fetch(`/api/dao?chefId=${chefId}`);
      if (!res.ok) return;

      const data = await res.json();
      const list: DaoItem[] = data?.data || [];
      
      // Récupérer la progression pour chaque DAO
      const daosWithProgress = await Promise.all(
        list.map(async (dao) => {
          try {
            const tasksRes = await fetch(`/api/tasks?daoId=${dao.id}`);
            if (tasksRes.ok) {
              const tasksData = await tasksRes.json();
              const tasks = tasksData.data || [];
              
              // Calculer la progression moyenne
              if (tasks.length > 0) {
                const totalProgress = tasks.reduce((sum: number, task: any) => sum + (task.progress || 0), 0);
                const averageProgress = Math.round(totalProgress / tasks.length);
                return { ...dao, progression: averageProgress };
              }
            }
          } catch (error) {
            console.error(`Erreur lors du chargement des tâches pour DAO ${dao.id}:`, error);
          }
          return { ...dao, progression: 0 };
        })
      );
      
      setDaos(daosWithProgress);
    } catch (error) {
      console.error("Erreur lors du rafraîchissement de la progression:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        setError("Utilisateur non connecté");
        setLoading(false);
        return;
      }

      const user = JSON.parse(storedUser);
      const chefId = user?.id;

      if (!chefId) {
        setError("Identifiant du chef de projet introuvable");
        setLoading(false);
        return;
      }

      (async () => {
        try {
          const res = await fetch(`/api/dao?chefId=${chefId}`);
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            setError(data?.message || "Erreur lors du chargement des DAO");
            setLoading(false);
            return;
          }

          const data = await res.json();
          const list: DaoItem[] = data?.data || [];
          
          // Récupérer la progression pour chaque DAO
          const daosWithProgress = await Promise.all(
            list.map(async (dao) => {
              try {
                const tasksRes = await fetch(`/api/tasks?daoId=${dao.id}`);
                if (tasksRes.ok) {
                  const tasksData = await tasksRes.json();
                  const tasks = tasksData.data || [];
                  
                  // Calculer la progression moyenne
                  if (tasks.length > 0) {
                    const totalProgress = tasks.reduce((sum: number, task: any) => sum + (task.progress || 0), 0);
                    const averageProgress = Math.round(totalProgress / tasks.length);
                    return { ...dao, progression: averageProgress };
                  }
                }
              } catch (error) {
                console.error(`Erreur lors du chargement des tâches pour DAO ${dao.id}:`, error);
              }
              return { ...dao, progression: 0 };
            })
          );
          
          setDaos(daosWithProgress);
          setLoading(false);
        } catch (err) {
          console.error("Erreur chargement DAO chef projet", err);
          setError("Erreur réseau lors du chargement des DAO");
          setLoading(false);
        }
      })();
    } catch (e) {
      console.error("Erreur lecture utilisateur depuis localStorage", e);
      setError("Erreur interne lors de la récupération de l'utilisateur");
      setLoading(false);
    }
  }, []);

  // Rafraîchir la progression toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshProgression();
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, []);

  const filteredDaos = daos.filter((dao) => {
    const term = searchTerm.toLowerCase();
    const numero = dao.numero?.toLowerCase() || "";
    const objet = dao.objet?.toLowerCase() || "";
    const reference = dao.reference?.toLowerCase() || "";
    const matchesSearch = !term
      ? true
      : numero.includes(term) || objet.includes(term) || reference.includes(term);

    const matchesStatus =
      statusFilter === "all" || dao.statut === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
                <button
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    refreshing 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  type="button"
                  onClick={refreshProgression}
                  disabled={refreshing}
                  title={refreshing ? "Rafraîchissement en cours..." : "Rafraîchir la progression"}
                >
                  {refreshing ? '⏳' : '🔄'}
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

          {loading && (
            <p className="text-sm text-gray-500">Chargement des DAO...</p>
          )}

          {error && !loading && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {!loading && !error && filteredDaos.length === 0 && (
            <p className="text-sm text-gray-500">
              Aucun DAO ne vous est encore assigné.
            </p>
          )}

          {!loading && !error && filteredDaos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredDaos.map((dao) => (
                <article
                  key={dao.id}
                  onClick={() => router.push(`/dash/ChefProjet/task/${dao.id}`)}
                  className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-lg">N° {dao.numero}</h4>
                      {dao.type_dao && (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded mb-2">
                          {dao.type_dao}
                        </span>
                      )}
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {dao.objet || dao.reference}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        dao.statut === "aRisque"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {dao.statut === "aRisque" ? "À risque" : "En cours"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Date dépôt</span>
                      <span className="font-medium">
                        {new Date(dao.date_depot!).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric'
                          })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium">{dao.progression || 0}%</span>
                    </div>

                    <div className="w-full bg-gray-100 h-2 rounded-full">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          (dao.progression || 0) === 100 
                            ? 'bg-green-500' 
                            : (dao.progression || 0) > 0 
                              ? 'bg-blue-500' 
                              : 'bg-gray-300'
                        }`} 
                        style={{ width: `${dao.progression || 0}%` }} 
                      />
                    </div>

                    <div className="pt-1 text-gray-600">
                      Chef: <span className="font-medium">{dao.chef_projet || "-"}</span>
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
