import nodemailer from 'nodemailer';

// Configuration du transporteur d'email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Fonction pour envoyer un email
export async function sendEmail(to: string, subject: string, html: string) {
  try {
    console.log("=== ENVOI EMAIL DÉTAILLÉ ===");
    console.log("Destinataire:", to);
    console.log("Sujet:", subject);
    console.log("Configuration SMTP:");
    console.log("- Host:", process.env.EMAIL_HOST);
    console.log("- Port:", process.env.EMAIL_PORT);
    console.log("- User:", process.env.EMAIL_USER ? "***" + process.env.EMAIL_USER.slice(-4) : "NON DÉFINI");
    console.log("- Password:", process.env.EMAIL_PASSWORD ? "***CONFIGURÉ***" : "NON DÉFINI");
    console.log("- From:", process.env.EMAIL_FROM);
    console.log("- From Name:", process.env.EMAIL_FROM_NAME);
    console.log("==============================");

    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'DAO Project'}" <${process.env.EMAIL_FROM || 'noreply@dao-project.com'}>`,
      to: to,
      subject: subject,
      html: html,
    });

    console.log(' Email envoyé avec succès:', info.messageId);
    console.log('Réponse du serveur SMTP:', info.response);
    console.log("=== ENVOI EMAIL TERMINÉ AVEC SUCCÈS ===");
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(' Erreur lors de l\'envoi de l\'email:', error);
    console.error('Type d\'erreur:', error.constructor.name);
    console.error('Code d\'erreur:', error.code);
    console.error('Message d\'erreur:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error(' ERREUR D\'AUTHENTIFICATION SMTP:');
      console.error('- Vérifier le mot de passe d\'application Gmail');
      console.error('- Vérifier que le compte Gmail est actif');
      console.error('- Confirmer la vérification 2 étapes');
    } else if (error.code === 'ECONNECTION') {
      console.error(' ERREUR DE CONNEXION SMTP:');
      console.error('- Vérifier le serveur SMTP et le port');
      console.error('- Vérifier le firewall/antivirus');
    } else if (error.code === 'ESOCKET') {
      console.error(' ERREUR DE SOCKET:');
      console.error('- Problème de connexion réseau');
    }
    
    console.log("=== ENVOI EMAIL TERMINÉ AVEC ERREUR ===");
    return { success: false, error };
  }
}

// Fonction pour envoyer une notification de dépôt
export async function sendDepositNotification(adminEmail: string, daoName: string, daysUntil: number) {
  const isOverdue = daysUntil < 0;
  const daysText = isOverdue ? `il y a ${Math.abs(daysUntil)} jour${Math.abs(daysUntil) > 1 ? 's' : ''}` : `dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`;
  
  const subject = isOverdue ? ' Date de dépôt dépassée' : '⚠️ Date de dépôt approche';
  const color = isOverdue ? '#dc3545' : '#f59e0b';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Notification DAO Project</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Roboto', Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4b49ac, #7da0fa); padding: 30px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 500;">DAO Project</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Système de Notifications</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
          <div style="background-color: rgba(${color}, 0.2); border-left: 4px solid ${color}; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <h2 style="color: ${color}; margin: 0 0 10px 0; font-size: 18px;">${subject}</h2>
            <p style="color: #333; margin: 0; font-size: 16px; line-height: 1.5;">
              Le DAO <strong>"${daoName}"</strong> ${isOverdue ? 'était dû' : 'doit être déposé'} <strong>${daysText}</strong>.
            </p>
          </div>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;">
            <h3 style="color: #495057; margin: 0 0 15px 0; font-size: 16px;">Actions recommandées :</h3>
            <ul style="color: #495057; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li style="margin-bottom: 8px;">Vérifier l'état d'avancement du DAO "${daoName}"</li>
              <li style="margin-bottom: 8px;">Contacter le chef de projet concerné</li>
              <li style="margin-bottom: 8px;">Prendre les mesures nécessaires pour finaliser le dépôt</li>
              ${isOverdue ? '<li style="margin-bottom: 8px;">Analyser les raisons du retard</li>' : ''}
            </ul>
          </div>
          
         
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; margin: 0; font-size: 14px;">
            Cet email a été généré automatiquement par le système DAO Project.<br>
            Veuillez ne pas répondre à cet email.
          </p>
          <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 12px;">
            © 2024 DAO Project. Tous droits réservés.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(adminEmail, subject, html);
}

// Fonction pour envoyer un email de création de DAO
export async function sendDaoCreationEmail(daoName: string, chefProjetName: string, chefProjetEmail: string) {
  const subject = "🆕 Nouveau DAO créé - Vous êtes le chef de projet";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nouveau DAO créé - DAO Project</title>
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
            <h2 style="color: #155724; margin: 0 0 10px 0; font-size: 18px;">🎉 Vous avez été assigné comme chef de projet !</h2>
            <p style="color: #155724; margin: 0; font-size: 16px; line-height: 1.5;">
              Un nouveau DAO a été créé et vous avez été désigné comme chef de projet pour ce projet.
            </p>
          </div>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;">
            <h3 style="color: #495057; margin: 0 0 15px 0; font-size: 16px;">📋 Informations du DAO :</h3>
            <ul style="color: #495057; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li style="margin-bottom: 8px;"><strong>Nom du DAO :</strong> ${daoName}</li>
              <li style="margin-bottom: 8px;"><strong>Chef de projet :</strong> ${chefProjetName}</li>
              <li style="margin-bottom: 8px;"><strong>Email du chef de projet :</strong> ${chefProjetEmail}</li>
              <li style="margin-bottom: 8px;"><strong>Date de création :</strong> ${new Date().toLocaleDateString('fr-FR')}</li>
            </ul>
          </div>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-radius: 4px; border: 1px solid #ffeaa7;">
            <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 16px;">🔐 Vos responsabilités :</h3>
            <ol style="color: #856404; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li style="margin-bottom: 8px;">Superviser l'avancement du projet "${daoName}"</li>
              <li style="margin-bottom: 8px;">Coordonner l'équipe assignée au projet</li>
              <li style="margin-bottom: 8px;">Suivre les délais et la date de dépôt prévue</li>
              <li style="margin-bottom: 8px;">Valider les tâches et les livrables</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:2005'}/dash/DirecteurGeneral" 
               style="display: inline-block; background: linear-gradient(135deg, #4b49ac, #7da0fa); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
              🚀 Accéder au Dashboard
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; margin: 0; font-size: 14px;">
            Cet email a été généré automatiquement par le système DAO Project.<br>
            Vous avez été désigné comme chef de projet pour ce DAO. Pour toute question, contactez l'administrateur.
          </p>
          <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 12px;">
            © 2024 DAO Project. Tous droits réservés.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Envoyer l'email au chef de projet au lieu de l'admin
  const targetEmail = chefProjetEmail || process.env.EMAIL_RECEIVER || 'deidesarr@gmail.com';
  console.log("Email de création de DAO envoyé au chef de projet:", targetEmail);
  return await sendEmail(targetEmail, subject, html);
}
