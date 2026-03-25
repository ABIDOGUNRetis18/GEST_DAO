import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task_id, user_id, content, mentioned_user_id, mentioned_user_name, is_public } = body;

    console.log('=== API MESSAGES - POST ===');
    console.log('Données reçues:', { task_id, user_id, content, mentioned_user_id, mentioned_user_name, is_public });

    // Validation des données requises
    if (!task_id || !user_id || !content) {
      return NextResponse.json(
        { success: false, message: 'task_id, user_id et content sont requis' },
        { status: 400 }
      );
    }

    // Connexion via le pool centralisé
    const connection = await db();
    // Insérer le message dans la table messages
    const [result] = await connection.execute(`
      INSERT INTO messages (task_id, user_id, content, mentioned_user_id, mentioned_user_name, is_public)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [task_id, user_id, content, mentioned_user_id || null, mentioned_user_name || null, is_public !== false]);
    console.log('✅ Message inséré avec succès, ID:', (result as any).insertId);

    // Créer une notification si un utilisateur est mentionné
    if (mentioned_user_id && mentioned_user_id !== user_id) {
      try {
        const [senderRows] = await connection.execute(
          "SELECT username FROM users WHERE id = ?",
          [user_id]
        ) as any[];
        const senderName = senderRows.length > 0 ? (senderRows as any[])[0].username : "Quelqu'un";
        await connection.execute(
          "INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, 'mention', ?, ?, 0)",
          [
            mentioned_user_id,
            senderName + " vous a mentionné",
            senderName + " vous a mentionné : " + content.substring(0, 100) + (content.length > 100 ? "..." : "")
          ]
        );
      } catch (notifError) {
        console.error("Erreur notification mention:", notifError);
      }
    }

    console.log('✅ Message inséré avec succès, ID:', (result as any).insertId);

    return NextResponse.json({
      success: true,
      message: 'Message ajouté avec succès',
      data: {
        id: (result as any).insertId,
        task_id,
        user_id,
        content,
        mentioned_user_id,
        mentioned_user_name,
        is_public: is_public !== false,
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout du message:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de l\'ajout du message', error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const task_id = searchParams.get('task_id');
    const user_id = searchParams.get('user_id');

    console.log('=== API MESSAGES - GET ===');
    console.log('Paramètres:', { task_id, user_id });

    // Connexion via le pool centralisé
    const connection = await db();

    // Créer la table hidden_messages si elle n'existe pas
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS hidden_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        message_id INT NOT NULL,
        hidden_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_message (user_id, message_id)
      )
    `);

    let query = `
      SELECT m.*, u.username as user_name
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
    `;
    let params: any[] = [];

    if (task_id) {
      query += ' WHERE m.task_id = ?';
      params.push(task_id);
    } else if (user_id) {
      // Pour le header : exclure les messages de l'utilisateur lui-même
      // Inclure seulement les messages publics OU les messages privés destinés à l'utilisateur
      // Exclure également les messages masqués par l'utilisateur
      query += `
        WHERE m.user_id != ? 
        AND (m.is_public = 1 OR m.mentioned_user_id = ?)
        AND m.id NOT IN (
          SELECT hm.message_id 
          FROM hidden_messages hm 
          WHERE hm.user_id = ?
        )
      `;
      params.push(user_id, user_id, user_id);
    }

    query += ' ORDER BY m.created_at DESC';

    const [messages] = await connection.execute(query, params);

    console.log(`✅ ${(messages as any[]).length} messages récupérés`);

    return NextResponse.json({
      success: true,
      message: 'Messages récupérés avec succès',
      data: messages
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des messages:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la récupération des messages', error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
