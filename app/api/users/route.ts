import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";

// Mapping des rôles
const ROLES = [
  { id: 1, name: "directeur", label: "Directeur Général" },
  { id: 2, name: "admin", label: "Administrateur" },
  { id: 3, name: "chef_projet", label: "Chef de Projet" },
  { id: 4, name: "membre_equipe", label: "Membre d'Équipe" },
  { id: 5, name: "lecteur", label: "Lecteur" },
];

function getRoleById(roleId: number) {
  return ROLES.find(role => role.id === roleId) || { id: roleId, name: "inconnu", label: "Rôle inconnu" };
}

// Fonction pour envoyer l'email de confirmation de création de compte
async function sendAccountCreationEmail(email: string, username: string, roleLabel: string) {
  const subject = "✅ Votre compte a été créé avec succès";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmation de création de compte - DAO Project</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Roboto', Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4b49ac, #7da0fa); padding: 30px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 500;">DAO Project</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Système de Gestion</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
          <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <h2 style="color: #155724; margin: 0 0 10px 0; font-size: 18px;">🎉 Votre compte a été créé !</h2>
            <p style="color: #155724; margin: 0; font-size: 16px; line-height: 1.5;">
              Votre compte a été créé avec succès en tant que <strong>${roleLabel}</strong>.
            </p>
          </div>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;">
            <h3 style="color: #495057; margin: 0 0 15px 0; font-size: 16px;">📋 Informations de votre compte :</h3>
            <ul style="color: #495057; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li style="margin-bottom: 8px;"><strong>Nom d'utilisateur :</strong> ${username}</li>
              <li style="margin-bottom: 8px;"><strong>Email :</strong> ${email}</li>
              <li style="margin-bottom: 8px;"><strong>Rôle :</strong> ${roleLabel}</li>
            </ul>
          </div>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-radius: 4px; border: 1px solid #ffeaa7;">
            <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 16px;">🔐 Prochaines étapes :</h3>
            <ol style="color: #856404; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li style="margin-bottom: 8px;">Connectez-vous à votre compte en utilisant votre email</li>
              <li style="margin-bottom: 8px;">Votre mot de passe vous sera communiqué par l'administrateur</li>
              <li style="margin-bottom: 8px;">Une fois connecté, vous pourrez accéder à votre tableau de bord</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login" 
               style="display: inline-block; background: linear-gradient(135deg, #4b49ac, #7da0fa); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
              🚀 Se connecter maintenant
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; margin: 0; font-size: 14px;">
            Cet email a été généré automatiquement par le système DAO Project.<br>
            Veuillez ne pas répondre à cet email. Pour toute question, contactez votre administrateur.
          </p>
          <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 12px;">
            © 2024 DAO Project. Tous droits réservés.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(email, subject, html);
}

