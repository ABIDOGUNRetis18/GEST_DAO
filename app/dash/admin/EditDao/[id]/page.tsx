"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Dao {
  id: number;
  numero: string;
  reference: string;
  autorite: string;
  date_depot?: string;
  objet?: string;
  description?: string;
  chef_id?: number | null;
  chef_projet?: string | null;
  statut?: string | null;
  groupement?: string | null;
  nom_partenaire?: string | null;
  type_dao?: string | null;
  membres?: string[];
}

export default function EditDaoPage() {
  const router = useRouter();
  const params = useParams();
  const daoId = params.id as string;

  const [dao, setDao] = useState<Dao | null>(null);
  const [dateDepot, setDateDepot] = useState("");
  const [objet, setObjet] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [autorite, setAutorite] = useState("");
  const [chefEquipe, setChefEquipe] = useState("");
  const [membres, setMembres] = useState<string[]>([]);
  const [users, setUsers] = useState<
    Array<{ id: number; username: string; role: string }>
  >([]);
  const [teamLeaders, setTeamLeaders] = useState<
    Array<{ id: number; username: string; role: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [membresOpen, setMembresOpen] = useState(false);
  const membresRef = useRef<HTMLDivElement | null>(null);
  const membresButtonRef = useRef<HTMLButtonElement | null>(null);
  const [membresFlipUp, setMembresFlipUp] = useState(false);
  const [groupement, setGroupement] = useState<string>("");
  const [nomPartenaire, setNomPartenaire] = useState("");
  const [typeDao, setTypeDao] = useState<string>("");
  const [typeDaoOptions, setTypeDaoOptions] = useState<Array<{ value: string; label: string; description: string }>>([]);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeCode, setNewTypeCode] = useState("");
  const [typesExpanded, setTypesExpanded] = useState(true);

  const groupementOptions = [
    { value: "oui", label: "Oui", description: "DAO avec groupement d'entreprises" },
    { value: "non", label: "Non", description: "DAO sans groupement" }
  ];

  useEffect(() => {
    loadDaoTypes();
    loadDao();
    loadUsers();
  }, [daoId]);

  async function loadDao() {
    try {
      console.log("=== CHARGEMENT DAO ===");
      console.log("DAO ID:", daoId);
      setLoading(true);
      
      const res = await fetch(`/api/dao/${daoId}`);
      console.log("Response status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response:", errorText);
        throw new Error(`DAO non trouvé (status: ${res.status})`);
      }
      
      const data = await res.json();
      console.log("Response data:", JSON.stringify(data, null, 2));
      
      const daoData = data.data || data;
      console.log("DAO data extracted:", JSON.stringify(daoData, null, 2));
      
      if (!daoData) {
        throw new Error("Aucune donnée DAO trouvée dans la réponse");
      }
      
      setDao(daoData);
      console.log("=== PRÉ-REMPLISSAGE DES CHAMPS ===");
      console.log("date_depot:", daoData.date_depot);
      console.log("objet:", daoData.objet);
      console.log("description:", daoData.description);
      console.log("reference:", daoData.reference);
      console.log("autorite:", daoData.autorite);
      console.log("chef_id:", daoData.chef_id);
      console.log("membres:", daoData.membres, "type:", typeof daoData.membres, "isArray:", Array.isArray(daoData.membres));
      console.log("groupement:", daoData.groupement);
      console.log("nom_partenaire:", daoData.nom_partenaire);
      console.log("type_dao:", daoData.type_dao);
      console.log("statut:", daoData.statut);
      
      // Conversion correcte de la date
      const formattedDate = daoData.date_depot ? 
        new Date(daoData.date_depot).toISOString().split('T')[0] : "";
      
      // Conversion des membres en tableau de strings
      let membresArray: string[] = [];
      if (daoData.membres) {
        if (typeof daoData.membres === 'string') {
          // Si c'est une chaîne comme "{41, 79}"
          const cleaned = daoData.membres.replace(/[{}]/g, '');
          membresArray = cleaned.split(",").map((m: string) => m.trim()).filter((m: string) => m);
        } else if (Array.isArray(daoData.membres)) {
          // Si c'est déjà un tableau
          membresArray = daoData.membres.map((m: any) => m.toString());
        }
      }
      
      console.log("membresArray après conversion:", membresArray);
      
      setDateDepot(formattedDate);
      setObjet(daoData.objet || "");
      setDescription(daoData.description || "");
      setReference(daoData.reference || "");
      setAutorite(daoData.autorite || "");
      setChefEquipe(daoData.chef_id?.toString() || "");
      setMembres(membresArray);
      setGroupement(daoData.groupement || "");
      setNomPartenaire(daoData.nom_partenaire || "");
      setTypeDao(daoData.type_dao || "");
      
      console.log("=== CHAMPS PRÉ-REMPLIS AVEC SUCCÈS ===");
      console.log("État dateDepot:", formattedDate);
      console.log("État objet:", daoData.objet);
      console.log("État reference:", daoData.reference);
      console.log("État description:", daoData.description);
      console.log("État typeDao:", daoData.type_dao);
      console.log("État chefEquipe:", daoData.chef_id);
      console.log("État membres:", membresArray);
      
      console.log("DAO chargé avec succès");
    } catch (err) {
      console.error("Error loading DAO:", err);
      setError(`Erreur lors du chargement du DAO: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) return;
      const data = await res.json();
      const usersData = Array.isArray(data) ? data : (data.data || []);
      
      const getRoleName = (roleId: string | number): string => {
        const id = String(roleId);
        switch (id) {
          case '1': return 'Admin';
          case '2': return 'Admin';
          case '3': return 'ChefProjet';
          case '4': return 'MembreEquipe';
          default: return 'Utilisateur';
        }
      };

      // Pour les membres d'équipe : tous les utilisateurs peuvent être membres
      const membersList = usersData
        .map((u: any) => ({
          id: u.id,
          username: u.username || u.email || `user-${u.id}`,
          role: u.roleName || getRoleName(u.role_id || u.role),
          role_id: u.role_id || u.role
        }));
      setUsers(membersList);

      const teamLeadersList = usersData
        .filter((u: any) => {
          const roleId = Number(u.role_id || u.role);
          return roleId === 2 || roleId === 3;
        })
        .map((u: any) => ({
          id: u.id,
          username: u.username || u.email || `user-${u.id}`,
          role: getRoleName(u.role_id || u.role),
          role_id: u.role_id || u.role
        }));
      setTeamLeaders(teamLeadersList);
    } catch (err) {
      console.error("Erreur lors du chargement des utilisateurs:", err);
    }
  }

  async function loadDaoTypes() {
    try {
      const res = await fetch("/api/dao-types");
      if (!res.ok) {
        console.error("Erreur lors de la récupération des types de DAO:", await res.text());
        return;
      }
      const data = await res.json();
      if (data.success && data.data) {
        const types = data.data.map((type: any) => ({
          value: type.code,
          label: type.libelle,
          description: type.description || ""
        }));
        setTypeDaoOptions(types);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des types de DAO:", err);
    }
  }

  async function addNewType() {
    try {
      if (!newTypeCode) {
        setError("Le code du type est requis");
        return;
      }

      const res = await fetch("/api/dao-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: newTypeCode.toUpperCase(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.message || "Erreur lors de la création du type");
        return;
      }

      // Réinitialiser le formulaire
      setNewTypeCode("");
      setShowAddTypeModal(false);
      setError(null);

      // Recharger les types
      await loadDaoTypes();
      
      // Sélectionner automatiquement le nouveau type
      setTypeDao(newTypeCode.toUpperCase());
      
      alert("Type de DAO créé avec succès");
    } catch (err) {
      console.error("Error creating DAO type:", err);
      setError("Erreur réseau lors de la création du type");
    }
  }

  const toggleMembre = (id: number) => {
    const s = membres.includes(String(id))
      ? membres.filter((m) => m !== String(id))
      : [...membres, String(id)];
    setMembres(s);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        membresRef.current &&
        !membresRef.current.contains(e.target as Node)
      ) {
        setMembresOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openMembres = () => {
    if (!membresButtonRef.current) {
      setMembresOpen((v) => !v);
      return;
    }
    const rect = membresButtonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const menuEstimatedHeight = 260;
    if (spaceBelow < menuEstimatedHeight && spaceAbove > menuEstimatedHeight) {
      setMembresFlipUp(true);
    } else {
      setMembresFlipUp(false);
    }
    setMembresOpen((v) => !v);
  };

  const validate = () => {
    if (!dateDepot) return "La date de dépôt est requise.";
    if (!typeDao) return "Le type de DAO est requis.";
    if (!objet) return "L'objet est requis.";
    if (description.trim().length < 5)
      return "La description doit contenir au moins 5 caractères.";
    if (!reference) return "La référence est requise.";
    if (!autorite) return "L'autorité contractante est requise.";
    if (!chefEquipe) return "Le chef d'équipe doit être assigné.";
    if (membres.length === 0)
      return "Au moins un membre d'équipe doit être sélectionné.";
    
    if (groupement === "oui" && !nomPartenaire.trim()) {
      return "Le nom de l'entreprise partenaire est requis lorsque le groupement est sélectionné.";
    }
    
    return null;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date_depot: dateDepot,
        typeDao,
        objet,
        description,
        reference,
        autorite,
        chefEquipe,
        membres,
        groupement,
        nomPartenaire: groupement === "oui" ? nomPartenaire : null,
      };

      const res = await fetch(`/api/dao/${daoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.message || "Erreur lors de la mise à jour du DAO");
        return;
      }

      alert("DAO mis à jour avec succès");
      router.push("/dash/admin");
    } catch (err) {
      console.error("Error updating DAO:", err);
      setError("Erreur réseau lors de la mise à jour du DAO");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="sr-only">Chargement...</span>
          </div>
          <p className="mt-2 text-gray-600">Chargement du DAO...</p>
          <p className="mt-1 text-sm text-gray-500">DAO ID: {daoId}</p>
        </div>
      </div>
    );
  }

  if (error && !dao) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <i className="mdi mdi-alert-circle-outline" style={{ fontSize: "3rem" }}></i>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600">{error}</p>
          <div className="mt-4">
            <Link href="/dash/admin" className="btn btn-primary mr-2">
              Retour au dashboard
            </Link>
            <button 
              className="btn btn-outline-primary"
              onClick={() => window.location.reload()}
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5">
      <div className="card">
        <div className="card-body">
          <h3>Modifier le DAO #{dao?.numero}</h3>
          <p>Mettez à jour les informations du dossier d'appel d'offres</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">
                Numéro de liste (automatique)
              </label>
              <input
                className="form-control"
                value={dao?.numero || ""}
                readOnly
              />
              <div className="form-text">
                Numéro généré automatiquement (non modifiable)
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Date de dépôt *</label>
              <input
                type="date"
                className="form-control"
                value={dateDepot}
                onChange={(e) => setDateDepot(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Type de DAO *</label>
              
              <div className="d-flex align-items-center gap-2 mb-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center p-1"
                  onClick={() => setTypesExpanded(!typesExpanded)}
                  style={{ width: "28px", height: "28px" }}
                  title={typesExpanded ? "Replier les types" : "Déplier les types"}
                >
                  <i className={`mdi mdi-chevron-${typesExpanded ? 'up' : 'down'}`}></i>
                </button>
                <span className="text-muted small">Types disponibles</span>
                <button
                  type="button"
                  className="btn btn-sm btn-primary d-flex align-items-center justify-content-center p-1"
                  onClick={() => setShowAddTypeModal(true)}
                  title="Ajouter un nouveau type de DAO"
                  style={{ width: "28px", height: "28px" }}
                >
                  <i className="mdi mdi-plus"></i>
                </button>
              </div>
              
              {typesExpanded && (
                <div className="border p-3 bg-white rounded-lg">
                  {/* Options de type de DAO */}
                  {typeDaoOptions.map((option) => (
                    <div key={option.value} className="mb-2 last:mb-0">
                      <label
                        className="form-check d-flex align-items-start cursor-pointer p-2 rounded hover:bg-gray-50"
                        style={{
                          gap: "12px",
                          fontSize: "0.95rem",
                        }}
                      >
                        <input
                          className="form-check-input mt-1"
                          type="radio"
                          name="typeDao"
                          value={option.value}
                          checked={typeDao === option.value}
                          onChange={() => setTypeDao(option.value)}
                          style={{
                            width: 18,
                            height: 18,
                            minWidth: 18,
                            minHeight: 18,
                            margin: 0,
                          }}
                        />
                        <div className="flex-1">
                          <div className="form-check-label fw-medium">
                            {option.label}
                          </div>
                          <div className="text-muted small">
                            {option.description}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label">Référence *</label>
              <input
                className="form-control"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="ex: AMI-2025-SYSINFO"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Type de groupement</label>
              
              <div className="border p-3 bg-white rounded-lg">
                {/* Options de groupement dynamiques */}
                {groupementOptions.map((option) => (
                  <div key={option.value} className="mb-2 last:mb-0">
                    <label
                      className="form-check d-flex align-items-start cursor-pointer p-2 rounded hover:bg-gray-50"
                      style={{
                        gap: "12px",
                        fontSize: "0.95rem",
                      }}
                    >
                      <input
                        className="form-check-input mt-1"
                        type="radio"
                        name="groupement"
                        value={option.value}
                        checked={groupement === option.value}
                        onChange={() => {
                          setGroupement(option.value);
                          // Réinitialiser le nom du partenaire si l'option "non" est sélectionnée
                          if (option.value === "non") {
                            setNomPartenaire("");
                          }
                        }}
                        style={{
                          width: 18,
                          height: 18,
                          minWidth: 18,
                          minHeight: 18,
                          margin: 0,
                        }}
                      />
                      <div className="flex-1">
                        <div className="form-check-label fw-medium">
                          {option.label}
                        </div>
                        <div className="text-muted small">
                          {option.description}
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Champ dynamique pour le nom du partenaire */}
            {groupement === "oui" && (
              <div className="mb-3 animate-fadeIn">
                <label className="form-label">Nom de l'entreprise partenaire *</label>
                <input
                  className="form-control"
                  value={nomPartenaire}
                  onChange={(e) => setNomPartenaire(e.target.value)}
                  placeholder="Entrez le nom de l'entreprise partenaire"
                  required
                />
              </div>
            )}

            <div className="mb-3">
              <label className="form-label">Objet du dossier *</label>
              <input
                className="form-control"
                value={objet}
                onChange={(e) => setObjet(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">
                Description détaillée du projet (minimum 5 caractères)
              </label>
              <textarea
                className="form-control"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="form-text">
                {description.length}/5 caractères minimum
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Autorité contractante *</label>
              <input
                className="form-control"
                value={autorite}
                onChange={(e) => setAutorite(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Chef Projet *</label>
              <select
                className="form-select"
                value={chefEquipe}
                onChange={(e) => setChefEquipe(e.target.value)}
                required
              >
                <option value="">Sélectionnez un chef Projet</option>
                {teamLeaders.length > 0 ? (
                  teamLeaders.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.role})
                    </option>
                  ))
                ) : (
                  <option disabled>Aucun chef d'équipe disponible</option>
                )}
              </select>
            </div>

            <div
              className="mb-3"
              style={{ position: "relative" }}
              ref={membresRef}
            >
              <label className="form-label">Membres d'équipe *</label>
              <button
                ref={membresButtonRef}
                type="button"
                className="btn btn-light w-100 text-start"
                onClick={openMembres}
              >
                {membres.length > 0
                  ? `${membres.length} membre(s) sélectionné(s)`
                  : "Sélectionner des membres..."}
              </button>
              {membresOpen && (
                <div
                  className="border p-2 bg-white"
                  style={{
                    position: "absolute",
                    zIndex: 50,
                    maxHeight: 240,
                    overflow: "auto",
                    width: "100%",
                    ...(membresFlipUp
                      ? { bottom: "calc(100% + 8px)" }
                      : { top: "calc(100% + 8px)" }),
                  }}
                >
                  {users.length === 0 && (
                    <div className="text-muted">Aucun membre disponible</div>
                  )}
                  {users.map((u) => (
                    <label
                      key={u.id}
                      className="form-check d-flex align-items-center"
                      style={{
                        cursor: "pointer",
                        padding: "6px 8px",
                        gap: "8px",
                        fontSize: "0.95rem",
                      }}
                    >
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`m-${u.id}`}
                        checked={membres.includes(String(u.id))}
                        onChange={() => toggleMembre(u.id)}
                        style={{
                          width: 18,
                          height: 18,
                          minWidth: 18,
                          minHeight: 18,
                          margin: 0,
                          appearance: "checkbox",
                        }}
                      />
                      <span
                        className="form-check-label"
                        style={{
                          lineHeight: "1.2rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {u.username}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="d-flex justify-content-end gap-2">
              <Link href="/dash/admin" className="btn btn-light">
                Annuler
              </Link>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Enregistrement..." : "Mettre à jour le DAO"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal pour ajouter un nouveau type de DAO */}
      {showAddTypeModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Ajouter un nouveau type de DAO</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowAddTypeModal(false);
                    setNewTypeCode("");
                    setError(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Code du type de DAO *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newTypeCode}
                    onChange={(e) => setNewTypeCode(e.target.value)}
                    placeholder="Ex: NOUVEAU"
                    maxLength={20}
                    required
                  />
                  <div className="form-text">
                    Lettres majuscules et chiffres uniquement
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddTypeModal(false);
                    setNewTypeCode("");
                    setError(null);
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={addNewType}
                >
                  Créer le type
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
