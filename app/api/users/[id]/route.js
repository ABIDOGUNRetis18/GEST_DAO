import { db } from "@/lib/db";

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: "ID utilisateur requis" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const connection = await db();

    // Vérifier si l'utilisateur existe
    const [existingUser] = await connection.execute(
      "SELECT id FROM users WHERE id = ?",
      [id]
    );

    if (existingUser.length === 0) {
      return new Response(
        JSON.stringify({ error: "Utilisateur non trouvé" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Supprimer l'utilisateur
    await connection.execute("DELETE FROM users WHERE id = ?", [id]);

    return new Response(
      JSON.stringify({ message: "Utilisateur supprimé avec succès" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    return new Response(
      JSON.stringify({
        error: "Erreur serveur",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { username, email, role_id } = body;

    if (!id) {
      return new Response(
        JSON.stringify({ error: "ID utilisateur requis" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const connection = await db();

    // Vérifier si l'utilisateur existe
    const [existingUser] = await connection.execute(
      "SELECT id FROM users WHERE id = ?",
      [id]
    );

    if (existingUser.length === 0) {
      return new Response(
        JSON.stringify({ error: "Utilisateur non trouvé" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Mettre à jour l'utilisateur
    await connection.execute(
      "UPDATE users SET username = ?, email = ?, role_id = ? WHERE id = ?",
      [username, email, role_id, id]
    );

    // Récupérer l'utilisateur mis à jour
    const [updatedUser] = await connection.execute(
      "SELECT u.*, r.name as roleName FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?",
      [id]
    );

    const user = updatedUser[0];
    const formattedUser = {
      id: String(user.id),
      username: user.username,
      email: user.email,
      role: String(user.role_id),
      roleName: user.roleName,
      roleLabel: user.roleName,
      avatar: user.avatar,
    };

    return new Response(
      JSON.stringify({ message: "Utilisateur mis à jour avec succès", user: formattedUser }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
    return new Response(
      JSON.stringify({
        error: "Erreur serveur",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}