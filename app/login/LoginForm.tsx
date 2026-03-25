"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import axios from "axios";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface FormData {
  email: string;
  password: string;
  password_confirmation: string;
}

const schema = yup.object().shape({
  email: yup.string().email("Email invalide").required("L'email est requis"),
  password: yup.string().when("$showPassword", {
    is: true,
    then: (schema) => schema.required("Le mot de passe est requis"),
  }),
  password_confirmation: yup.string().when("$showPasswordConfirmation", {
    is: true,
    then: (schema) =>
      schema
        .required("La confirmation est requise")
        .oneOf([yup.ref("password")], "Les mots de passe ne correspondent pas"),
  }),
});

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm<FormData>({
    resolver: yupResolver(schema) as any,
    context: { showPassword, showPasswordConfirmation },
    defaultValues: {
      email: "",
      password: "",
      password_confirmation: "",
    },
  });

  const email = watch("email");

  // Vérification automatique de l'email avec debounce
  useEffect(() => {
    if (!email) return;

    const timer = setTimeout(() => {
      checkEmail();
    }, 800);

    return () => clearTimeout(timer);
  }, [email]);

  const checkEmail = async () => {
    if (!email) {
      setError("email", { message: "L'email est requis" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("email", { message: "Format d'email invalide" });
      return;
    }

    try {
      const response = await axios.get("/api/check-email", {
        params: { email },
        validateStatus: (status) => status < 500,
      });

      if (response.data.success) {
        setEmailExists(true);
        if (response.data.hasPassword) {
          setIsNewUser(false);
          setShowPassword(true);
          setShowPasswordConfirmation(false);
          setError("email", { message: "" });
        } else {
          setIsNewUser(true);
          setShowPassword(true);
          setShowPasswordConfirmation(true);
          setError("email", { message: "" });
        }
      } else {
        setEmailExists(false);
        setShowPassword(false);
        setShowPasswordConfirmation(false);
        setError("email", { message: "Cet email n'existe pas" });
      }
    } catch (error) {
      setError("email", {
        message: "Erreur lors de la vérification de l'email",
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        isNewUser: isNewUser && showPasswordConfirmation,
      };

      const response = await axios.post("/api/login", payload);
      console.log("Réponse de l'API de connexion:", response.data);

      if (response.data.success) {
        console.log("Données utilisateur brutes de l'API:", response.data.user);
        // Normalisation des données utilisateur
        const rawUser = response.data.user;

        const user = {
          id: rawUser.id,
          username:
            rawUser.username && rawUser.username.trim() !== ""
              ? rawUser.username
              : rawUser.name && rawUser.name.trim() !== ""
                ? rawUser.name
                : rawUser.email
                  ? rawUser.email.split("@")[0]
                  : "Utilisateur",
          email: rawUser.email ?? "",
          url_photo: rawUser.url_photo ?? "",
          role_id: rawUser.role_id,
        };

        // Stockage dans localStorage
        console.log("Données utilisateur à stocker:", user);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("role", String(user.role_id));
        console.log("Données stockées dans localStorage:", {
          user: localStorage.getItem("user"),
          role: localStorage.getItem("role"),
        });

        // Redirection
        router.push(response.data.redirect || "/dash");
      } else {
        if (response.data.errors) {
          Object.entries(response.data.errors).forEach(([field, messages]) => {
            setError(field as keyof FormData, {
              type: "manual",
              message: (messages as string[])[0],
            });
          });
        } else if (response.data.error) {
          setError("email", { type: "manual", message: response.data.error });
        }
      }
    } catch (error: any) {
      if (error.response?.data?.errors) {
        Object.entries(error.response.data.errors).forEach(
          ([field, messages]) => {
            setError(field as keyof FormData, {
              type: "manual",
              message: (messages as string[])[0],
            });
          },
        );
      } else if (error.response?.data?.error) {
        setError("email", {
          type: "manual",
          message: error.response.data.error,
        });
      } else {
        setError("email", {
          type: "manual",
          message: "Une erreur inattendue s'est produite.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="auth-form-light text-center p-5"
      style={{ 
        maxWidth: "400px", 
        margin: "0 auto",
        backgroundColor: "transparent",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        boxShadow: "0 8px 32px rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(20px)"
      }}
    >
      <div className="brand-logo mb-4">
        <Image
          src="/images/logo.png"
          alt="Logo"
          width={180}
          height={60}
          className="mx-auto"
        />
      </div>
      <h4 className="mb-3" style={{ color: "#ffffff", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>Bienvenue sur DAO Project</h4>
      <h6 className="font-weight-light mb-4" style={{ color: "#ffffff", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
        Connectez-vous pour accéder à votre espace
      </h6>
      <form className="pt-2" onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group mb-4">
          <div className="input-group">
            <div className="input-group-prepend bg-transparent">
              <span className="input-group-text bg-transparent border-right-0" style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.3)" }}>
                <i className="mdi mdi-email-outline" style={{ color: "#ffffff" }}></i>
              </span>
            </div>
            <input
              type="email"
              className={`form-control form-control-lg border-left-0 ${emailExists ? "border-primary" : ""}`}
              placeholder="Votre adresse email"
              {...register("email")}
              style={{ 
                height: "48px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                color: "#ffffff"
              }}
            />
          </div>
          {errors.email && (
            <div className="text-danger small text-left mt-1">
              {errors.email.message}
            </div>
          )}
        </div>

        {showPassword && (
          <div className="form-group mb-4">
            <div className="input-group">
              <div className="input-group-prepend bg-transparent">
                <span className="input-group-text bg-transparent border-right-0" style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.3)" }}>
                  <i className="mdi mdi-lock-outline" style={{ color: "#ffffff" }}></i>
                </span>
              </div>
              <input
                type="password"
                className={`form-control form-control-lg border-left-0 ${errors.password ? "is-invalid" : ""}`}
                placeholder="Votre mot de passe"
                {...register("password")}
                style={{ 
                  height: "48px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  color: "#ffffff"
                }}
              />
            </div>
            {errors.password && (
              <div className="text-danger small text-left mt-1">
                {errors.password.message}
              </div>
            )}
          </div>
        )}

        {showPasswordConfirmation && (
          <div className="form-group mb-4">
            <div className="input-group">
              <div className="input-group-prepend bg-transparent">
                <span className="input-group-text bg-transparent border-right-0" style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.3)" }}>
                  <i className="mdi mdi-lock-check-outline" style={{ color: "#ffffff" }}></i>
                </span>
              </div>
              <input
                type="password"
                className={`form-control form-control-lg border-left-0 ${errors.password_confirmation ? "is-invalid" : ""}`}
                placeholder="Confirmez votre mot de passe"
                {...register("password_confirmation")}
                style={{ 
                  height: "48px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  color: "#ffffff"
                }}
              />
            </div>
            {errors.password_confirmation && (
              <div className="text-danger small text-left mt-1">
                {errors.password_confirmation.message}
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <button
            className="btn btn-primary btn-lg btn-block font-weight-medium auth-form-btn"
            type="submit"
            disabled={isLoading}
            style={{
              height: "48px",
              fontSize: "1rem",
              fontWeight: 500,
              borderRadius: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {isLoading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm mr-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Chargement...
              </>
            ) : isNewUser ? (
              "Créer mon compte"
            ) : (
              "Se connecter"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
