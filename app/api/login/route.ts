import { NextResponse } from "next/server";
import { authenticateUser, createUser, updateUserPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Fonction pour déterminer la redirection selon le role_id
function getRedirectByRole(roleId: number): string {
  const roleRedirects: Record<number, string> = {
    1: "/dash/DirecteurGeneral",
    2: "/dash/admin", 
    3: "/dash/ChefProjet",
    4: "/dash/MembreEquipe",
    5: "/dash/Lecteur",
  };

  return roleRedirects[roleId] || "/dash";
}

export async function POST(request: Request) {
  console.log("=== DÉBUT API LOGIN ===");
  
  try {
    let body;
    try {
      const text = await request.text();
      console.log("Corps brut de la requête:", text);
      
      if (!text || text.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: "Corps de requête vide",
          },
          { status: 400 },
        );
      }
      
      body = JSON.parse(text);
      console.log("Requête reçue avec le corps:", JSON.stringify(body, null, 2));
    } catch (jsonError) {
      console.error("Erreur de parsing JSON:", jsonError);
      console.error("Corps de la requête invalide");
      return NextResponse.json(
        {
          success: false,
          error: "Format de requête invalide - JSON mal formé",
        },
        { status: 400 },
      );
    }

    const { email, password, password_confirmation, isNewUser } = body;

    console.log("Début du traitement - isNewUser:", isNewUser, "email:", email);

    // Validation de base
    if (!email) {
      const response = NextResponse.json(
        {
          success: false,
          errors: {
            email: "L'email est requis",
          },
        },
        { status: 400 },
      );
      console.log("Réponse email manquant:", JSON.stringify(response.body, null, 2));
      return response;
    }

    // Vérifier si l'utilisateur existe déjà
    const connection = await db();
    const [existingUsers] = await connection.execute<
      (RowDataPacket & {
        id: number;
        password: string | null;
        role_id: number;
      })[]
    >("SELECT id, password, role_id FROM users WHERE email = ?", [email]);

    const userExists = Array.isArray(existingUsers) && existingUsers.length > 0;
    const userHasPassword = userExists && existingUsers[0].password !== null;

    // Si c'est un nouvel utilisateur ou un utilisateur sans mot de passe
    if (isNewUser || (userExists && !userHasPassword)) {
      console.log(
        "Tentative de création d'un nouvel utilisateur avec email:",
        email,
      );
      if (!password || !password_confirmation) {
        return NextResponse.json(
          {
            success: false,
            errors: {
              password: "Le mot de passe et la confirmation sont requis",
            },
          },
          { status: 400 },
        );
      }

      if (password !== password_confirmation) {
        return NextResponse.json(
          {
            success: false,
            errors: {
              password_confirmation: "Les mots de passe ne correspondent pas",
            },
          },
          { status: 400 },
        );
      }

      // Si l'utilisateur existe mais n'a pas de mot de passe, on le met à jour
      if (userExists) {
        const updateResult = await updateUserPassword(email, password);
        if (!updateResult.success) {
          return NextResponse.json(
            {
              success: false,
              errors: {
                password:
                  updateResult.message ||
                  "Échec de la mise à jour du mot de passe",
              },
            },
            { status: 400 },
          );
        }
      } else {
        // Sinon, on crée un nouvel utilisateur
        const result = await createUser(email, password, email.split("@")[0], "4"); // Par défaut: Membre Equipe (nombre)
        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              errors: {
                email: result.message || "Une erreur est survenue",
              },
            },
            { status: 400 },
          );
        }
      }

      console.log(
        "Tentative d'authentification après création/mise à jour du compte",
      );
      // Authentifier l'utilisateur après la création/mise à jour du compte
      const authResult = await authenticateUser(email, password);
      console.log(
        "Résultat de l'authentification:",
        JSON.stringify(authResult, null, 2),
      );

      if (!authResult.success || !authResult.user) {
        console.error(
          "Échec de l'authentification ou utilisateur non trouvé:",
          authResult,
        );
        return NextResponse.json(
          {
            success: false,
            errors: {
              email:
                authResult?.message ||
                "Échec de la connexion automatique après la création du compte",
            },
          },
          { status: 401 },
        );
      }

      // Vérification du rôle de l'utilisateur
      if (typeof authResult.user.role_id === "undefined") {
        console.error(
          "Rôle utilisateur non défini pour l'utilisateur:",
          authResult.user.id,
        );
        return NextResponse.json(
          {
            success: false,
            errors: {
              email: "Erreur de configuration du compte: rôle non défini",
            },
          },
          { status: 500 },
        );
      }

      // Déterminer la redirection selon le rôle
      const redirectUrl = getRedirectByRole(authResult.user.role_id);
      console.log(
        "Redirection vers:",
        redirectUrl,
        "pour le rôle:",
        authResult.user.role_id,
      );

      const response = {
        success: true,
        redirect: redirectUrl,
        user: authResult.user,
      };
      console.log("Réponse de création de compte:", response);
      return NextResponse.json(response);
    }
    // Si c'est une connexion normale
    else {
      if (!password) {
        return NextResponse.json(
          {
            success: false,
            errors: {
              password: "Le mot de passe est requis",
            },
          },
          { status: 400 },
        );
      }

      const result = await authenticateUser(email, password);
      console.log(
        "Résultat de l'authentification (connexion normale):",
        JSON.stringify(result, null, 2),
      );

      if (!result.success || !result.user) {
        console.error(
          "Échec de l'authentification ou utilisateur non trouvé (connexion normale):",
          result,
        );
        return NextResponse.json(
          {
            success: false,
            errors: {
              email: result?.message || "Email ou mot de passe incorrect",
            },
          },
          { status: 401 },
        );
      }

      // Vérification du rôle de l'utilisateur
      if (typeof result.user.role_id === "undefined") {
        console.error(
          "Rôle utilisateur non défini pour l'utilisateur (connexion normale):",
          result.user.id,
        );
        return NextResponse.json(
          {
            success: false,
            errors: {
              email: "Erreur de configuration du compte: rôle non défini",
            },
          },
          { status: 500 },
        );
      }

      // Déterminer la redirection selon le rôle
      const redirectUrl = getRedirectByRole(result.user.role_id);
      console.log(
        "Redirection (connexion normale) vers:",
        redirectUrl,
        "pour le rôle:",
        result.user.role_id,
      );

      return NextResponse.json({
        success: true,
        redirect: redirectUrl,
        user: result.user,
      });
    }
  } catch (error) {
    console.error(
      "Erreur lors de la connexion ou de la création de compte:",
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: "Une erreur est survenue lors du traitement de votre demande",
      },
      { status: 500 },
    );
  }
}
