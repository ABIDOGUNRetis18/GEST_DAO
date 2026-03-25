"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Chart from "chart.js/auto";
import { MessageSquare, FileText, User } from "lucide-react";
import html2canvas from "html2canvas";
// jsPDF chargé dynamiquement (voir usage)


// Fonction de sanitisation pour éviter les failles XSS dans les templates HTML
const escapeHtml = (str: string | undefined | null): string => {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};


interface DAO {
  id: number;
  reference?: string;
  objet?: string;
  autorite?: string;
  date_depot?: string;
  statut?: string;
  created_at?: string;
  numero?: string;
  description?: string;
  chef_id?: number;
  team_id?: string;
  groupement?: string;
  nom_partenaire?: string;
}

interface Task {
  id: number;
  dao_id: number;
  id_task: number;
  titre?: string;
  description?: string;
  statut?: string;
  progress?: number;
  date_creation?: string;
  date_echeance?: string;
  priorite?: string;
  assigned_to?: number;
}

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  url_photo: string;
  role_id: number;
  roleName: string;
  roleLabel: string;
}

interface Comment {
  id: number;
  user: string;
  role: string;
  text: string;
  time: string;
  task_id: number;
  user_id?: number;
  mentioned_user_id?: number;
  mentioned_user_name?: string;
  is_public?: boolean;
}

