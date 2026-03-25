"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface Dao {
  id: number;
  numero: string;
  reference: string;
  autorite: string;
  date_depot?: string;
  chef_id?: number | null;
  chef_projet?: string | null;
  statut?: string | null; // optionnel si ajouter plus tard dans la DB
  groupement?: string | null; // type de groupement
  nom_partenaire?: string | null; // nom du partenaire si groupement
  type_dao?: string | null; // type de DAO (AMI/DP/DC/AAO)
}

export default function Page() {
  const [daos, setDaos] = useState<Dao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
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

    fetchUser();
  }, []);

  // Vérifier les dates de dépôt et envoyer des emails
  useEffect(() => {
    if (!user) return;

    async function checkDepositsAndSendEmails() {
      try {
        const res = await fetch(`/api/notifications?userId=${user!.id}&checkDeposits=true`, {
          cache: "no-store",
        });

        if (res.ok) {
          const data = await res.json();
          console.log("Notifications de dépôt vérifiées:", data);
          // Les emails sont envoyés automatiquement par l'API
        }
      } catch (error) {
        console.error("Erreur lors de la vérification des dépôts:", error);
      }
    }

    checkDepositsAndSendEmails();
    
    // Vérifier toutes les 5 minutes
    const interval = setInterval(checkDepositsAndSendEmails, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const computeStatus = (dao: Dao): { label: string; className: string } => {
    const today = new Date();
    const rawStatut = String(dao.statut || "").toUpperCase();

    // Si terminé (équivalent à 100% d'avancement) => vert
    if (rawStatut === "TERMINEE" || rawStatut === "TERMINE") {
      return {
        label: "Terminée",
        className: "badge bg-success text-white",
      };
    }

    // Sinon, appliquer les règles sur la date de dépôt
    if (!dao.date_depot) {
      return {
        label: "En cours",
        className: "badge bg-warning text-dark",
      };
    }

    const dateDepot = new Date(dao.date_depot);
    // Nombre de jours restants : date_depot - aujourd'hui
    const diffMs = dateDepot.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // ≥ 5 jours (ou 4) => En cours (jaune)
    if (diffDays >= 5 || diffDays === 4) {
      return {
        label: "En cours",
        className: "badge bg-warning text-dark",
      };
    }

    // ≤ 3 jours ou passé => À risque (rouge)
    if (diffDays <= 3) {
      return {
        label: "À risque",
        className: "badge bg-danger text-white",
      };
    }

    return {
      label: "En cours",
      className: "badge bg-warning text-dark",
    };
  };

  async function loadDaos() {
    try {
      setLoading(true);
      setError("");

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
      setDaos(rows);
    } catch (err) {
      console.error("Error fetching DAOs:", err);
      setDaos([]);
      setError("Erreur réseau lors du chargement des DAO");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteDao(daoId: number) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce DAO ?")) return;

    try {
      const res = await fetch(`/api/dao/${daoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur lors de la suppression");

      // Recharger les DAOs
      await loadDaos();
    } catch (err) {
      console.error("Error deleting DAO:", err);
      alert("Erreur lors de la suppression du DAO");
    }
  }

  async function handleUpdateStatut(daoId: number, statut: string) {
    try {
      const res = await fetch(`/api/dao/${daoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) throw new Error("Erreur lors de la mise à jour");

      // Recharger les DAOs
      await loadDaos();
    } catch (err) {
      console.error("Error updating DAO statut:", err);
      alert("Erreur lors de la mise à jour du statut");
    }
  }

  useEffect(() => {
    loadDaos();
  }, []);

  const stats = useMemo(() => {
    const total = daos.length;

    let enCours = 0;
    let aRisque = 0;
    let terminees = 0;

    const today = new Date();

    daos.forEach((d) => {
      const statut = String(d.statut || "").toUpperCase();

      // 1) Si terminé (équivalent à 100% d'avancement) => carte verte
      if (statut === "TERMINEE") {
        terminees += 1;
        return;
      }

      // 2) Sinon, appliquer les règles sur la date de dépôt
      if (!d.date_depot) {
        // Pas de date => considérer comme en cours
        enCours += 1;
        return;
      }

      const dateDepot = new Date(d.date_depot);
      // Nombre de jours restants avant la date de dépôt : date_depot - aujourd'hui
      const diffMs = dateDepot.getTime() - today.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Si Date dépôt - Date aujourd'hui ≥ 5 jours => En cours (jaune)
      if (diffDays >= 5) {
        enCours += 1;
        return;
      }

      // Si Date dépôt - Date aujourd'hui ≤ 3 jours => À risque (rouge)
      if (diffDays <= 3) {
        aRisque += 1;
        return;
      }

      // Cas intermédiaire (par ex. 4 jours) => En cours par défaut
      enCours += 1;
    });

    return { total, enCours, aRisque, terminees };
  }, [daos]);

  return (
    <>
      {/* ROW 1 - Header with breadcrumb */}
      <div className="row">
        <div className="col-12 grid-margin">
          <div className="d-flex justify-content-between flex-wrap">
            <div className="d-flex align-items-end flex-wrap">
              <div className="mr-md-3 mr-xl-5">
                <h4>Bienvenue Admin</h4>
                <p className="mb-md-0">Voici les statistiques des DAO.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS SECTION */}
      <div className="row">
        <div className="col-12 grid-margin stretch-card">
          <div className="card">
            <div className="card-body dashboard-tabs p-0">
              <div className="tab-content py-0 px-0">
                <div className="tab-pane fade show active" id="overview" role="tabpanel">
                  <div className="d-flex flex-wrap justify-content-xl-between">
                    {/* block 1 */}
                    <div
                      className="d-none d-xl-flex border-md-right flex-grow-1 align-items-center justify-content-center p-3 item"
                      style={{ background: "linear-gradient(90deg, #f5f5f5, #e0e0e0)" }}
                    >
                      <i className="mdi mdi-calendar icon-lg mr-3 text-secondary"></i>
                      <div className="d-flex flex-column justify-content-around">
                        <small className="mb-1 text-muted">Total DAO</small>
                        <h4 className="mb-0">{stats.total}</h4>
                      </div>
                    </div>

                    {/* block 2 */}
                    <div
                      className="d-flex border-md-right flex-grow-1 align-items-center justify-content-center p-3 item"
                      style={{ background: "linear-gradient(90deg, #fff9c4, #fff176)" }}
                    >
                      <i className="mdi mdi-timer-sand mr-3 icon-lg text-warning"></i>
                      <div className="d-flex flex-column justify-content-around">
                        <small className="mb-1 text-muted">En cours</small>
                        <h4 className="mb-0">{stats.enCours}</h4>
                      </div>
                    </div>

                    {/* block 3 */}
                    <div
                      className="d-flex border-md-right flex-grow-1 align-items-center justify-content-center p-3 item"
                      style={{ background: "linear-gradient(90deg, #ffebee, #ef9a9a)" }}
                    >
                      <i className="mdi mdi-alert mr-3 icon-lg text-danger"></i>
                      <div className="d-flex flex-column justify-content-around">
                        <small className="mb-1 text-muted">À risque</small>
                        <h4 className="mb-0">{stats.aRisque}</h4>
                      </div>
                    </div>

                    {/* block 4 */}
                    <div
                      className="d-flex py-3 border-md-right flex-grow-1 align-items-center justify-content-center p-3 item"
                      style={{ background: "linear-gradient(90deg, #e8f5e9, #a5d6a7)" }}
                    >
                      <i className="mdi mdi-checkbox-marked mr-3 icon-lg text-success"></i>
                      <div className="d-flex flex-column justify-content-around">
                        <small className="mb-1 text-muted">Terminés</small>
                        <h4 className="mb-0">{stats.terminees}</h4>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SALES TAB */}
                <div className="tab-pane fade" id="sales" role="tabpanel">
                  <div className="p-4">
                    <h4>Sales Data</h4>
                    <p>Sales information will be displayed here.</p>
                  </div>
                </div>

                {/* PURCHASES TAB */}
                <div className="tab-pane fade" id="purchases" role="tabpanel">
                  <div className="p-4">
                    <h4>Purchases Data</h4>
                    <p>Purchases information will be displayed here.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="row">
        <div className="col-12 stretch-card">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <p className="card-title mb-0">Tous les DAO</p>
                <div>
                  <button className="btn btn-sm btn-outline-primary mr-2" onClick={loadDaos} disabled={loading}>
                    Rafraîchir
                  </button>
                  <a href="/dash/admin/CreateDao" className="btn btn-sm btn-primary">
                    Créer DAO
                  </a>
                </div>
              </div>

              {error ? <div className="alert alert-danger mt-3 mb-0">{error}</div> : null}

              <div className="table-responsive mt-3">
                <table id="recent-purchases-listing" className="table table-hover">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Type de DAO</th>
                      <th>Référence</th>
                      <th>Autorité contractante</th>
                      <th>Chef Projet</th>
                      <th>Groupement</th>
                      <th>Statut</th>
                     
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8}>Chargement...</td>
                      </tr>
                    ) : daos.length === 0 ? (
                      <tr>
                        <td colSpan={8}>Aucun DAO pour le moment.</td>
                      </tr>
                    ) : (
                      daos.map((dao) => (
                        <tr key={dao.id}>
                          {/* "Nom" : numero, sinon on peux mettre objet si on le renvoies */}
                          <td>{dao.numero}</td>
                          <td>
                            <span className="badge bg-info text-white">
                              {dao.type_dao || 'N/A'}
                            </span>
                          </td>
                          <td>{dao.reference}</td>
                          <td>{dao.autorite}</td>
                          <td>{dao.chef_projet || 'N/A'}</td>
                          <td>
                            {dao.groupement === "oui" ? (
                              dao.nom_partenaire ? (
                                <span style={{ whiteSpace: "pre-wrap" }}>
                                  {dao.nom_partenaire.replace(/,/g, ",\n")}
                                </span>
                              ) : (
                                <span>-</span>
                              )
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                          <td>
                            {(() => {
                              const s = computeStatus(dao);
                              return <span className={s.className}>{s.label}</span>;
                            })()}
                          </td>
                          
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
