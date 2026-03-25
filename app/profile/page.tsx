"use client";

import Image from "next/image";
import { useState } from "react";

export default function ProfilePage() {
  const [previewImage, setPreviewImage] = useState("/images/faces/face5.jpg");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // États des champs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // États mot de passe
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");

  // 📌 Prévisualisation image
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewImage(url);
    }
  };

  // 📌 Soumission du profil
  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);

    if (selectedFile) {
      formData.append("image", selectedFile);
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        body: formData,
      });

      const data = await res.json();
      setMessage(data.message);

      // Mettre à jour le localStorage si la mise à jour a réussi
      if (data.success) {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          // Mettre à jour le nom d'utilisateur et l'email
          user.username = name || user.username;
          user.email = email || user.email;

          // Mettre à jour l'URL de la photo si elle a été modifiée
          if (data.photoUrl) {
            user.url_photo = data.photoUrl;
            // Mettre à jour la prévisualisation
            setPreviewImage(data.photoUrl);
          }

          // Mettre à jour le localStorage
          localStorage.setItem("user", JSON.stringify(user));

          // Déclencher un événement personnalisé pour notifier les autres composants
          // Cela fonctionne même dans le même onglet
          window.dispatchEvent(
            new CustomEvent("userUpdated", { detail: user }),
          );

          // Déclencher aussi l'événement storage pour la compatibilité
          window.dispatchEvent(new Event("storage"));
        }
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      setMessage("Une erreur est survenue lors de la mise à jour du profil");
    }
  };

  // 📌 Soumission changement mot de passe
  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      return setMessage("Les mots de passe ne correspondent pas.");
    }

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    const data = await res.json();
    setMessage(data.message);
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">Mon Profil</h4>
            </div>

            <div className="card-body">
              {/* MESSAGE */}
              {message && <div className="alert alert-info">{message}</div>}

              {/* PHOTO */}
              <div className="text-center mb-4">
                <div className="position-relative d-inline-block">
                  <Image
                    src={previewImage}
                    alt="Photo de profil"
                    width={150}
                    height={150}
                    className="rounded-circle border border-4 border-primary"
                    style={{ objectFit: "cover" }}
                  />

                  <label
                    className="btn btn-primary btn-sm position-absolute bottom-0 end-0 rounded-circle"
                    style={{ width: "40px", height: "40px" }}
                  >
                    <i className="bi bi-camera"></i>
                    <input
                      type="file"
                      className="d-none"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              </div>

              {/* FORMULAIRE PROFIL */}
              <form className="mb-5" onSubmit={updateProfile}>
                <h5 className="mb-3">Informations personnelles</h5>

                <div className="mb-3">
                  <label className="form-label">Nom complet</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Votre nom"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Adresse email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="d-grid">
                  <button type="submit" className="btn btn-primary">
                    Mettre à jour le profil
                  </button>
                </div>
              </form>

              <hr className="my-4" />

              {/* FORMULAIRE MDP */}
              <form onSubmit={updatePassword}>
                <h5 className="mb-3">Changer le mot de passe</h5>

                <div className="mb-3">
                  <label className="form-label">Mot de passe actuel</label>
                  <input
                    type="password"
                    className="form-control"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Nouveau mot de passe</label>
                  <input
                    type="password"
                    className="form-control"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="d-grid">
                  <button type="submit" className="btn btn-outline-primary">
                    Changer le mot de passe
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