export default function LecteurDashboard() {
  const [daos, setDaos] = useState<DAO[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDao, setSelectedDao] = useState<DAO | null>(null);
  const [chartsReady, setChartsReady] = useState(false);
  
  // États pour les commentaires
  const [comments, setComments] = useState<Comment[]>([]);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [globalComment, setGlobalComment] = useState("");
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch data from APIs
  useEffect(() => {
    // Charger l'utilisateur connecté depuis localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setCurrentUser(parsedUser);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch DAOs
        const daosResponse = await fetch('/api/daos');
        if (daosResponse.ok) {
          const daosData = await daosResponse.json();
          setDaos(daosData.success ? daosData.data : []);
        }

        // Fetch Tasks
        const tasksResponse = await fetch('/api/tasks');
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          setTasks(tasksData.success ? tasksData.data : []);
        }

        // Fetch Users
        const usersResponse = await fetch('/api/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData.success ? usersData.data : []);
        }

        // Charger les commentaires
        await loadComments();
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // Charger les commentaires
  const loadComments = async () => {
    try {
      const response = await fetch(`/api/messages?task_id=1`);
      const result = await response.json();

      if (result.success && result.data) {
        // Adapter les données de la base au format attendu
        const adaptedComments = result.data.map((msg: any) => ({
          id: msg.id,
          user: msg.user_name || 'Utilisateur',
          role: 'Utilisateur',
          text: msg.content,
          time: new Date(msg.created_at).toLocaleString('fr-FR'),
          task_id: msg.task_id,
          user_id: msg.user_id,
          mentioned_user_id: msg.mentioned_user_id,
          mentioned_user_name: msg.mentioned_user_name,
          is_public: msg.is_public
        }));
        
        setComments(adaptedComments);
      }
    } catch (error) {
      // Erreur silencieuse
    }
  };

  // Filtrer les commentaires pour la tâche sélectionnée avec logique de visibilité
  const getFilteredComments = () => {
    const taskComments = comments.filter(c => c.task_id === 1);
    return taskComments.filter(comment => {
      // Exclure les messages de l'utilisateur lui-même
      if (comment.user_id === currentUser?.id) return false;
      
      // Toujours afficher les commentaires publics des autres utilisateurs
      if (comment.is_public) return true;
      
      // Afficher les mentions privées uniquement au destinataire
      return comment.mentioned_user_id === currentUser?.id;
    });
  };

  // Gérer les changements dans le textarea
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setGlobalComment(value);

    // Détecter si l'utilisateur tape @ pour les mentions
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1);
      const spaceIndex = textAfterAt.indexOf(' ');
      
      if (spaceIndex === -1) {
        // L'utilisateur est en train de taper une mention
        setMentionSearch(textAfterAt);
        setShowMentionSuggestions(true);
      } else {
        setShowMentionSuggestions(false);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  // Insérer une mention
  const insertMention = (user: User) => {
    const lastAtIndex = globalComment.lastIndexOf('@');
    const newText = globalComment.substring(0, lastAtIndex) + `@${user.username} `;
    setGlobalComment(newText);
    setShowMentionSuggestions(false);
    commentInputRef.current?.focus();
  };

  // Ajouter un commentaire global
  const addGlobalComment = async () => {
    if (!globalComment.trim()) return;

    let mentionedUserId: number | undefined;
    let isPublic = true;

    // Vérifier s'il y a une mention @
    const mentionMatch = globalComment.match(/@(\w+)/);
    if (mentionMatch) {
      const mentionedUserName = mentionMatch[1].toLowerCase();
      const mentionedUser = users.find(u => u.username.toLowerCase() === mentionedUserName);
      
      if (mentionedUser) {
        mentionedUserId = mentionedUser.id;
        isPublic = false; // Si mention, c'est un message privé
      }
    }

    try {
      // Sauvegarder le commentaire en base de données
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: 1, // Utiliser une tâche par défaut pour le dashboard
          user_id: currentUser?.id || 43,
          content: globalComment.trim(),
          mentioned_user_id: mentionedUserId,
          mentioned_user_name: mentionedUserId ? users.find(u => u.id === mentionedUserId)?.username : undefined,
          is_public: isPublic
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Rafraîchir les commentaires
        await loadComments();
        setGlobalComment('');
        setShowMentionSuggestions(false);
      }
    } catch (error) {
      // Erreur silencieuse
    }
    
    // Ne pas fermer automatiquement le modal - laisser l'utilisateur décider
  };

  // Ouvrir le modal de commentaire
  const openCommentModal = () => {
    setShowCommentModal(true);
  };

  // Fonction pour imprimer en PDF
// Fonction pour télécharger en PDF complet adapté au Directeur Général
  const downloadDGComprehensivePDF = async () => {
    try {
      // Afficher un indicateur de chargement
      const loadingIndicator = document.createElement('div');
      loadingIndicator.innerHTML = 'Génération du rapport DG complet...';
      loadingIndicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 9999;
        font-size: 16px;
      `;
      document.body.appendChild(loadingIndicator);

      // Attendre que les graphiques soient complètement rendus
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Détecter le type d'écran et adapter la mise en page
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      const isMobile = screenWidth <= 768;
      const isTablet = screenWidth > 768 && screenWidth <= 1024;
      const isDesktop = screenWidth > 1024;
      
      // Adapter les dimensions et polices selon l'écran
      let containerWidth, padding, fontSize, titleSize, cardPadding, gridCols;
      
      if (isMobile) {
        containerWidth = '100%';
        padding = '8mm';
        fontSize = '10px';
        titleSize = '20px';
        cardPadding = '10px';
        gridCols = 'repeat(2, 1fr)';
      } else if (isTablet) {
        containerWidth = '210mm';
        padding = '12mm';
        fontSize = '11px';
        titleSize = '24px';
        cardPadding = '15px';
        gridCols = 'repeat(3, 1fr)';
      } else {
        containerWidth = '210mm';
        padding = '15mm';
        fontSize = '12px';
        titleSize = '28px';
        cardPadding = '20px';
        gridCols = 'repeat(4, 1fr)';
      }

      // Créer un conteneur temporaire pour le PDF adaptatif
      const pdfContainer = document.createElement('div');
      pdfContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 210mm;
        min-height: 297mm;
        background: white;
        padding: 10mm;
        font-family: 'Roboto', Arial, sans-serif;
        box-sizing: border-box;
        font-size: ${fontSize};
        line-height: 1.4;
        overflow: hidden;
      `;

      // En-tête professionnel avec logo et couleurs entreprise adaptatif
      pdfContainer.innerHTML = `
        <div style="background: linear-gradient(135deg, #6493FF, #3155A7); color: white; text-align: center; padding: ${isMobile ? '15px 8px' : '20px 10px'}; margin: -10mm -10mm 15mm -10mm; border-radius: 0 0 ${isMobile ? '8px' : '15px'} ${isMobile ? '8px' : '15px'};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${isMobile ? '12px' : '15px'};">
            <div style="text-align: left;">
              <div style="display: flex; align-items: center; gap: ${isMobile ? '10px' : '14px'};">
                <div style="width: ${isMobile ? '60px' : '70px'}; height: ${isMobile ? '40px' : '45px'}; background: white; border-radius: ${isMobile ? '6px' : '8px'}; display: flex; align-items: center; justify-content: center; padding: ${isMobile ? '6px' : '8px'}; box-shadow: 0 4px 8px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.2);">
                  <img src="/images/logo.png" alt="2SND Technologies" style="width: 100%; height: 100%; object-fit: contain; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
                </div>
                <div>
                  <div style="font-size: ${isMobile ? '14px' : '16px'}; font-weight: bold; opacity: 0.95; line-height: 1.1;">2SND Technologies</div>
                  <div style="font-size: ${isMobile ? '9px' : '11px'}; opacity: 0.8; margin-top: 1px;">Plateforme DAO</div>
                </div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: ${isMobile ? '9px' : '11px'}; opacity: 0.8;">${new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
          <h3 style="margin: 0; font-size: ${isMobile ? '18px' : '22px'}; font-weight: bold; letter-spacing: 0.5px; text-align: center;">Rapport de Synthèse des DAO</h3>
        </div>

        <!-- Section Synthèse adaptative -->
        <div style="margin-bottom: 12mm; background: white; border: 2px solid #e5e7eb; border-radius: ${isMobile ? '6px' : '8px'}; padding: ${isMobile ? '12px' : '16px'}; box-shadow: 0 3px 6px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #6493FF, #3155A7); color: white; padding: ${isMobile ? '10px 12px' : '12px 16px'}; margin: -${cardPadding} -${cardPadding} ${cardPadding} -${cardPadding}; border-radius: ${isMobile ? '4px' : '6px'} ${isMobile ? '4px' : '6px'} 0 0;">
            <h3 style="margin: 0; font-size: ${isMobile ? '14px' : '16px'}; font-weight: bold; letter-spacing: 0.5px;">SYNTHÈSE</h3>
          </div>
          <div style="display: grid; grid-template-columns: ${gridCols}; gap: ${isMobile ? '8px' : '12px'}; padding-top: ${cardPadding};">
            <div style="background: linear-gradient(135deg, #f8f9fa, #ffffff); border: 1px solid #e5e7eb; border-radius: ${isMobile ? '6px' : '8px'}; padding: ${isMobile ? '12px' : '16px'}; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: all 0.3s ease;">
              <div style="width: 40px; height: 3px; background: linear-gradient(90deg, #6493FF, #3155A7); margin: 0 auto ${isMobile ? '8px' : '12px'} auto; border-radius: 2px;"></div>
              <div style="font-size: ${isMobile ? '24px' : '30px'}; font-weight: bold; color: #6493FF; margin-bottom: 6px; line-height: 1;">${stats.totalDaos}</div>
              <div style="font-size: ${isMobile ? '10px' : '12px'}; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">DAO Total</div>
            </div>
            <div style="background: linear-gradient(135deg, #fef2f2, #ffffff); border: 1px solid #fecaca; border-radius: ${isMobile ? '6px' : '8px'}; padding: ${isMobile ? '12px' : '16px'}; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: all 0.3s ease;">
              <div style="width: 40px; height: 3px; background: linear-gradient(90deg, #dc3545, #ef4444); margin: 0 auto ${isMobile ? '8px' : '12px'} auto; border-radius: 2px;"></div>
              <div style="font-size: ${isMobile ? '24px' : '30px'}; font-weight: bold; color: #dc3545; margin-bottom: 6px; line-height: 1;">${stats.atRiskDaos}</div>
              <div style="font-size: ${isMobile ? '10px' : '12px'}; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">À Risque</div>
            </div>
            <div style="background: linear-gradient(135deg, #f0fdf4, #ffffff); border: 1px solid #bbf7d0; border-radius: ${isMobile ? '6px' : '8px'}; padding: ${isMobile ? '12px' : '16px'}; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: all 0.3s ease;">
              <div style="width: 40px; height: 3px; background: linear-gradient(90deg, #71c016, #22c55e); margin: 0 auto ${isMobile ? '8px' : '12px'} auto; border-radius: 2px;"></div>
              <div style="font-size: ${isMobile ? '24px' : '30px'}; font-weight: bold; color: #71c016; margin-bottom: 6px; line-height: 1;">${stats.inProgressDaos}</div>
              <div style="font-size: ${isMobile ? '10px' : '12px'}; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">En Cours</div>
            </div>
            ${!isMobile ? `
            <div style="background: linear-gradient(135deg, #f0fdf4, #ffffff); border: 1px solid #bbf7d0; border-radius: ${isMobile ? '6px' : '8px'}; padding: ${isMobile ? '12px' : '16px'}; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: all 0.3s ease;">
              <div style="width: 40px; height: 3px; background: linear-gradient(90deg, #10b981, #22c55e); margin: 0 auto ${isMobile ? '8px' : '12px'} auto; border-radius: 2px;"></div>
              <div style="font-size: ${isMobile ? '24px' : '30px'}; font-weight: bold; color: #10b981; margin-bottom: 6px; line-height: 1;">${stats.completedDaos}</div>
              <div style="font-size: ${isMobile ? '10px' : '12px'}; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Terminées</div>
            </div>
            ` : ''}
          </div>
        </div>
      `;

      // Sections individuelles pour chaque DAO avec un seul graphique
      pdfContainer.innerHTML += daos.map((dao, daoIndex) => {
        const daoTasks = tasks.filter(task => task.dao_id === dao.id);
        const avgProgress = daoTasks.length > 0 
          ? Math.round(daoTasks.reduce((sum, task) => sum + (task.progress || 0), 0) / daoTasks.length)
          : 0;
        
        const completedTasks = daoTasks.filter(t => t.progress === 100).length;
        const totalTasks = daoTasks.length;
        
        const performance = avgProgress > 70 ? 'HIGH' : avgProgress > 40 ? 'MEDIUM' : 'LOW';
        const performanceColor = avgProgress > 70 ? '#22c55e' : avgProgress > 40 ? '#eab308' : '#ef4444';
        
        // Créer un graphique de progression comme dans le dashboard
        const chartData = daoTasks.map((task, index) => ({
          label: `Tâche ${index + 1}`,
          progress: task.progress || 0
        }));
        
        const isFirstDao = daoIndex === 0;
        
        return `
          <!-- Section individuelle pour ${escapeHtml(dao.reference as string)} adaptative -->
          <div style="margin-bottom: 15mm; ${isFirstDao ? 'page-break-before: avoid;' : 'page-break-before: always;'} page-break-inside: avoid;">
            <div style="background: white; border: 2px solid #e5e7eb; border-radius: ${isMobile ? '8px' : '10px'}; box-shadow: 0 3px 6px rgba(0,0,0,0.08); overflow: hidden;">
              <div style="background: linear-gradient(135deg, #6493FF, #3155A7); color: white; padding: ${isMobile ? '12px 16px' : '16px 20px'}; text-align: center;">
                <h2 style="margin: 0; font-size: ${isMobile ? '16px' : '20px'}; font-weight: bold; letter-spacing: 0.5px;">${escapeHtml(dao.reference as string)}</h2>
                <p style="margin: ${isMobile ? '4px' : '6px'} 0 0 0; font-size: ${isMobile ? '10px' : '12px'}; opacity: 0.9;">${escapeHtml(dao.objet as string)}</p>
              </div>
              
              <div style="padding: ${isMobile ? '16px' : '20px'};">
                
                <!-- KPIs principaux adaptatifs -->
                <div style="margin-bottom: ${isMobile ? '12px' : '16mm'};">
                  <div style="display: grid; grid-template-columns: ${isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'}; gap: ${isMobile ? '8px' : '12px'};">
                    <div style="background: linear-gradient(135deg, #f8f9fa, #ffffff); border: 1px solid #e5e7eb; border-radius: ${isMobile ? '6px' : '8px'}; padding: ${isMobile ? '12px' : '16px'}; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                      <div style="width: 30px; height: 2px; background: linear-gradient(90deg, #6493FF, #3155A7); margin: 0 auto ${isMobile ? '8px' : '10px'} auto; border-radius: 2px;"></div>
                      <div style="font-size: ${isMobile ? '18px' : '24px'}; font-weight: bold; color: #6493FF; margin-bottom: 4px; line-height: 1;">${avgProgress}%</div>
                      <div style="font-size: ${isMobile ? '8px' : '10px'}; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Progression</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #fef2f2, #ffffff); border: 1px solid #fecaca; border-radius: ${isMobile ? '6px' : '8px'}; padding: ${isMobile ? '12px' : '16px'}; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                      <div style="width: 30px; height: 2px; background: linear-gradient(90deg, ${performanceColor}, ${performanceColor}); margin: 0 auto ${isMobile ? '8px' : '10px'} auto; border-radius: 2px;"></div>
                      <div style="font-size: ${isMobile ? '18px' : '24px'}; font-weight: bold; color: ${performanceColor}; margin-bottom: 4px; line-height: 1;">${performance}</div>
                      <div style="font-size: ${isMobile ? '8px' : '10px'}; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Statut</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #f0fdf4, #ffffff); border: 1px solid #bbf7d0; border-radius: ${isMobile ? '6px' : '8px'}; padding: ${isMobile ? '12px' : '16px'}; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                      <div style="width: 30px; height: 2px; background: linear-gradient(90deg, #71c016, #22c55e); margin: 0 auto ${isMobile ? '8px' : '10px'} auto; border-radius: 2px;"></div>
                      <div style="font-size: ${isMobile ? '18px' : '24px'}; font-weight: bold; color: #71c016; margin-bottom: 4px; line-height: 1;">${completedTasks}</div>
                      <div style="font-size: ${isMobile ? '8px' : '10px'}; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Tâches Complétées</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #f8f9fa, #ffffff); border: 1px solid #e5e7eb; border-radius: ${isMobile ? '6px' : '8px'}; padding: ${isMobile ? '12px' : '16px'}; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                      <div style="width: 30px; height: 2px; background: linear-gradient(90deg, #686868, #9ca3af); margin: 0 auto ${isMobile ? '8px' : '10px'} auto; border-radius: 2px;"></div>
                      <div style="font-size: ${isMobile ? '18px' : '24px'}; font-weight: bold; color: #686868; margin-bottom: 4px; line-height: 1;">${totalTasks}</div>
                      <div style="font-size: ${isMobile ? '8px' : '10px'}; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Total Tâches</div>
                    </div>
                  </div>
                </div>

                <!-- Graphique Chart.js comme dans le dashboard -->
                <div style="margin-bottom: ${isMobile ? '12px' : '16mm'};">
                  <div style="background: white; border: 1px solid #e5e7eb; border-radius: ${isMobile ? '8px' : '10px'}; padding: ${isMobile ? '16px' : '20px'}; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="background: linear-gradient(135deg, #6493FF, #3155A7); color: white; padding: ${isMobile ? '10px 12px' : '12px 16px'}; margin: -${isMobile ? '16px' : '20px'} -${isMobile ? '16px' : '20px'} ${isMobile ? '12px' : '16px'} -${isMobile ? '16px' : '20px'}; border-radius: ${isMobile ? '6px' : '8px'} ${isMobile ? '6px' : '8px'} 0 0;">
                      <h3 style="margin: 0; font-size: ${isMobile ? '12px' : '14px'}; font-weight: bold; letter-spacing: 0.5px;">PROGRESSION DES TÂCHES</h3>
                    </div>
                    <div style="height: ${isMobile ? '140px' : '200px'}; position: relative; background: white; border-radius: ${isMobile ? '3px' : '4px'}; padding: ${isMobile ? '10px' : '14px'}; border: 1px solid #e5e7eb;">
                      <canvas id="pdf-progress-chart-${dao.id}" style="width: 100%; height: 100%;"></canvas>
                    </div>
                  </div>
                </div>

                <!-- Détails supplémentaires adaptatifs -->
                <div style="background: linear-gradient(135deg, #f8f9fa, #ffffff); border: 1px solid #e5e7eb; border-radius: ${isMobile ? '8px' : '10px'}; padding: ${isMobile ? '12px' : '16px'}; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                  <div style="display: grid; grid-template-columns: ${isMobile ? '1fr' : '2fr 1fr 1fr'}; gap: ${isMobile ? '8px' : '12px'}; align-items: center;">
                    <div>
                      <div style="font-size: ${isMobile ? '8px' : '10px'}; color: #6b7280; margin-bottom: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Autorité</div>
                      <div style="font-size: ${isMobile ? '9px' : '11px'}; font-weight: 600; color: #2a2a2a; padding: 4px 8px; background: white; border-radius: 4px; border: 1px solid #e5e7eb;">${dao.autorite || 'N/A'}</div>
                    </div>
                    <div>
                      <div style="font-size: ${isMobile ? '8px' : '10px'}; color: #6b7280; margin-bottom: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Date Dépôt</div>
                      <div style="font-size: ${isMobile ? '9px' : '11px'}; font-weight: 600; color: #2a2a2a; padding: 4px 8px; background: white; border-radius: 4px; border: 1px solid #e5e7eb;">${dao.date_depot ? new Date(dao.date_depot).toLocaleDateString('fr-FR') : 'N/A'}</div>
                    </div>
                    <div>
                      <div style="font-size: ${isMobile ? '8px' : '10px'}; color: #6b7280; margin-bottom: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Statut</div>
                      <span style="background: linear-gradient(135deg, #dbe6ff, #bfdbfe); color: #6493FF; padding: 4px 8px; border-radius: 6px; font-size: ${isMobile ? '8px' : '10px'}; font-weight: 600; border: 1px solid #93c5fd;">
                        ${dao.statut || 'EN COURS'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        `;
      }).join('');

      
      // Section Détails par DAO avec informations complètes adaptative
      pdfContainer.innerHTML += `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #3155A7; margin: 0 0 15px 0; font-size: ${isMobile ? '14px' : '16px'}; font-weight: bold; border-bottom: 2px solid #6493FF; padding-bottom: 8px;">DÉTAILS DES DAO</h3>
          <div style="background: white; border-radius: ${isMobile ? '6px' : '8px'}; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; margin: 0; font-size: ${isMobile ? '9px' : '11px'}; min-width: ${isMobile ? '600px' : 'auto'};">
                <thead>
                  <tr style="background: linear-gradient(135deg, #6493FF, #3155A7); color: white;">
                    <th style="padding: ${isMobile ? '8px 6px' : '10px'}; text-align: left; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap;">Référence</th>
                    <th style="padding: ${isMobile ? '8px 6px' : '10px'}; text-align: left; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap;">Objet</th>
                    <th style="padding: ${isMobile ? '8px 6px' : '10px'}; text-align: left; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap;">Autorité</th>
                    <th style="padding: ${isMobile ? '8px 6px' : '10px'}; text-align: left; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap;">Date Dépôt</th>
                    <th style="padding: ${isMobile ? '8px 6px' : '10px'}; text-align: center; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap;">Statut</th>
                    <th style="padding: ${isMobile ? '8px 6px' : '10px'}; text-align: center; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap;">Progression</th>
                    <th style="padding: ${isMobile ? '8px 6px' : '10px'}; text-align: center; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap;">Tâches</th>
                    <th style="padding: ${isMobile ? '8px 6px' : '10px'}; text-align: center; font-weight: 600; white-space: nowrap;">Risque</th>
                  </tr>
                </thead>
                <tbody>
                  ${daos.map((dao, index) => {
                    const daoTasks = tasks.filter(task => task.dao_id === dao.id);
                    const avgProgress = daoTasks.length > 0 
                      ? Math.round(daoTasks.reduce((sum, task) => sum + (task.progress || 0), 0) / daoTasks.length)
                      : 0;
                    
                    const completedTasks = daoTasks.filter(t => t.progress === 100).length;
                    const totalTasks = daoTasks.length;
                    
                    const computeStatus = () => {
                      const statut = String(dao.statut || "").toUpperCase();
                      if (statut === "TERMINEE" || statut === "TERMINE") {
                        return { label: "Terminée", color: "#22c55e", bgColor: "#f0fdf4" };
                      }
                      if (!dao.date_depot) {
                        return { label: "En cours", color: "#eab308", bgColor: "#fefce8" };
                      }
                      const dateDepot = new Date(dao.date_depot);
                      const today = new Date();
                      const diffDays = Math.floor((dateDepot.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      if (diffDays >= 5) {
                        return { label: "En cours", color: "#eab308", bgColor: "#fefce8" };
                      }
                      if (diffDays <= 3) {
                        return { label: "À risque", color: "#ef4444", bgColor: "#fef2f2" };
                      }
                      return { label: "En cours", color: "#eab308", bgColor: "#fefce8" };
                    };

                    const status = computeStatus();
                    const rowColor = index % 2 === 0 ? '#f9fafb' : 'white';
                    
                    return `
                      <tr style="background: ${rowColor}; ${index === daos.length - 1 ? '' : 'border-bottom: 1px solid #e2e8f0;'}">
                        <td style="padding: ${isMobile ? '6px 4px' : '8px'}; font-weight: 600; color: #1f2937; border-right: 1px solid #e2e8f0; white-space: nowrap;">${escapeHtml(dao.reference as string)}</td>
                        <td style="padding: ${isMobile ? '6px 4px' : '8px'}; color: #374151; border-right: 1px solid #e2e8f0; max-width: ${isMobile ? '120px' : '200px'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(dao.objet as string)}</td>
                        <td style="padding: ${isMobile ? '6px 4px' : '8px'}; color: #374151; border-right: 1px solid #e2e8f0; white-space: nowrap;">${dao.autorite || 'N/A'}</td>
                        <td style="padding: ${isMobile ? '6px 4px' : '8px'}; color: #374151; border-right: 1px solid #e2e8f0; white-space: nowrap;">${dao.date_depot ? new Date(dao.date_depot).toLocaleDateString('fr-FR') : 'N/A'}</td>
                        <td style="padding: ${isMobile ? '6px 4px' : '8px'}; text-align: center; border-right: 1px solid #e2e8f0; white-space: nowrap;">
                          <span style="background: ${status.bgColor}; color: ${status.color}; padding: ${isMobile ? '2px 6px' : '3px 8px'}; border-radius: 12px; font-size: ${isMobile ? '8px' : '10px'}; font-weight: 600;">
                            ${status.label}
                          </span>
                        </td>
                        <td style="padding: ${isMobile ? '6px 4px' : '8px'}; text-align: center; border-right: 1px solid #e2e8f0; white-space: nowrap;">
                          <div style="display: flex; align-items: center; justify-content: center; gap: ${isMobile ? '3px' : '6px'};">
                            <div style="width: ${isMobile ? '25px' : '35px'}; height: 4px; background: #e2e8f0; border-radius: 2px;">
                              <div style="background: ${avgProgress > 70 ? '#22c55e' : avgProgress > 40 ? '#6493FF' : '#3155A7'}; height: 4px; border-radius: 2px; width: ${avgProgress}%;"></div>
                            </div>
                            <span style="font-size: ${isMobile ? '8px' : '10px'}; font-weight: 600; color: #374151;">${avgProgress}%</span>
                          </div>
                        </td>
                        <td style="padding: ${isMobile ? '6px 4px' : '8px'}; text-align: center; border-right: 1px solid #e2e8f0; white-space: nowrap;">
                          <span style="color: #374151; font-weight: 600; font-size: ${isMobile ? '8px' : '10px'};">${completedTasks}/${totalTasks}</span>
                        </td>
                        <td style="padding: ${isMobile ? '6px 4px' : '8px'}; text-align: center; white-space: nowrap;">
                          ${status.label === 'À risque' ? `<span style="color: #ef4444; font-weight: bold; font-size: ${isMobile ? '8px' : '10px'};">ÉLEVÉ</span>` : 
                            status.label === 'En cours' ? `<span style="color: #eab308; font-weight: bold; font-size: ${isMobile ? '8px' : '10px'};">MODÉRÉ</span>` : 
                            `<span style="color: #22c55e; font-weight: bold; font-size: ${isMobile ? '8px' : '10px'};">FAIBLE</span>`}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Section Recommandations et Conclusions
      const riskDaosCount = daos.filter(d => {
        const statut = String(d.statut || "").toUpperCase();
        if (statut === "TERMINEE" || statut === "TERMINE") return false;
        if (!d.date_depot) return false;
        const diffDays = Math.floor((new Date(d.date_depot).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 3;
      }).length;

      document.body.appendChild(pdfContainer);

      // Créer les graphiques Chart.js pour chaque DAO dans le PDF (identique au dashboard)
      await new Promise(resolve => setTimeout(resolve, 500)); // Attendre que le DOM soit prêt
      
      daos.forEach(dao => {
        const daoTasks = tasks.filter(task => task.dao_id === dao.id);
        if (daoTasks.length === 0) return;
        
        const canvas = document.getElementById(`pdf-progress-chart-${dao.id}`) as HTMLCanvasElement;
        if (!canvas) return;
        
        const sortedTasks = daoTasks.sort((a, b) => a.id_task - b.id_task);
        
        new Chart(canvas, {
          type: 'bar',
          data: {
            labels: sortedTasks.map(t => t.id_task.toString()),
            datasets: [{
              label: 'Progression (%)',
              data: sortedTasks.map(t => t.progress || 0),
              backgroundColor: sortedTasks.map(t => {
                const progress = t.progress || 0;
                if (progress === 100) return 'rgba(34, 197, 94, 0.8)';
                if (progress >= 75) return 'rgba(59, 130, 246, 0.8)';
                if (progress >= 50) return 'rgba(251, 146, 60, 0.8)';
                if (progress >= 25) return 'rgba(250, 204, 21, 0.8)';
                return 'rgba(239, 68, 68, 0.8)';
              }),
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                max: 100
              }
            },
            animation: {
              duration: 0
            }
          }
        });
      });

      // Capturer le conteneur complet avec optimisation poids et résolution
      const canvas = await html2canvas(pdfContainer, {
        scale: 2, // Réduit de 1.5 à 2 pour optimiser le poids
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: pdfContainer.scrollWidth,
        height: pdfContainer.scrollHeight,
        windowWidth: pdfContainer.scrollWidth,
        windowHeight: pdfContainer.scrollHeight
      });

      // Créer le PDF avec optimisation
      const imgData = canvas.toDataURL('image/jpeg', 0.8); // JPEG avec 80% de qualité pour réduire le poids
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true // Activer la compression PDF
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculer les dimensions pour remplir la page A4 sans marges excessives
      const imgWidth = pdfWidth - 10; // 5mm de marge de chaque côté
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 5; // 5mm du haut

      // Ajouter la première page
      pdf.addImage(imgData, 'JPEG', 5, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Gérer les pages multiples
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 5;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 5, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      // Sauvegarder avec nom optimisé
      pdf.save(`dao-report-${new Date().toISOString().split('T')[0]}.pdf`);

      // Nettoyer
      document.body.removeChild(pdfContainer);
      document.body.removeChild(loadingIndicator);

      console.log('PDF complet généré avec succès');

    } catch (error) {
      console.error('Erreur lors de la génération du PDF complet:', error);
      
      // Supprimer l'indicateur en cas d'erreur
      const loadingIndicator = document.querySelector('div[style*="position: fixed"]');
      if (loadingIndicator && loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }

      // Afficher un message d'erreur
      const errorMessage = document.createElement('div');
      errorMessage.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">Erreur PDF</div>
        <div style="font-size: 12px;">La génération du PDF a échoué. Veuillez réessayer.</div>
      `;
      errorMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        max-width: 300px;
      `;
      document.body.appendChild(errorMessage);

      setTimeout(() => {
        if (document.body.contains(errorMessage)) {
          document.body.removeChild(errorMessage);
        }
      }, 5000);
    }
  };

  // Set first DAO as selected when data is loaded
  useEffect(() => {
    if (daos.length > 0 && !selectedDao) {
      setSelectedDao(daos[0]);
    }
  }, [daos, selectedDao]);

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      totalDaos: daos.length,
      completedDaos: daos.filter(d => {
        const statut = String(d.statut || "").toUpperCase();
        return statut === "TERMINEE" || statut === "TERMINE";
      }).length,
      inProgressDaos: daos.filter(d => {
        const statut = String(d.statut || "").toUpperCase();
        if (statut === "TERMINEE" || statut === "TERMINE") {
          return false;
        }
        if (!d.date_depot) {
          return true;
        }
        const dateDepot = new Date(d.date_depot);
        const today = new Date();
        const diffMs = dateDepot.getTime() - today.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return diffDays >= 4; // Changé de 5 à 4 pour inclure le cas 4 jours
      }).length,
      atRiskDaos: daos.filter(d => {
        const statut = String(d.statut || "").toUpperCase();
        if (statut === "TERMINEE" || statut === "TERMINE") {
          return false;
        }
        if (!d.date_depot) {
          return false;
        }
        const dateDepot = new Date(d.date_depot);
        const today = new Date();
        const diffMs = dateDepot.getTime() - today.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return diffDays <= 3;
      }).length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.progress === 100).length,
      totalUsers: users.length,
    };
  }, [daos, tasks, users]);

  // Get tasks for selected DAO
  const selectedDaoTasks = useMemo(() => {
    if (!selectedDao) return [];
    return tasks.filter(task => task.dao_id === selectedDao.id);
  }, [selectedDao, tasks]);

  // Calculate DAO status
  const getDAOStatus = (dao: DAO) => {
    const statut = String(dao.statut || "").toUpperCase();
    
    if (statut === "TERMINEE" || statut === "TERMINE") {
      return { label: "Terminée", className: "px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800" };
    }
    
    if (!dao.date_depot) {
      return { label: "En cours", className: "px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800" };
    }
    
    const dateDepot = new Date(dao.date_depot);
    const today = new Date();
    const diffMs = dateDepot.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 4) { // Changé de 5 à 4 pour cohérence
      return { label: "En cours", className: "px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800" };
    }
    
    if (diffDays <= 3) {
      return { label: "À risque", className: "px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800" };
    }
    
    // Ce cas ne devrait plus arriver avec la correction, mais on le garde pour sécurité
    return { label: "En cours", className: "px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800" };
  };

  // Initialize charts - Only create once, then update data
  useEffect(() => {
    // Wait for data to be loaded and selected DAO to be set
    if (!selectedDao || selectedDaoTasks.length === 0) return;

    // Create charts only once
    const timer = setTimeout(() => {
      const progressCtx = document.getElementById('progressChart') as HTMLCanvasElement;
      const statusCtx = document.getElementById('statusChart') as HTMLCanvasElement;
      
      if (progressCtx && statusCtx) {
        // Check if charts already exist
        const existingProgressChart = Chart.getChart('progressChart');
        const existingStatusChart = Chart.getChart('statusChart');
        
        if (!existingProgressChart) {
          // Create progress chart
          new Chart(progressCtx, {
            type: 'bar',
            data: {
              labels: selectedDaoTasks.sort((a, b) => a.id_task - b.id_task).map(t => t.id_task.toString()),
              datasets: [{
                label: 'Progression (%)',
                data: selectedDaoTasks.sort((a, b) => a.id_task - b.id_task).map(t => t.progress || 0),
                backgroundColor: selectedDaoTasks.sort((a, b) => a.id_task - b.id_task).map(t => {
                  const progress = t.progress || 0;
                  if (progress === 100) return 'rgba(34, 197, 94, 0.8)';
                  if (progress >= 75) return 'rgba(59, 130, 246, 0.8)';
                  if (progress >= 50) return 'rgba(251, 146, 60, 0.8)';
                  if (progress >= 25) return 'rgba(250, 204, 21, 0.8)';
                  return 'rgba(239, 68, 68, 0.8)';
                }),
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100
                }
              },
              animation: {
                duration: 0 // Disable animation for faster updates
              }
            }
          });
        } else {
          // Update existing progress chart data
          const sortedTasks = selectedDaoTasks.sort((a, b) => a.id_task - b.id_task);
          existingProgressChart.data.labels = sortedTasks.map(t => t.id_task.toString());
          existingProgressChart.data.datasets[0].data = sortedTasks.map(t => t.progress || 0);
          existingProgressChart.data.datasets[0].backgroundColor = sortedTasks.map(t => {
            const progress = t.progress || 0;
            if (progress === 100) return 'rgba(34, 197, 94, 0.8)';
            if (progress >= 75) return 'rgba(59, 130, 246, 0.8)';
            if (progress >= 50) return 'rgba(251, 146, 60, 0.8)';
            if (progress >= 25) return 'rgba(250, 204, 21, 0.8)';
            return 'rgba(239, 68, 68, 0.8)';
          });
          existingProgressChart.update('none'); // Update without animation
        }
        
        if (!existingStatusChart) {
          // Create status chart
          const statusCounts = {
            completed: selectedDaoTasks.filter(t => (t.progress || 0) === 100).length,
            inProgress: selectedDaoTasks.filter(t => (t.progress || 0) > 0 && (t.progress || 0) < 100).length,
            notStarted: selectedDaoTasks.filter(t => (t.progress || 0) === 0).length,
          };

          new Chart(statusCtx, {
            type: 'doughnut',
            data: {
              labels: ['Terminées', 'En cours', 'Non démarrées'],
              datasets: [{
                data: [statusCounts.completed, statusCounts.inProgress, statusCounts.notStarted],
                backgroundColor: [
                  'rgba(34, 197, 94, 0.8)',
                  'rgba(251, 146, 60, 0.8)',
                  'rgba(239, 68, 68, 0.8)'
                ]
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: {
                duration: 0 // Disable animation for faster updates
              }
            }
          });
        } else {
          // Update existing status chart data
          const statusCounts = {
            completed: selectedDaoTasks.filter(t => (t.progress || 0) === 100).length,
            inProgress: selectedDaoTasks.filter(t => (t.progress || 0) > 0 && (t.progress || 0) < 100).length,
            notStarted: selectedDaoTasks.filter(t => (t.progress || 0) === 0).length,
          };
          
          existingStatusChart.data.datasets[0].data = [
            statusCounts.completed, 
            statusCounts.inProgress, 
            statusCounts.notStarted
          ];
          existingStatusChart.update('none'); // Update without animation
        }
        
        setChartsReady(true);
      }
    }, 100); // Increased delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, [selectedDao, selectedDaoTasks]);

  // Cleanup charts on unmount
  useEffect(() => {
    return () => {
      const progressChart = Chart.getChart('progressChart');
      if (progressChart) {
        progressChart.destroy();
      }
      
      const statusChart = Chart.getChart('statusChart');
      if (statusChart) {
        statusChart.destroy();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du dashboard Lecteur...</p>
          <p className="text-sm text-gray-500 mt-2">Récupération des DAOs et tâches</p>
        </div>
      </div>
    );
  }

  if (daos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <p className="font-medium">Aucun DAO disponible</p>
            <p className="text-sm mt-1">Veuillez contacter l'administrateur pour ajouter des DAOs</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h4 className="text-3xl font-bold text-gray-800">Dashboard Directeur Général</h4>
        </div>
        
        <div className="flex gap-2">
          {/* Bouton d'export PDF */}
          <button
            onClick={downloadDGComprehensivePDF}
            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
            title="Exporter le rapport en PDF"
          >
            <FileText size={20} />
          </button>
          
          {/* Icône de commentaire */}
          <button
            onClick={openCommentModal}
            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            title="Ajouter un commentaire"
          >
            <MessageSquare size={20} />
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total DAOs</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalDaos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Terminées</p>
              <p className="text-2xl font-bold text-gray-800">{stats.completedDaos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">En cours</p>
              <p className="text-2xl font-bold text-gray-800">{stats.inProgressDaos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">À risque</p>
              <p className="text-2xl font-bold text-gray-800">{stats.atRiskDaos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* DAO Selection and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* DAO Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h6 className="text-lg font-semibold text-gray-800 mb-4">Sélectionner un DAO</h6>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {daos.map(dao => {
              const status = getDAOStatus(dao);
              return (
                <div
                  key={dao.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedDao?.id === dao.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedDao(dao)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800">{dao.reference || `DAO-${dao.id}`}</p>
                      <p className="text-sm text-gray-600">{dao.objet || 'Sans objet'}</p>
                    </div>
                    <span className={status.className}>
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h6 className="text-lg font-semibold text-gray-800 mb-4">
            Progression des tâches <br /> <br /> {selectedDao ? `- ${selectedDao.reference}` : ''}
          </h6>
          <div className="h-64">
            {selectedDaoTasks.length > 0 ? (
              <canvas id="progressChart"></canvas>
            ) : loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Chargement du graphique...</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-500">Aucune tâche pour ce DAO</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Chart and Task List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h6 className="text-lg font-semibold text-gray-800 mb-4">Distribution des statuts</h6>
          <div className="h-64">
            {selectedDaoTasks.length > 0 ? (
              <canvas id="statusChart"></canvas>
            ) : loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Chargement du graphique...</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-500">Aucune tâche pour ce DAO</p>
              </div>
            )}
          </div>
        </div>

        {/* Task List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h6 className="text-lg font-semibold text-gray-800 mb-4">
            Liste des tâches {selectedDao ? `- ${selectedDao.reference}` : ''}
          </h6>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {selectedDaoTasks.length > 0 ? (
              selectedDaoTasks.map(task => (
                <div key={task.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-medium text-gray-800">{task.titre || `Tâche ${task.id}`}</p>
                    <span className="text-sm text-gray-600">{task.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Chargement des tâches...</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48">
                <p className="text-sm text-gray-500">Aucune tâche pour ce DAO</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal de commentaire */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h5 className="text-xl font-bold">Commentaires</h5>
              <button
                onClick={() => setShowCommentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Formulaire d'ajout de commentaire */}
            <div className="bg-gray-50 rounded-xl p-4 mt-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User size={16} className="text-gray-600" />
                </div>
                <div className="flex-1">
                  <textarea
                    ref={commentInputRef}
                    value={globalComment}
                    onChange={handleCommentChange}
                    placeholder="Ajouter un commentaire ..."
                    className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                  
                  {/* Suggestions de mentions */}
                  {showMentionSuggestions && (
                    <div className="mt-2 p-2 bg-white border rounded-lg shadow-lg max-h-32 overflow-y-auto">
                      {users
                        .filter(u => u.username.toLowerCase().includes(mentionSearch.toLowerCase()))
                        .map((user) => (
                          <div
                            key={user.id}
                            onClick={() => insertMention(user)}
                            className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer rounded"
                          >
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 text-xs font-bold">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm">{user.username}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end mt-3">
                <button
                  onClick={addGlobalComment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
