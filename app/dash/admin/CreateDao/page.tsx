"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

export default function NewDaoPage() {
  const [generatedNumber, setGeneratedNumber] = useState("");
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
    // Charger les types de DAO depuis l'API
    loadDaoTypes();
    
    // Récupérer le prochain numéro DAO depuis la base de données
    (async () => {
      try {
        console.log("=== DÉBOGAGE NUMÉRO DAO - DÉBUT ===");
        console.log("AVANT appel API - generatedNumber:", generatedNumber);
        
        const res = await fetch("/api/dao/next-number");
        console.log("Status API:", res.status);
        
        if (!res.ok) {
          console.error("Erreur lors de la récupération du prochain numéro DAO:", await res.text());
          // En cas d'erreur, utiliser un format par défaut
          const year = new Date().getFullYear();
          const num = `DAO-${year}-001`;
          console.log("API erreur - Utilisation par défaut:", num);
          setGeneratedNumber(num);
          return;
        }
        
        const data = await res.json();
        console.log("Réponse API complète:", JSON.stringify(data, null, 2));
        
        if (data.success && data.numero) {
          console.log("Prochain numéro DAO récupéré:", data.numero);
          console.log("AVANT setGeneratedNumber - generatedNumber:", generatedNumber);
          setGeneratedNumber(data.numero);
          console.log("APRÈS setGeneratedNumber - generatedNumber:", generatedNumber);
        } else {
          // Si pas de numéro retourné, utiliser un format par défaut
          const year = new Date().getFullYear();
          const num = `DAO-${year}-001`;
          console.log("API sans numéro - Utilisation par défaut:", num);
          setGeneratedNumber(num);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du numéro DAO:", error);
        // En cas d'erreur, utiliser un format par défaut
        const year = new Date().getFullYear();
        const num = `DAO-${year}-001`;
        console.log("Exception - Utilisation par défaut:", num);
        setGeneratedNumber(num);
      }
      
      console.log("=== DÉBOGAGE NUMÉRO DAO - FIN ===");
    })();

    // Charger utilisateurs (endpoint existant attendu : /api/users)
    (async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) {
          console.error("Erreur lors de la récupération des utilisateurs:", await res.text());
          return;
        }
        const data = await res.json();
        console.log("Données brutes de l'API:", JSON.stringify(data, null, 2));
        
        // Vérifier la structure des données
        const usersData = Array.isArray(data) ? data : (data.data || []);
        console.log("Liste des utilisateurs (après extraction):", JSON.stringify(usersData, null, 2));
        
        // Afficher les clés du premier utilisateur (si disponible)
        if (usersData.length > 0) {
          console.log("Clés du premier utilisateur:", Object.keys(usersData[0]));
          console.log("Valeurs du premier utilisateur:", JSON.stringify(usersData[0], null, 2));
          
          // Afficher les rôles disponibles
          const roles = [...new Set(usersData.map((u: any) => ({
            role_id: u.role_id,
            roleName: u.roleName,
            role: u.role                                                  
          })))];
          console.log("Rôles trouvés dans les données:", JSON.stringify(roles, null, 2));
        }
        
        // Fonction pour obtenir le nom du rôle en fonction de l'ID
        const getRoleName = (roleId: string | number): string => {
          const id = String(roleId);
          switch (id) {
            case '1': return 'Directeur';
            case '2': return 'Admin';
            case '3': return 'ChefProjet';
            case '4': return 'MembreEquipe';
            case '5': return 'Lecteur';
            default: return 'Utilisateur';
          }
        };

        console.log("=== DÉBOGAGE UTILISATEURS - DÉBUT ===");
        console.log("Nombre total d'utilisateurs:", usersData.length);
        
        // Vérifier spécifiquement l'utilisateur 41
        const user41 = usersData.find((u: any) => u.id === 41);
        console.log("Utilisateur 41 trouvé:", user41);
        if (user41) {
          console.log("Détails utilisateur 41:", {
            id: user41.id,
            username: user41.username,
            email: user41.email,
            role_id: user41.role_id,
            role: user41.role,
            roleName: user41.roleName
          });
        }
        
        // Afficher tous les utilisateurs avec leurs rôles
        console.log("Liste complète des utilisateurs:");
        usersData.forEach((u: any, index: number) => {
          console.log(`${index + 1}. ID: ${u.id}, Username: ${u.username}, Role ID: ${u.role_id}, Role: ${u.role}`);
        });
        
        const membersList = usersData
          .filter((u: any) => {
            const roleId = Number(u.role_id || u.role);
            // Exclure les rôles lecteur (5) et directeur (1)
            const isExcluded = roleId === 1 || roleId === 5;
            if (isExcluded) {
              console.log(`Utilisateur exclu: ${u.username} (ID: ${u.id}, Rôle: ${roleId} - ${getRoleName(roleId)})`);
            }
            return !isExcluded;
          })
          .map((u: any) => {
            const roleData = {
              id: u.id,
              username: u.username || u.email || `user-${u.id}`,
              role: u.roleName || getRoleName(u.role_id || u.role),
              role_id: u.role_id || u.role
            };
            
            // Log spécifique pour l'utilisateur 41
            if (u.id === 41) {
              console.log("=== TRANSFORMATION UTILISATEUR 41 ===");
              console.log("Données brutes:", u);
              console.log("roleName:", u.roleName);
              console.log("role_id:", u.role_id);
              console.log("role:", u.role);
              console.log("getRoleName result:", getRoleName(u.role_id || u.role));
              console.log("Données transformées:", roleData);
              console.log("=== FIN TRANSFORMATION UTILISATEUR 41 ===");
            }
            
            return roleData;
          });
        
        console.log("Liste des membres générée:", membersList);
        console.log("=== DÉBOGAGE UTILISATEURS - FIN ===");
        
        setUsers(membersList);
        
        // Log pour vérifier après setUsers
        setTimeout(() => {
          console.log("=== VÉRIFICATION APRÈS SETUSERS ===");
          console.log("State users actuel:", membersList.filter((u: any) => u.id === 41));
          console.log("=== FIN VÉRIFICATION SETUSERS ===");
        }, 100);

        // Pour les chefs d'équipe (rôles 2 ou 3)
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
        console.log("Chefs d'équipe:", teamLeadersList);
        setTeamLeaders(teamLeadersList);
      } catch (err) {
        console.error("Erreur lors du chargement des utilisateurs:", err);
        // En cas d'erreur on laisse la liste vide
      }
    })();
  }, []);

  async function loadDaoTypes() {
    try {
      console.log("Chargement des types de DAO...");
      const res = await fetch("/api/dao-types");
      if (!res.ok) {
        console.error("Erreur lors de la récupération des types de DAO:", await res.text());
        return;
      }
      const data = await res.json();
      console.log("Données reçues:", data);
      if (data.success && data.data) {
        const types = data.data.map((type: any) => ({
          value: type.code,
          label: type.libelle,
          description: type.description || ""
        }));
        console.log("Types transformés:", types);
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
    console.log("=== TOGGLE MEMBRE ===");
    console.log("ID cliqué:", id);
    console.log("membres avant:", membres);
    console.log("membres.includes(String(id)):", membres.includes(String(id)));
    
    const s = membres.includes(String(id))
      ? membres.filter((m) => m !== String(id))
      : [...membres, String(id)];
    
    console.log("membres après:", s);
    console.log("=== FIN TOGGLE MEMBRE ===");
    setMembres(s);
  };

  // Fermer la liste des membres si clic à l'extérieur
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

  // Lors de l'ouverture, déterminer si on doit 'flip' le dropdown vers le haut
  const openMembres = () => {
    if (!membresButtonRef.current) {
      setMembresOpen((v) => !v);
      return;
    }
    const rect = membresButtonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const menuEstimatedHeight = 260; // correspond à maxHeight + padding
    // Si pas assez d'espace en bas mais assez en haut => ouvrir vers le haut
    if (spaceBelow < menuEstimatedHeight && spaceAbove > menuEstimatedHeight) {
      setMembresFlipUp(true);
    } else {
      setMembresFlipUp(false);
    }
    setMembresOpen((v) => !v);
  };

  const validate = () => {
    console.log("=== DÉBUT VALIDATION ===");
    console.log("dateDepot:", dateDepot);
    console.log("typeDao:", typeDao);
    console.log("objet:", objet);
    console.log("description:", description);
    console.log("reference:", reference);
    console.log("autorite:", autorite);
    console.log("chefEquipe:", chefEquipe);
    console.log("membres:", membres);
    console.log("membres.length:", membres.length);
    console.log("groupement:", groupement);
    console.log("nomPartenaire:", nomPartenaire);
    console.log("=== FIN VALIDATION ===");
    
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
    
    // Validation dynamique du groupement
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

    // Exemple de payload (le numéro sera généré côté serveur)
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

    console.log("=== PAYLOAD ENVOYÉ ===");
    console.log("Payload complet:", JSON.stringify(payload, null, 2));
    console.log("membres dans payload:", membres);
    console.log("membres.length dans payload:", membres.length);
    console.log("=== FIN PAYLOAD ===");

    try {
      const res = await fetch("/api/dao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.message || "Erreur lors de la création du DAO");
        return;
      }

      const data = await res.json();
      alert("DAO créé avec succès : " + data.numero);
      // Rediriger vers la liste des DAO
      window.location.href = "/dash/admin";
    } catch (err) {
      console.error("Error creating DAO:", err);
      setError("Erreur réseau lors de la création du DAO");
    }
  };

  return (
    <div className="container mt-5">
      <div className="card">
        <div className="card-body">
          <h3>Créer un nouveau DAO</h3>
          <p>Saisissez les informations du nouveau dossier d'appel d'offres</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">
                Numéro de liste (automatique)
              </label>
              <input
                className="form-control"
                value={generatedNumber}
                readOnly
              />
              <div className="form-text">
                Numéro généré automatiquement depuis la base de données
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
              <button type="submit" className="btn btn-primary">
                Créer le DAO
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