export async function GET(request: NextRequest) {
  try {
    console.log("=== DÉBUT API USERS GET ===");
    const connection = await db();
    console.log("Connexion à la base établie");

    // Vérifier la structure de la table users
    const [tableStructure] = await connection.execute("DESCRIBE users");
    console.log("Structure de la table users:", JSON.stringify(tableStructure, null, 2));

    // Récupérer tous les utilisateurs avec tous les champs nécessaires
    const [users] = await connection.execute(
      `SELECT id, username, email, url_photo, role_id, password FROM users ORDER BY username ASC`
    ) as any[];
    console.log("Utilisateurs bruts de la base:", JSON.stringify(users, null, 2));
    console.log("Nombre d'utilisateurs trouvés:", Array.isArray(users) ? users.length : 0);

    // Normaliser les données pour correspondre à l'interface attendue
    const normalizedUsers = users.map((user: any) => {
      const role = getRoleById(user.role_id);
      return {
        id: user.id,
        username: user.username,
        name: user.username, // Ajouter le champ name pour compatibilité
        email: user.email,
        url_photo: user.url_photo,
        role_id: user.role_id,
        roleName: role.name, // Ajouter roleName
        roleLabel: role.label, // Ajouter roleLabel
      };
    });

    const response = {
      success: true,
      data: normalizedUsers
    };
    console.log("Réponse finale GET:", JSON.stringify(response, null, 2));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur", error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== DÉBUT API USERS POST ===");
    
    let body;
    try {
      const text = await request.text();
      console.log("Corps brut de la requête POST:", text);
      
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
      console.log("Requête POST reçue avec le corps:", JSON.stringify(body, null, 2));
    } catch (jsonError) {
      console.error("Erreur de parsing JSON POST:", jsonError);
      return NextResponse.json(
        {
          success: false,
          error: "Format de requête invalide - JSON mal formé",
        },
        { status: 400 },
      );
    }

    const { username, email, role_id } = body;

    console.log("Données utilisateur:", { username, email, role_id });

    // Validation de base
    if (!username || !email || !role_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Tous les champs sont requis",
        },
        { status: 400 },
      );
    }

    const connection = await db();
    console.log("Connexion à la base établie pour POST");

    // Vérifier si l'email existe déjà
    const [existingUsers] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    ) as any[];

    if (existingUsers.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cet email est déjà utilisé",
        },
        { status: 400 },
      );
    }

    // Créer l'utilisateur SANS mot de passe (admin ne définit pas le mot de passe)
    const [result] = await connection.execute(
      "INSERT INTO users (username, email, role_id) VALUES (?, ?, ?)",
      [username, email, parseInt(role_id)]
    ) as any[];

    console.log("Utilisateur créé avec ID:", result.insertId);

    // Récupérer l'utilisateur créé
    const [newUsers] = await connection.execute(
      "SELECT id, username, email, url_photo, role_id, password FROM users WHERE id = ?",
      [result.insertId]
    ) as any[];

    const newUser = newUsers[0];
    const role = getRoleById(newUser.role_id);
    const normalizedUser = {
      id: newUser.id,
      username: newUser.username,
      name: newUser.username,
      email: newUser.email,
      url_photo: newUser.url_photo,
      role_id: newUser.role_id,
      roleName: role.name, // Ajouter roleName
      roleLabel: role.label, // Ajouter roleLabel
    };

    console.log("Utilisateur créé et normalisé:", normalizedUser);

    // Envoyer l'email de confirmation de création de compte
    let emailStatus = {
      sent: false,
      message: "",
      error: null as string | null
    };

    // Diagnostic des variables d'environnement email
    console.log("=== DIAGNOSTIC EMAIL ===");
    console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
    console.log("EMAIL_PORT:", process.env.EMAIL_PORT);
    console.log("EMAIL_USER:", process.env.EMAIL_USER ? "***" + process.env.EMAIL_USER.slice(-4) : "NON DÉFINI");
    console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "***CONFIGURÉ***" : "NON DÉFINI");
    console.log("EMAIL_FROM:", process.env.EMAIL_FROM);
    console.log("EMAIL_FROM_NAME:", process.env.EMAIL_FROM_NAME);
    console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
    console.log("========================");

    try {
      console.log("Envoi de l'email de confirmation à:", email);
      const emailResult = await sendAccountCreationEmail(email, username, role.label);
      
      if (emailResult.success) {
        console.log("Email de confirmation envoyé avec succès:", emailResult.messageId);
        emailStatus = {
          sent: true,
          message: "Email de confirmation envoyé avec succès",
          error: null
        };
      } else {
        console.error("Erreur lors de l'envoi de l'email de confirmation:", emailResult.error);
        emailStatus = {
          sent: false,
          message: "L'email de confirmation n'a pas pu être envoyé",
          error: (emailResult.error as string) || "Erreur inconnue"
        };
      }
    } catch (emailError) {
      console.error("Exception lors de l'envoi de l'email de confirmation:", emailError);
      emailStatus = {
        sent: false,
        message: "Une erreur est survenue lors de l'envoi de l'email",
        error: String(emailError)
      };
    }

    return NextResponse.json({
      success: true,
      user: normalizedUser,
      message: "Utilisateur créé avec succès",
      emailNotification: emailStatus
    });

  } catch (error: any) {
    console.error("Erreur lors de la création de l'utilisateur:", error);
    
    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        {
          success: false,
          error: "Cet email est déjà utilisé",
        },
        { status: 400 },
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur: " + String(error),
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log("=== DÉBUT API USERS PUT ===");
    
    let body;
    try {
      const text = await request.text();
      console.log("Corps brut de la requête PUT:", text);
      
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
      console.log("Requête PUT reçue avec le corps:", JSON.stringify(body, null, 2));
    } catch (jsonError) {
      console.error("Erreur de parsing JSON PUT:", jsonError);
      return NextResponse.json(
        {
          success: false,
          error: "Format de requête invalide - JSON mal formé",
        },
        { status: 400 },
      );
    }

    const { username, email, role_id } = body;

    console.log("Données utilisateur PUT:", { username, email, role_id });

    // Validation de base
    if (!username || !email || !role_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Tous les champs sont requis",
        },
        { status: 400 },
      );
    }

    const connection = await db();
    console.log("Connexion à la base établie pour PUT");

    // Mettre à jour l'utilisateur
    const [result] = await connection.execute(
      "UPDATE users SET username = ?, email = ?, role_id = ? WHERE email = ?",
      [username, email, parseInt(role_id), email]
    ) as any[];

    console.log("Utilisateur mis à jour, rows affected:", result.affectedRows);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Utilisateur non trouvé",
        },
        { status: 404 },
      );
    }

    // Récupérer l'utilisateur mis à jour
    const [updatedUsers] = await connection.execute(
      "SELECT id, username, email, url_photo, role_id FROM users WHERE email = ?",
      [email]
    ) as any[];

    const updatedUser = updatedUsers[0];
    const role = getRoleById(updatedUser.role_id);
    const normalizedUser = {
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.username,
      email: updatedUser.email,
      url_photo: updatedUser.url_photo,
      role_id: updatedUser.role_id,
      roleName: role.name, // Ajouter roleName
      roleLabel: role.label, // Ajouter roleLabel
    };

    console.log("Utilisateur mis à jour et normalisé:", normalizedUser);

    return NextResponse.json({
      success: true,
      user: normalizedUser,
      message: "Utilisateur mis à jour avec succès"
    });

  } catch (error: any) {
    console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur: " + String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log("=== DÉBUT API USERS DELETE ===");
    
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop(); // Extraire l'ID de l'URL
    
    console.log("ID utilisateur à supprimer:", userId);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "ID utilisateur requis",
        },
        { status: 400 },
      );
    }

    const connection = await db();
    console.log("Connexion à la base établie pour DELETE");

    // Supprimer l'utilisateur
    const [result] = await connection.execute(
      "DELETE FROM users WHERE id = ?",
      [parseInt(userId)]
    ) as any[];

    console.log("Utilisateur supprimé, rows affected:", result.affectedRows);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Utilisateur non trouvé",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Utilisateur supprimé avec succès"
    });

  } catch (error: any) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur: " + String(error),
      },
      { status: 500 },
    );
  }
}
