import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(
  request: NextRequest
) {
  let connection;
  try {
    const body = await request.json();
    const { user_id, message_id } = body;

    if (!user_id || !message_id) {
      return NextResponse.json(
        { success: false, message: 'user_id et message_id sont requis' },
        { status: 400 }
      );
    }

    console.log('=== API HIDE MESSAGE ===');
    console.log('Masquer le message:', { user_id, message_id });

    // Connexion à la base de données avec la même configuration que route.ts
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dao',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    // Vérifier si le message existe avant de le masquer
    const [messageCheck] = await connection.execute(
      'SELECT id FROM messages WHERE id = ?',
      [message_id]
    );

    if (!Array.isArray(messageCheck) || messageCheck.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, message: 'Message non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier si l'utilisateur existe
    const [userCheck] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [user_id]
    );

    if (!Array.isArray(userCheck) || userCheck.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, message: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Créer la table hidden_messages si elle n'existe pas (sans foreign keys pour éviter les erreurs)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS hidden_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        message_id INT NOT NULL,
        hidden_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_message (user_id, message_id)
      )
    `);

    // Insérer le message masqué
    await connection.execute(
      'INSERT IGNORE INTO hidden_messages (user_id, message_id) VALUES (?, ?)',
      [user_id, message_id]
    );

    await connection.end();

    console.log('✅ Message masqué pour l\'utilisateur');

    return NextResponse.json({
      success: true,
      message: 'Message masqué avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur lors du masquage du message:', error);
    
    // Fermer la connexion si elle est ouverte
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('❌ Erreur lors de la fermeture de la connexion:', closeError);
      }
    }
    
    return NextResponse.json({
      success: false,
      message: 'Erreur lors du masquage du message: ' + (error instanceof Error ? error.message : 'Erreur inconnue')
    }, { status: 500 });
  }
}
