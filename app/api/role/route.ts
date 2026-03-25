import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Mapping des rôles basé sur la structure de la base
const ROLES = [
  { id: 1, name: "directeur", label: "Directeur Général" },
  { id: 2, name: "admin", label: "Administrateur" },
  { id: 3, name: "chef_projet", label: "Chef de Projet" },
  { id: 4, name: "membre_equipe", label: "Membre d'Équipe" },
  { id: 5, name: "lecteur", label: "Lecteur" },
];

export async function GET(request: NextRequest) {
  try {
    console.log("=== DÉBUT API ROLES ===");
    
    // Retourner la liste des rôles prédéfinis
    return NextResponse.json(ROLES);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}
