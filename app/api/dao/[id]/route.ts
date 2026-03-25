import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";



export async function GET(

  req: NextRequest,

  { params }: { params: Promise<{ id: string }> }

) {

  try {

    const { id } = await params;



    const connection = await db();

    const [rows] = await connection.execute(`

      SELECT 

        d.*,

        t.team_code as team_nom,

        u.username as chef_nom

      FROM daos d

      LEFT JOIN teams t ON d.team_id = t.id

      LEFT JOIN users u ON d.chef_id = u.id

      WHERE d.id = ?

    `, [id]);



    if (!rows || (rows as any[]).length === 0) {

      return NextResponse.json(

        { message: "DAO non trouvé" },

        { status: 404 }

      );

    }



    const dao = (rows as any[])[0];
    
    // Récupérer les membres de l'équipe
    const [memberRows] = await connection.execute(`
      SELECT u.id, u.username, u.email
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
    `, [dao.team_id]);
    
    dao.membres = (memberRows as any[]).map(m => m.id.toString());
    
    // Garder le statut réel de la base de données, ne pas l'écraser
    // Le statut est maintenant géré automatiquement par la progression des tâches
    if (!dao.statut || dao.statut === '') {
      // Si le statut est NULL ou vide, utiliser une logique par défaut basée sur la date
      if (dao.date_depot) {
        const dateDepot = new Date(dao.date_depot);
        const today = new Date();
        const diffTime = today.getTime() - dateDepot.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Logique par défaut seulement si le statut n'est pas défini
        dao.statut = diffDays >= 3 ? 'A_RISQUE' : 'EN_COURS';
      } else {
        dao.statut = 'EN_COURS'; // Par défaut si pas de date
      }
    }
    // Sinon, garder le statut réel de la base de données (TERMINEE, EN_COURS, etc.)


    return NextResponse.json(dao);

  } catch (err: any) {

    console.error("API /api/dao/[id] GET error:", err);

    return NextResponse.json(

      { message: "Erreur serveur" },

      { status: 500 }

    );

  }

}



export async function PUT(

  req: NextRequest,

  { params }: { params: Promise<{ id: string }> }

) {

  try {

    const { id } = await params;

    const body = await req.json();

    console.log("PUT DAO body:", JSON.stringify(body, null, 2));

    

    // Support à la fois pour l'ancien format (statut seul) et le nouveau format complet

    if (body.statut && Object.keys(body).length === 1) {

      // Ancien format - mise à jour du statut uniquement

      const { statut } = body;

      if (!statut) {

        return NextResponse.json(

          { message: "Statut requis" },

          { status: 400 }

        );

      }

      const connection = await db();

      await connection.execute(

        "UPDATE daos SET statut = ? WHERE id = ?",

        [statut, id]

      );

    } else {

      // Nouveau format - mise à jour complète du DAO

      const {

        date_depot,

        typeDao,

        objet,

        description,

        reference,

        autorite,

        chefEquipe,

        membres,

        groupement,

        nomPartenaire

      } = body;

      

      const connection = await db();

      

      // Mise à jour des informations principales du DAO

      await connection.execute(`

        UPDATE daos SET 

          date_depot = ?,

          type_dao = ?,

          objet = ?,

          description = ?,

          reference = ?,

          autorite = ?,

          chef_id = ?,

          groupement = ?,

          nom_partenaire = ?

        WHERE id = ?

      `, [

        date_depot || null,

        typeDao || null,

        objet || null,

        description || null,

        reference || null,

        autorite || null,

        chefEquipe ? parseInt(chefEquipe) : null,

        groupement || null,

        groupement === "oui" ? nomPartenaire : null,

        id

      ]);

      

      // Mise à jour des membres de l'équipe si fournis

      if (membres && Array.isArray(membres)) {

        // D'abord, récupérer le team_id du DAO

        const [teamRows] = await connection.execute(

          "SELECT team_id FROM daos WHERE id = ?",

          [id]

        );

        

        const teamId = (teamRows as any[])[0]?.team_id;

        

        if (teamId) {

          // Supprimer les membres existants

          await connection.execute(

            "DELETE FROM team_members WHERE team_id = ?",

            [teamId]

          );

          

          // Ajouter les nouveaux membres

          for (const memberId of membres) {

            await connection.execute(

              "INSERT INTO team_members (team_id, user_id) VALUES (?, ?)",

              [teamId, parseInt(memberId)]

            );

          }

        }

      }

    }

    

    return NextResponse.json({ success: true });

  } catch (err: any) {

    console.error("API /api/dao/[id] PUT error:", err);

    return NextResponse.json(

      { message: "Erreur serveur: " + err.message },

      { status: 500 }

    );

  }

}



export async function DELETE(

  req: NextRequest,

  { params }: { params: Promise<{ id: string }> }

) {

  try {

    const { id } = await params;



    const connection = await db();

    

    // Supprimer les tâches associées au DAO
    await connection.execute("DELETE FROM tasks WHERE dao_id = ?", [id]);

    // Supprimer les membres de l'équipe
    await connection.execute("DELETE FROM team_members WHERE team_id IN (SELECT team_id FROM daos WHERE id = ?)", [id]);

    
    // Supprimer l'équipe
    await connection.execute("DELETE FROM teams WHERE id IN (SELECT team_id FROM daos WHERE id = ?)", [id]);

    
    // Supprimer le DAO
    await connection.execute("DELETE FROM daos WHERE id = ?", [id]);


    return NextResponse.json({ success: true });

  } catch (err: any) {

    console.error("API /api/dao/[id] DELETE error:", err);

    return NextResponse.json(

      { message: "Erreur serveur" },

      { status: 500 }

    );

  }

}