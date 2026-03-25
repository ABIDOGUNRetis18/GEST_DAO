"use client";

import { useState, useMemo, useEffect, use, useRef } from "react";
import {
  ArrowLeft,
  X,
  Send,
  User,
  Calendar,
  UserCheck,
  AlertCircle,
  CheckCircle,
  MessageCircle,
  Download,
  AtSign,
  Archive,
} from "lucide-react";
import Link from "next/link";
import "@/styles/print-enhanced.css";

interface Dao {
  id: number;
  numero: string;
  reference: string;
  objet: string;
  description?: string;
  autorite: string;
  date_depot?: string;
  statut?: string;
  chef_id?: number | null;
  chef_projet?: string | null;
  groupement?: string | null;
  nom_partenaire?: string | null;
}

interface Task {
  id: number;
  name: string;
  progress: number;
  comment: string;
  assigned_to?: string;
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

/* ======================
   COMPOSANT PRINCIPAL
====================== */

const commentsData: Comment[] = [
  {
    id: 1,
    user: "Jean Dupont",
    role: "Chef de projet",
    text: "N'oubliez pas d'ajouter les références du DCE dans la documentation.",
    time: "Il y a 2 heures",
    task_id: 1,
  },
  {
    id: 2,
    user: "Marie Martin",
    role: "Expert technique",
    text: "Les cotations sont en attente de validation par les fournisseurs.",
    time: "Il y a 1 heure",
    task_id: 10,
  },
  {
    id: 3,
    user: "Pierre Durand",
    role: "Rédacteur",
    text: "Le squelette des offres est prêt pour relecture.",
    time: "Il y a 30 minutes",
    task_id: 11,
  },
];

/* ======================
   COMPOSANT PRINCIPAL
====================== */

export default function DaoDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const daoId = resolvedParams.id;
  const [dao, setDao] = useState<Dao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");
  const [showGlobalComments, setShowGlobalComments] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [globalComment, setGlobalComment] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Charger les commentaires depuis la base de données
  const loadComments = async (taskId: number) => {
    try {
      const response = await fetch(`/api/messages?task_id=${taskId}`, {
        cache: "no-store",
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Adapter les données de la base au format attendu
        const adaptedComments = result.data.map((msg: any) => ({
          id: msg.id,
          user: msg.user_name || 'Utilisateur',
          role: 'Utilisateur', // Le rôle n'est pas dans la table users pour l'instant
          text: msg.content,
          time: new Date(msg.created_at).toLocaleString('fr-FR'),
          task_id: msg.task_id,
          user_id: msg.user_id,
          mentioned_user_id: msg.mentioned_user_id,
          mentioned_user_name: msg.mentioned_user_name,
          is_public: msg.is_public
        }));
        
        setComments(adaptedComments);
        console.log(` ${adaptedComments.length} commentaires chargés depuis la base`);
      } else {
        console.log(' Erreur lors du chargement des commentaires:', result.message);
      }
    } catch (error) {
      console.error(' Erreur réseau lors du chargement des commentaires:', error);
    }
  };

  // Charger les données du DAO
  useEffect(() => {
    async function loadDao() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/daos/${daoId}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));

        console.log("DEBUG - API Response status:", res.status);
        console.log("DEBUG - API Response json:", json);
        console.log("DEBUG - DAO ID:", daoId);

        if (!res.ok) {
          console.error("API /api/daos/[id] error:", json);
          setError(json?.message || "Erreur lors du chargement du DAO");
          return;
        }

        setDao(json.data);
        
        // Charger les tâches depuis la base de données
        await loadTasks(daoId);
        
        // Charger les utilisateurs pour les mentions
        await loadUsers();
        
        // Charger l'utilisateur courant depuis le localStorage
        const userFromStorage = localStorage.getItem('user');
        if (userFromStorage) {
          const userData = JSON.parse(userFromStorage);
          setCurrentUser({
            id: userData.id,
            name: userData.username || userData.email?.split('@')[0] || 'Utilisateur'
          });
          console.log(' Utilisateur chargé depuis localStorage:', userData);
        } else {
          // Fallback si pas d'utilisateur dans localStorage
          setCurrentUser({ id: 43, name: "lio" });
          console.log(' Aucun utilisateur dans localStorage, utilisation du fallback lio');
        }
      } catch (err) {
        console.error("Error fetching DAO:", err);
        setError("Erreur réseau lors du chargement du DAO");
      } finally {
        setLoading(false);
      }
    }

    if (daoId) {
      loadDao();
    }
  }, [daoId]);

  // Charger les utilisateurs pour les mentions
  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const result = await response.json();
        setUsers(result.data || []);
        console.log('Utilisateurs chargés pour les mentions:', result.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

  // Gérer les changements dans le champ de commentaire
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setGlobalComment(value);

    // Détecter si on tape @ pour les mentions
    const lastAtIndex = value.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1);
      
      // Vérifier qu'il n'y a pas d'espace après le @
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt.toLowerCase());
        setShowMentionSuggestions(true);
      } else {
        setShowMentionSuggestions(false);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  // Insérer une mention
  const insertMention = (user: any) => {
    const lastAtIndex = globalComment.lastIndexOf('@');
    const newText = globalComment.substring(0, lastAtIndex) + `@${user.name} `;
    setGlobalComment(newText);
    setShowMentionSuggestions(false);
    commentInputRef.current?.focus();
  };

  // Ajouter un commentaire global avec gestion des mentions
  const addGlobalComment = async () => {
    if (!globalComment.trim()) return;

    // Vérifier si c'est une mention directe au début du message
    const mentionMatch = globalComment.match(/^@(\w+)/);
    let mentionedUserId = null;
    let isPublic = true;

    if (mentionMatch) {
      const mentionedUserName = mentionMatch[1].toLowerCase();
      const mentionedUser = users.find(u => u.name.toLowerCase() === mentionedUserName);
      
      if (mentionedUser) {
        mentionedUserId = mentionedUser.id;
        isPublic = false; // C'est une mention privée
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
          task_id: tasks.length > 0 ? tasks[0].id : 1,
          user_id: currentUser?.id || 43,
          content: globalComment.trim(),
          mentioned_user_id: mentionedUserId,
          mentioned_user_name: mentionedUserId ? users.find(u => u.id === mentionedUserId)?.name : undefined,
          is_public: isPublic
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(' Commentaire sauvegardé en base de données:', result.data);
        
        // Rafraîchir les commentaires
        await loadComments(tasks.length > 0 ? tasks[0].id : 1);
        setGlobalComment('');
        setShowMentionSuggestions(false);
      } else {
        console.error(' Erreur lors de la sauvegarde:', result.message);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
    
    // Ne pas fermer automatiquement le modal - laisser l'utilisateur décider
    // setShowCommentModal(false);
  };

  // Filtrer les commentaires pour la tâche sélectionnée avec logique de visibilité
  const getFilteredComments = (taskId: number) => {
    const taskComments = comments.filter(c => c.task_id === taskId);
    return taskComments.filter(comment => {
      // Exclure les messages de l'utilisateur lui-même
      if (comment.user_id === currentUser?.id) return false;
      
      // Toujours afficher les commentaires publics des autres utilisateurs
      if (comment.is_public) return true;
      
      // Afficher les mentions privées uniquement au destinataire
      return comment.mentioned_user_id === currentUser?.id;
    });
  };

  // Charger les tâches depuis la base de données
  async function loadTasks(daoId: string) {
    try {
      const res = await fetch(`/api/tasks?daoId=${daoId}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success && json.data) {
        // Adapter les données de la base au format attendu
        const adaptedTasks = json.data.map((task: any) => ({
          id: task.id,
          name: task.titre || task.name || `Tâche ${task.id}`,
          progress: task.progress || 0,
          comment: task.description || task.comment || "À faire",
          assigned_to: task.assigned_username || "Non assigné"
        }));
        
        setTasks(adaptedTasks);
        console.log(` ${adaptedTasks.length} tâches chargées depuis la base pour le DAO ${daoId}`);
        
        // Charger les commentaires pour la première tâche
        if (adaptedTasks.length > 0) {
          await loadComments(adaptedTasks[0].id);
        }
      } else {
        console.log(" Aucune tâche trouvée pour ce DAO ou erreur API");
        setTasks([]); // Vider les tâches si aucune n'est trouvée
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      console.log(" Erreur lors du chargement des tâches pour le DAO", daoId);
      setTasks([]); // Vider les tâches en cas d'erreur
    }
  }
  const globalProgress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const total = tasks.reduce((sum, t) => sum + t.progress, 0);
    return Math.round(total / tasks.length);
  }, [tasks]);

  // Ajouter un commentaire
  const addComment = () => {
    if (!newComment.trim() || !selectedTaskId) return;

    const comment: Comment = {
      id: comments.length + 1,
      user: "Admin",
      role: "Administrateur",
      text: newComment.trim(),
      time: "À l'instant",
      task_id: selectedTaskId,
    };

    setComments((prev) => [...prev, comment]);
    setNewComment("");
  };

  // Télécharger la page en PDF
  const downloadPDF = () => {
    window.print();
  };

  // Afficher le modal pour écrire un commentaire
  const openCommentModal = () => {
    console.log('openCommentModal appelé - état actuel:', showCommentModal);
    setShowCommentModal(true);
  };

  // Filtrer les commentaires pour la tâche sélectionnée
  const taskComments = comments.filter((c) => c.task_id === selectedTaskId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du DAO...</p>
        </div>
      </div>
    );
  }

  if (error || !dao) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "DAO non trouvé"}</p>
          <Link href="/dash/admin/allDao" className="text-blue-600 hover:underline">
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-gray-50 p-6 no-print">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <Link href="/dash/admin/allDao" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </Link>
                <div className="min-w-0">
                  <h4 className="font-bold text-2xl text-gray-900 truncate">{dao.numero}</h4>
                  <p className="text-sm text-gray-600 truncate mt-1">{dao.objet || dao.reference}</p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <UserCheck className="w-4 h-4" />
                    Chef de projet
                  </div>
                  <p className="font-semibold text-lg text-gray-900">{dao.chef_projet || 'N/A'}</p>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Statut</div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full ${
                    dao.statut === 'A_RISQUE' || dao.statut === 'aRisque'
                      ? 'bg-red-100 text-red-800' 
                      : dao.statut === 'TERMINEE'
                        ? 'bg-green-100 text-green-800'
                        : dao.statut === 'EN_COURS' || dao.statut === 'enCours'
                          ? 'bg-blue-100 text-blue-800'
                          : dao.statut === 'ARCHIVE'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-gray-100 text-gray-800'
                  }`}>
                    {dao.statut === 'A_RISQUE' || dao.statut === 'aRisque' ? (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        À risque
                      </>
                    ) : dao.statut === 'TERMINEE' ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        Terminée
                      </>
                    ) : dao.statut === 'EN_COURS' || dao.statut === 'enCours' ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        En cours
                      </>
                    ) : dao.statut === 'ARCHIVE' ? (
                      <>
                        <Archive className="w-3 h-3" />
                        Archivé
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        En attente
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openCommentModal}
                    className="p-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
                    title="Ajouter un commentaire"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="print-area">
        <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* PROGRESSION GLOBALE */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">{globalProgress}%</span>
              </div>
              Progression globale du DAO
            </h4>
           
             
          </div>
          <span className="text-sm text-gray-500">
            {tasks.filter(t => t.progress === 100).length} / {tasks.length} tâches terminées
          </span>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${globalProgress}%` }}
            >
              {globalProgress > 10 && (
                <span className="text-white text-xs font-medium">{globalProgress}%</span>
              )}
            </div>
          </div>
          
          <div className="flex justify-between text-xs text-gray-600">
            <span>Date de dépôt : {new Date(dao.date_depot || Date.now()).toLocaleDateString('fr-FR')}</span>
            <span>Progression : {globalProgress}%</span>
          </div>
        </section>

        {/* LISTE DES TÂCHES */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">Progression des tâches</h4>
          
          </div>
          
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Aucune tâche trouvée pour ce DAO.</p>
              <p className="text-sm text-gray-400 mt-2">Les 15 tâches standards devraient être créées automatiquement lors de la création du DAO.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {tasks.map((task) => (
              <div
                key={task.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedTaskId === task.id
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                }`}
                onClick={() => setSelectedTaskId(task.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h5 className="font-medium text-sm mb-1">{task.name}</h5>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <User className="w-3 h-3" />
                      <span>{task.assigned_to || 'Non assigné'}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    task.progress === 100 
                      ? 'bg-green-100 text-green-800'
                      : task.progress > 0 
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {task.progress === 100 ? 'Terminé' : task.progress > 0 ? 'En cours' : 'À faire'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Progression</span>
                    <span className="font-medium">{task.progress}%</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        task.progress === 100 
                          ? 'bg-green-500'
                          : task.progress > 0 
                          ? 'bg-yellow-500'
                          : 'bg-gray-400'
                      }`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
        </section>

        
      </main>
      </div>

      {/* MODAL POUR ÉCRIRE UN COMMENTAIRE */}
      {showCommentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-gray-100">
            <div className="border-b border-gray-100 p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Ajouter un commentaire</h3>
                  <p className="text-sm text-gray-500">Partagez vos pensées avec l'équipe</p>
                </div>
              </div>
              <button
                onClick={() => setShowCommentModal(false)}
                className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Votre commentaire
                </label>
                <div className="relative">
                  <textarea
                    ref={commentInputRef}
                    value={globalComment}
                    onChange={handleCommentChange}
                    placeholder="Écrivez votre commentaire ici... Tapez @ pour mentionner quelqu'un"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                    rows={4}
                    style={{ minHeight: '100px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowMentionSuggestions(false);
                      }
                    }}
                  />
                </div>
              </div>
              
              {/* SUGGESTIONS DE MENTIONS */}
              {showMentionSuggestions && (
                <div className="absolute z-20 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-2" style={{ 
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  minWidth: '250px'
                }}>
                  <div className="p-2 border-b border-gray-100">
                    <div className="text-xs font-medium text-gray-500 mb-2">Suggestions</div>
                  </div>
                  {users.filter(u => 
                    u.name.toLowerCase().includes(mentionSearch.toLowerCase()) && 
                    u.id !== currentUser?.id
                  ).map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => insertMention(user)}
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">Membre de l'équipe</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCommentModal(false)}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={addGlobalComment}
                  disabled={!globalComment.trim()}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Send size={16} />
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
