"use client";
import { useState, useEffect } from "react";

type Role = {
  id: string;
  name: string;
  label: string;
};

type User = {
  id: string;
  username: string;
  email: string;
  role_id: string;
  roleName: string;
  roleLabel: string;
  avatar?: string;
};

type FormData = {
  username: string;
  email: string;
  role_id: string;
};

export default function UsersTable() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    role_id: "",
  });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    console.log("handleChange - name:", name, "value:", value);

    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: value,
      };
      console.log("Nouvel état du formulaire:", newData);
      return newData;
    });
  };

  // Charger les rôles et les utilisateurs
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        console.log("1. Début du chargement des données...");

        // D'abord, charger les rôles
        console.log("2. Récupération des rôles depuis /api/role...");
        const rolesResponse = await fetch("/api/role");
        console.log(
          "3. Réponse des rôles reçue, statut:",
          rolesResponse.status,
        );

        if (!rolesResponse.ok) {
          const errorText = await rolesResponse.text();
          console.error("Erreur lors du chargement des rôles:", errorText);
          throw new Error(`Erreur ${rolesResponse.status}: ${errorText}`);
        }

        const rolesData = await rolesResponse.json();
        console.log("4. Données brutes des rôles:", rolesData);

        // Formater les rôles
        const formattedRoles = Array.isArray(rolesData)
          ? rolesData.map((role) => ({
              ...role,
              id: String(role.id), // S'assurer que l'ID est une chaîne
              name: role.name || `Rôle ${role.id}`,
              label: role.label || role.name || `Rôle ${role.id}`,
            }))
          : [];

        console.log("5. Rôles formatés:", formattedRoles);
        setRoles(formattedRoles);

        // Ensuite, charger les utilisateurs
        console.log("6. Récupération des utilisateurs...");
        const usersResponse = await fetch("/api/users");

        if (!usersResponse.ok) {
          const errorText = await usersResponse.text();
          console.error(
            "Erreur lors du chargement des utilisateurs:",
            errorText,
          );
          throw new Error(`Erreur ${usersResponse.status}: ${errorText}`);
        }

        const usersData = await usersResponse.json();
        console.log("7. Données des utilisateurs:", usersData);

        // L'API retourne { success: true, data: [...] }
        const usersArray = usersData.success && Array.isArray(usersData.data) ? usersData.data : [];
        setUsers(usersArray);

        // Ne pas définir de rôle par défaut
        console.log("8. Aucun rôle sélectionné par défaut");
        setFormData((prev) => ({
          ...prev,
          role_id: "",
        }));
        if (formattedRoles.length === 0) {
          console.warn("9. Aucun rôle disponible");
          setMessage(
            "Aucun rôle disponible. Veuillez d'abord configurer des rôles.",
          );
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        setMessage(
          "Erreur lors du chargement des données: " +
            (error instanceof Error ? error.message : String(error)),
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      role_id: "",
    });
    setEditingUserId(null);
    setMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    console.log("Soumission du formulaire avec les données:", formData);

    setIsSubmitting(true);
    setMessage("");

    try {
      const url = editingUserId ? `/api/users/${editingUserId}` : "/api/users";
      const method = editingUserId ? "PUT" : "POST";

      console.log("Envoi de la requête à:", url, "avec la méthode:", method);
      console.log("Données du formulaire:", formData);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Erreur serveur");

      if (editingUserId) {
        // Mise à jour d'un utilisateur existant
        setUsers((prev) =>
          prev.map((u) => (u.id === editingUserId ? data.user : u)),
        );
        setMessage("✅ Utilisateur mis à jour avec succès !");
      } else {
        // Ajout d'un nouvel utilisateur
        setUsers((prev) => [...prev, data.user]);
        setMessage("✅ Utilisateur ajouté avec succès !");
      }

      // Réinitialiser le formulaire et fermer la modale après un délai
      resetForm();

      // Fermer la modale après 3 secondes
      const timer = setTimeout(() => {
        
      },);

      // Nettoyer le timer si le composant est démonté
      return () => clearTimeout(timer);
    } catch (error: any) {
      setMessage(error.message || "Erreur lors de l'opération");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user: User) => {
    setFormData({
      username: user.username,
      email: user.email,
      role_id: user.role_id,
    });
    setEditingUserId(user.id);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?"))
      return;
    try {
      console.log("Suppression de l'utilisateur avec ID:", userId);
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Échec de la suppression");

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setMessage("Utilisateur supprimé avec succès");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("Erreur lors de la suppression de l'utilisateur");
    }
  };

  return (
    <div
      className="main-panel"
      style={{
        width: "100%",
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      <div className="content-wrapper">
        <div className="row justify-content-center">
          <div className="col-12">
            <div
              className="card"
              style={{
                borderRadius: "10px",
                boxShadow: "0 0 20px rgba(0,0,0,0.1)",
                marginBottom: "20px",
              }}
            >
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 className="card-title mb-0">Gestion des utilisateurs</h4>
                  <button
                    className="btn btn-primary btn-icon-text"
                    onClick={() => {
                      resetForm();
                      setIsModalOpen(true);
                    }}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    <i className="mdi mdi-plus-circle-outline"></i> Ajouter un
                    utilisateur
                  </button>
                </div>

                <div className="table-responsive">
                  <table
                    className="table table-hover"
                    style={{ width: "100%" }}
                  >
                    <thead style={{ backgroundColor: "#f8f9fa" }}>
                      <tr>
                        <th style={{ width: "80px" }}>Photo</th>
                        <th style={{ minWidth: "180px" }}>Nom & Prénom</th>
                        <th style={{ minWidth: "250px" }}>Email</th>
                        <th style={{ width: "150px" }}>Rôle</th>
                        <th style={{ width: "150px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4">
                            <div
                              className="spinner-border text-primary"
                              role="status"
                            ></div>
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4">
                            Aucun utilisateur trouvé
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr key={user.id}>
                            <td className="align-middle p-2">
                              <img
                                src={user.avatar || "/images/faces/face5.jpg"}
                                alt={user.username}
                                className="img-sm rounded-circle"
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  objectFit: "cover",
                                }}
                              />
                            </td>
                            <td className="align-middle p-2">
                              <div
                                style={{
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: "200px",
                                }}
                              >
                                {user.username}
                              </div>
                            </td>
                            <td className="align-middle p-2">
                              <div
                                style={{
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: "300px",
                                }}
                              >
                                {user.email}
                              </div>
                            </td>
                            <td className="align-middle p-2">
                              <span
                                className={`badge ${
                                  user.roleName === "admin" ? "badge-success" : 
                                  user.roleName === "directeur" ? "badge-primary" :
                                  user.roleName === "chef_projet" ? "badge-warning" :
                                  user.roleName === "membre_equipe" ? "badge-info" :
                                  "badge-secondary"
                                }`}
                              >
                                {user.roleLabel}
                              </span>
                            </td>
                            <td className="align-middle p-2">
                              <div className="d-flex gap-2">
                                <button
                                  className="btn btn-outline-primary btn-sm d-flex align-items-center"
                                  onClick={() => handleEditUser(user)}
                                  title="Modifier"
                                  style={{
                                    width: "36px",
                                    height: "36px",
                                    justifyContent: "center",
                                  }}
                                >
                                  <i className="mdi mdi-pencil m-0"></i>
                                </button>
                                <button
                                  className="btn btn-outline-danger btn-sm d-flex align-items-center"
                                  onClick={() => handleDeleteUser(user.id)}
                                  title="Supprimer"
                                  style={{
                                    width: "36px",
                                    height: "36px",
                                    justifyContent: "center",
                                  }}
                                >
                                  <i className="mdi mdi-delete m-0"></i>
                                </button>
                              </div>
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

        {/* Modal */}
        {isModalOpen && (
          <div
            className="modal fade show d-flex align-items-center justify-content-center"
            style={{
              position: "fixed",
              top: 0,
              left: "7%",
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 1050,
              padding: "2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "100vh",
              overflow: "auto",
            }}
            onClick={(e) => {
              // Fermer si on clique sur le fond
              if (e.target === e.currentTarget) {
                setIsModalOpen(false);
              }
            }}
          >
            <div
              className="modal-dialog modal-dialog-centered m-0"
              style={{
                width: "100%",
                maxWidth: "600px",
                margin: "auto",
                display: "flex",
                alignItems: "center",
                minHeight: "calc(100% - 3.5rem)",
              }}
            >
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingUserId
                      ? "Modifier utilisateur"
                      : "Ajouter un utilisateur"}
                  </h5>
                  <button
                    type="button"
                    className="close"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    <span>&times;</span>
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    {message && (
                      <div
                        className={`alert ${message.includes("succès") ? "alert-success" : "alert-danger"} d-flex align-items-center`}
                      >
                        <i
                          className={`mdi ${message.includes("succès") ? "mdi-check-circle" : "mdi-alert-circle"} me-2`}
                        ></i>
                        <div>{message}</div>
                      </div>
                    )}

                    <div className="form-group mb-3">
                      <label htmlFor="username">Nom d'utilisateur *</label>
                      <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="Entrez le nom"
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="form-group mb-3">
                      <label htmlFor="email">Email *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="exemple@email.com"
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="form-group mb-3">
                      <label htmlFor="role">Rôle *</label>
                      <select
                        id="role"
                        name="role_id"
                        value={formData.role_id}
                        onChange={handleChange}
                        className="form-control"
                        required
                        disabled={isSubmitting || roles.length === 0}
                      >
                        <option value="">Sélectionner un rôle</option>
                        {roles.map((role) => (
                          <option key={role.id} value={String(role.id)}>
                            {role.name || role.label || `Rôle ${role.id}`}
                          </option>
                        ))}
                      </select>

                      {roles.length === 0 && (
                        <small className="text-danger">
                          {isLoading
                            ? "Chargement des rôles..."
                            : "Aucun rôle disponible"}
                        </small>
                      )}

                      {/* Debug info */}
                      {process.env.NODE_ENV === "development" && (
                        <div className="mt-2">
                          <small className="text-muted"></small>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsModalOpen(false)}
                      disabled={isSubmitting}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting || roles.length === 0}
                    >
                      {isSubmitting ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm mr-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Enregistrement...
                        </>
                      ) : editingUserId ? (
                        "Modifier"
                      ) : (
                        "Créer"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
