import { sendEmail } from './email';

// Fonction pour envoyer un email de notification de tâche assignée
export async function sendTaskAssignmentEmail(
  taskTitle: string, 
  taskDescription: string, 
  assignedUserName: string, 
  assignedUserEmail: string, 
  daoName: string,
  taskPriority: string,
  taskDeadline?: string
) {
  const subject = "📋 Nouvelle tâche assignée - DAO Project";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nouvelle tâche assignée - DAO Project</title>
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
          <div style="background-color: #d1ecf1; border-left: 4px solid #0d6efd; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <h2 style="color: #0c5460; margin: 0 0 10px 0; font-size: 18px;">📋 Nouvelle tâche assignée !</h2>
            <p style="color: #0c5460; margin: 0; font-size: 16px; line-height: 1.5;">
              Bonjour ${assignedUserName}, une nouvelle tâche vous a été assignée dans le cadre du projet "${daoName}".
            </p>
          </div>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;">
            <h3 style="color: #495057; margin: 0 0 15px 0; font-size: 16px;">📝 Détails de la tâche :</h3>
            <ul style="color: #495057; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li style="margin-bottom: 8px;"><strong>Titre :</strong> ${taskTitle}</li>
              <li style="margin-bottom: 8px;"><strong>Description :</strong> ${taskDescription || 'Non spécifiée'}</li>
              <li style="margin-bottom: 8px;"><strong>Projet :</strong> ${daoName}</li>
              <li style="margin-bottom: 8px;"><strong>Priorité :</strong> ${taskPriority || 'Non spécifiée'}</li>
              ${taskDeadline ? `<li style="margin-bottom: 8px;"><strong>Date d'échéance :</strong> ${taskDeadline}</li>` : ''}
            </ul>
          </div>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-radius: 4px; border: 1px solid #ffeaa7;">
            <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 16px;">⚡ Actions requises :</h3>
            <ol style="color: #856404; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li style="margin-bottom: 8px;">Prendre connaissance de la tâche "${taskTitle}"</li>
              <li style="margin-bottom: 8px;">Planifier les actions nécessaires pour la réaliser</li>
              <li style="margin-bottom: 8px;">Respecter la date d'échéance ${taskDeadline || 'définie'}</li>
              <li style="margin-bottom: 8px;">Mettre à jour le statut d'avancement régulièrement</li>
            </ol>
          </div>
          
         
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; margin: 0; font-size: 14px;">
            Cet email a été généré automatiquement par le système DAO Project.<br>
            Une nouvelle tâche vous a été assignée. Pour toute question, contactez votre chef de projet.
          </p>
          <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 12px;">
            © 2024 DAO Project. Tous droits réservés.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  console.log("Email de notification de tâche assignée envoyé à:", assignedUserEmail);
  return await sendEmail(assignedUserEmail, subject, html);
}
