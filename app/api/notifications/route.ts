import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDepositNotification } from "@/lib/email";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || searchParams.get("user_id");
    const checkDeposits = searchParams.get("checkDeposits");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const connection = await db();

    // Si checkDeposits=true, vérifier les dates de dépôt des DAOs
    if (checkDeposits === "true") {
      await checkAndCreateDepositNotifications(connection, parseInt(userId));
    }

    // Get notifications for the user
    const [notifications] = await connection.execute(
      `
      SELECT
        id,
        type,
        title,
        message,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
      `,
      [userId]
    );

    // Format the notifications
    const formattedNotifications = (notifications as any[]).map((notif) => ({
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      isRead: notif.is_read,
      createdAt: notif.created_at,
      // Map notification types to icons
      icon: getNotificationIcon(notif.type),
      bgColor: getNotificationBgColor(notif.type),
    }));

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Fonction pour vérifier les dates de dépôt et créer des notifications
async function checkAndCreateDepositNotifications(connection: any, userId: number) {
  try {
    // Récupérer tous les DAOs avec leur date de dépôt
    const [daos] = await connection.execute(
      `
      SELECT id, objet, date_depot
      FROM daos
      WHERE date_depot IS NOT NULL
      ORDER BY date_depot ASC
      `
    );

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    for (const dao of daos as any[]) {
      const depositDate = new Date(dao.date_depot);
      
      // Vérifier si la date de dépôt est dans 3 jours ou moins
      if (depositDate <= threeDaysFromNow && depositDate >= now) {
        const daysUntilDeposit = Math.ceil((depositDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        
        // Vérifier si une notification existe déjà pour ce DAO
        const [existingNotif] = await connection.execute(
          `
          SELECT id FROM notifications 
          WHERE user_id = ? AND title LIKE ? AND message LIKE ?
          `,
          [userId, `%Date de dépôt%`, `%${dao.objet}%`]
        );

        if ((existingNotif as any[]).length === 0) {
          // Créer une nouvelle notification
          await connection.execute(
            `
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (?, ?, ?, ?)
            `,
            [
              userId,
              daysUntilDeposit <= 1 ? 'error' : 'warning',
              'Date de dépôt approche',
              `Le DAO "${dao.objet}" doit être déposé dans ${daysUntilDeposit} jour${daysUntilDeposit > 1 ? 's' : ''}`
            ]
          );

          // Envoyer un email à l'admin
          const adminEmail = process.env.EMAIL_RECEIVER || 'deidesarr@gmail.com';
          const backupEmail = 'deidesarr@gmail.com'; // Email de backup
          
          try {
            await sendDepositNotification(adminEmail, dao.objet, daysUntilDeposit);
            console.log(`✅ Email de notification envoyé à: ${adminEmail}`);
          } catch (emailError: any) {
            console.error(`❌ Erreur envoi à ${adminEmail}, tentative vers backup:`, emailError.message);
            // Essayer avec l'email de backup en cas de limite dépassée
            await sendDepositNotification(backupEmail, dao.objet, daysUntilDeposit);
            console.log(`🔄 Email de backup envoyé à: ${backupEmail}`);
          }
        }
      }
      
      // Vérifier si la date de dépôt est dépassée depuis moins de 3 jours
      if (depositDate < now && depositDate >= threeDaysAgo) {
        const daysOverdue = Math.ceil((now.getTime() - depositDate.getTime()) / (24 * 60 * 60 * 1000));
        
        // Vérifier si une notification existe déjà pour ce DAO en retard
        const [existingNotif] = await connection.execute(
          `
          SELECT id FROM notifications 
          WHERE user_id = ? AND title LIKE ? AND message LIKE ?
          `,
          [userId, `%dépassée%`, `%${dao.objet}%`]
        );

        if ((existingNotif as any[]).length === 0) {
          // Créer une notification de retard
          await connection.execute(
            `
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (?, ?, ?, ?)
            `,
            [
              userId,
              'error',
              'Date de dépôt dépassée',
              `Le DAO "${dao.objet}" était dû il y a ${daysOverdue} jour${daysOverdue > 1 ? 's' : ''}`
            ]
          );

          // Envoyer un email à l'admin
          const adminEmail = process.env.EMAIL_RECEIVER || 'deidesarr@gmail.com';
          await sendDepositNotification(adminEmail, dao.objet, -daysOverdue);
        }
      }
    }
  } catch (error) {
    console.error("Error checking deposit notifications:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, title, message } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const connection = await db();

    await connection.execute(
      `
      INSERT INTO notifications (user_id, type, title, message)
      VALUES (?, ?, ?, ?)
      `,
      [userId, type, title, message]
    );

    return NextResponse.json({
      success: true,
      message: "Notification created successfully",
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper functions for notification styling
function getNotificationIcon(type: string): string {
  switch (type.toLowerCase()) {
    case "error":
      return "mdi-alert-circle";
    case "warning":
      return "mdi-alert";
    case "info":
      return "mdi-information";
    case "success":
      return "mdi-check-circle";
    case "user":
      return "mdi-account-box";
    case "system":
      return "mdi-cog";
    case "comment":
      return "mdi-comment-text";
    default:
      return "mdi-bell";
  }
}

function getNotificationBgColor(type: string): string {
  switch (type.toLowerCase()) {
    case "error":
      return "bg-danger";
    case "warning":
      return "bg-warning";
    case "info":
      return "bg-info";
    case "success":
      return "bg-success";
    case "user":
      return "bg-primary";
    case "system":
      return "bg-secondary";
    case "comment":
      return "bg-primary";
    default:
      return "bg-primary";
  }
}