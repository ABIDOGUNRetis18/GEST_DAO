"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle, FileText, Search, ChevronDown, Minus, Plus, Send, X, AtSign, Trash2 } from "lucide-react";

/* =======================
   TYPES
======================= */
interface Task {
  id: number;
  dao_id: number;
  id_task: number;
  description?: string;
  progress: number;
  assigned_to: number;
  dao_reference?: string;
  dao_objet?: string;
}

interface Comment {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  created_at: string;
  user_name?: string;
  mentioned_user_id?: number;
  mentioned_user_name?: string;
  is_public: boolean;
}

interface User {
  id: number;
  name: string;
}

/* =======================
   DASHBOARD
======================= */
export default function MembreEquipeDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [commentingTask, setCommentingTask] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskProgress, setTaskProgress] = useState<Record<number, number>>({});
  const [commentText, setCommentText] = useState("");
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const [mentionPosition, setMentionPosition] = useState<{top: number; left: number} | null>(null);

  // Fetch current user
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setCurrentUser(parsedUser);
      console.log('Utilisateur actuel chargé:', parsedUser);
    } else {
      console.error('Aucun utilisateur trouvé dans localStorage');
    }
  }, []);

  // Fetch tasks from API
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const storedUser = localStorage.getItem("user");
        
        if (!storedUser) {
          setError("Erreur: Utilisateur non connecté");
          return;
        }
        
        const parsedUser = JSON.parse(storedUser);
        const userId = parsedUser.id;
        
        if (!userId) {
          setError("Erreur: ID utilisateur non trouvé");
          return;
        }
        
        const response = await fetch(`/api/member-tasks?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setTasks(result.data || []);
          
          const progressMap: Record<number, number> = {};
          (result.data || []).forEach((task: Task) => {
            progressMap[task.id] = task.progress || 0;
          });
          
          setTaskProgress(progressMap);
        } else {
          setError(result.message || 'Erreur inconnue');
        }
      } catch (err) {
        setError('Erreur de connexion au serveur');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  // Fetch users for mentions
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log('Chargement des utilisateurs pour les mentions...');
        const response = await fetch('/api/users');
        if (response.ok) {
          const result = await response.json();
          console.log('Utilisateurs reçus:', result);
          if (result.success) {
            setUsers(result.data || []);
            console.log('Utilisateurs chargés:', result.data?.length || 0);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
      }
    };

    fetchUsers();
  }, []);

  // Fetch comments for a task
  const fetchComments = async (taskId: number) => {
    console.log(`Fetching comments for task ${taskId}...`);
    try {
      const response = await fetch(`/api/messages?task_id=${taskId}`);
      console.log('Response status:', response.status);
      
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      if (!response.ok) {
        console.error('Erreur API - Status:', response.status);
        console.error('Headers:', Object.fromEntries(response.headers.entries()));
        
        let errorData;
        try {
          errorData = responseText ? JSON.parse(responseText) : 'Pas de contenu JSON';
          console.error('Erreur API détaillée:', errorData);
        } catch (e) {
          console.error('Impossible de parser la réponse d\'erreur comme JSON:', e);
          console.error('Contenu de la réponse:', responseText);
        }
        
        // Initialiser un tableau vide pour éviter les erreurs d'affichage
        setComments(prev => ({
          ...prev,
          [taskId]: []
        }));
        return;
      }
      
      // Si la réponse est OK, essayer de la parser
      try {
        const data = JSON.parse(responseText);
        console.log('Parsed data:', data);

        if (data.success && data.data) {
          // Adapter les données au format attendu
          const adaptedComments = data.data.map((msg: any) => ({
            id: msg.id,
            task_id: msg.task_id,
            user_id: msg.user_id,
            content: msg.content,
            created_at: msg.created_at,
            user_name: msg.user_name || 'Utilisateur',
            mentioned_user_id: msg.mentioned_user_id,
            mentioned_user_name: msg.mentioned_user_name,
            is_public: msg.is_public,
            isRead: false // Par défaut, les nouveaux commentaires sont non lus
          }));

          console.log(`✅ ${adaptedComments.length} commentaires récupérés pour la tâche ${taskId}`);
          setComments(prev => ({
            ...prev,
            [taskId]: adaptedComments
          }));
        } else {
          console.log('❌ Aucun commentaire trouvé ou erreur dans les données');
          setComments(prev => ({
            ...prev,
            [taskId]: []
          }));
        }
      } catch (parseError) {
        console.error('❌ Erreur lors de l\'analyse de la réponse JSON:', parseError);
        console.error('Contenu de la réponse:', responseText);
        setComments(prev => ({
          ...prev,
          [taskId]: []
        }));
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des commentaires:', error);
      // En cas d'erreur, initialiser avec un tableau vide
      setComments(prev => ({
        ...prev,
        [taskId]: []
      }));
    }
  };

  // Handle comment input change
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCommentText(value);

    // Détecter si on tape @ pour les mentions
    const lastAtIndex = value.lastIndexOf('@');
    console.log('Détection @:', { lastAtIndex, value, users: users.length });
    
    if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1);
      console.log('Texte après @:', textAfterAt);
      
      // Vérifier qu'il n'y a pas d'espace après le @
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt.toLowerCase());
        setShowMentionSuggestions(true);
        console.log('Suggestions activées, recherche:', textAfterAt.toLowerCase());
        
        // Forcer l'affichage pour tester
        console.log('TEST: showMentionSuggestions = true');
      } else {
        setShowMentionSuggestions(false);
        console.log('Suggestions désactivées (espace détecté)');
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  // Insert mention
  const insertMention = (user: User) => {
    const lastAtIndex = commentText.lastIndexOf('@');
    const newText = commentText.substring(0, lastAtIndex) + `@${user.name} `;
    setCommentText(newText);
    setShowMentionSuggestions(false);
    commentInputRef.current?.focus();
  };

  // Submit comment
  const addComment = async () => {
    if (!commentText.trim() || !commentingTask || !currentUser) return;

    // Vérifier si c'est une mention directe au début du message
    const mentionMatch = commentText.match(/^@(\w+)/);
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
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: commentingTask,
          user_id: currentUser.id,
          content: commentText.trim(),
          mentioned_user_id: mentionedUserId,
          mentioned_user_name: mentionedUserId ? users.find(u => u.id === mentionedUserId)?.name : undefined,
          is_public: isPublic
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Commentaire ajouté avec succès:', data.data);
        
        // Rafraîchir les commentaires pour cette tâche
        await fetchComments(commentingTask);
        setCommentText('');
        setShowMentionSuggestions(false);
      } else {
        console.error('❌ Erreur lors de l\'ajout du commentaire:', data.message);
      }
    } catch (error) {
      console.error('❌ Erreur réseau lors de l\'ajout du commentaire:', error);
    }
  };

  // Delete comment
  const deleteComment = async (commentId: number, taskId: number) => {
    console.log('Tentative de suppression du commentaire:', { commentId, taskId, currentUserId: currentUser?.id });
    
    if (!currentUser) {
      console.error('Utilisateur non connecté');
      return;
    }

    try {
      const deleteUrl = `/api/tasks/${taskId}/comments/${commentId}`;
      console.log('URL de suppression:', deleteUrl);
      
      // Pour le test, on envoie pas de body
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
      });

      console.log('Réponse du serveur:', response.status, response.statusText);
      console.log('Headers de la réponse:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        console.log('Commentaire supprimé avec succès');
        await fetchComments(taskId);
      } else {
        const responseText = await response.text();
        console.log('Réponse du serveur (status non-ok):', response.status, responseText);
        
        // Si le status n'est pas ok mais la réponse est vide, on considère que ça a marché
        if (!responseText || responseText.trim() === '') {
          console.log('Réponse vide mais suppression probablement réussie');
          await fetchComments(taskId);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du commentaire:', error);
    }
  };

  const filteredTasks = tasks.filter(
    (task: Task) =>
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.dao_reference && task.dao_reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.dao_objet && task.dao_objet.toLowerCase().includes(searchTerm.toLowerCase())) ||
      task.id.toString().includes(searchTerm.toLowerCase())
  );

  // Fonction pour filtrer les commentaires en fonction de la visibilité
  const getFilteredComments = (taskId: number) => {
    const taskComments = comments[taskId] || [];
    return taskComments.filter(comment => {
      // Toujours afficher les commentaires publics
      if (comment.is_public) return true;
      // Afficher les mentions privées uniquement à l'expéditeur et au destinataire
      return comment.user_id === currentUser?.id || 
             comment.mentioned_user_id === currentUser?.id;
    });
  };

  // Filtrer les utilisateurs pour les suggestions de mention
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(mentionSearch.toLowerCase()) && 
    u.id !== currentUser?.id
  );
  
  console.log('Utilisateurs filtrés:', { 
    totalUsers: users.length, 
    mentionSearch, 
    filteredCount: filteredUsers.length, 
    filteredUsers 
  });

  const updateProgress = async (taskId: number, value: number) => {
    const newValue = Math.min(100, Math.max(0, value));
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setTaskProgress((prev) => ({
      ...prev,
      [taskId]: newValue
    }));
    
    try {
      const response = await fetch(`/api/tasks/${taskId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ progress: newValue }),
      });
      
      if (!response.ok) {
        throw new Error('Échec de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la progression:', error);
    }
  };

  const handleTaskExpand = (taskId: number) => {
    const newExpandedState = expandedTask === taskId ? null : taskId;
    setExpandedTask(newExpandedState);
    
    // Charger les commentaires si on ouvre la tâche
    if (newExpandedState === taskId && !comments[taskId]) {
      fetchComments(taskId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* LOADING / ERROR */}
        {loading && (
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <p>Chargement des tâches...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* RECHERCHE */}
        {!loading && !error && (
          <div className="bg-white rounded-xl shadow p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une tâche ou un DAO"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* LISTE DES TÂCHES */}
        {!loading && !error && (
          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-6 text-center">
                <p className="text-gray-500">
                  {searchTerm ? "Aucune tâche trouvée pour votre recherche" : "Aucune tâche assignée"}
                </p>
              </div>
            ) : (
              filteredTasks.map((task: Task) => (
                <div key={task.id} className="bg-white rounded-xl border shadow-sm">
                  {/* HEADER */}
                  <div
                    className="p-4 sm:p-6 cursor-pointer"
                    onClick={() => handleTaskExpand(task.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex-1">
                        <h6 className="text-base sm:text-lg font-semibold">Tâche n°{task.id_task}</h6>

                        <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-gray-600 mt-2">
                          <span className="flex items-center gap-1">
                            <FileText size={14} /> DAO-{task.dao_id}
                            {task.dao_reference && ` (${task.dao_reference})`}
                          </span>
                          {task.dao_objet && (
                            <span className="flex items-center gap-1">
                              <FileText size={14} /> {task.dao_objet}
                            </span>
                          )}
                        </div>

                        {/* PROGRESSION */}
                        <div className="mt-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progression</span>
                            <span className="font-medium">
                              {taskProgress[task.id] || 0}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded">
                            <div
                              className="h-2 bg-blue-600 rounded transition-all"
                              style={{ width: `${taskProgress[task.id] || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <ChevronDown
                        className={`transition-transform ${
                          expandedTask === task.id ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {/* ACTIONS */}
                  {expandedTask === task.id && (
                    <div className="px-6 pb-6 space-y-4">
                      {/* DESCRIPTION */}
                      {task.description && (
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <h4 className="font-medium text-sm mb-2">Description</h4>
                          <p className="text-sm text-gray-700">{task.description}</p>
                        </div>
                      )}

                      {/* BOUTONS PROGRESSION ET COMMENTER */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTask(editingTask === task.id ? null : task.id);
                          }}
                          className="px-3 py-2 sm:py-1 text-xs border rounded hover:bg-gray-100"
                        >
                          Progression
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setCommentingTask(commentingTask === task.id ? null : task.id);
                            if (commentingTask !== task.id) {
                              setCommentText("");
                            }
                          }}
                          className="px-3 py-2 sm:py-1 text-xs border rounded hover:bg-gray-100"
                        >
                          Commenter
                        </button>
                      </div>

                      {/* MODIFIER PROGRESSION */}
                      {editingTask === task.id && (
                        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border">
                          <div className="flex justify-between mb-2 text-sm">
                            <span>Avancement</span>
                            <span className="font-medium">
                              {taskProgress[task.id] || 0}%
                            </span>
                          </div>

                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={taskProgress[task.id] || 0}
                            onChange={(e) =>
                              updateProgress(task.id, Number(e.target.value))
                            }
                            className="w-full"
                          />

                          <div className="flex justify-between mt-3">
                            <button
                              onClick={() =>
                                updateProgress(task.id, (taskProgress[task.id] || 0) - 5)
                              }
                              disabled={(taskProgress[task.id] || 0) <= 0}
                              className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Minus size={14} />
                            </button>
                            <button
                              onClick={() =>
                                updateProgress(task.id, (taskProgress[task.id] || 0) + 5)
                              }
                              disabled={(taskProgress[task.id] || 0) >= 100}
                              className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* SECTION COMMENTAIRES */}
                      {commentingTask === task.id && (
                        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border space-y-4">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium text-sm">Commentaires</h4>
                            <button
                              onClick={() => setCommentingTask(null)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X size={16} />
                            </button>
                          </div>

                          {/* LISTE DES COMMENTAIRES */}
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {getFilteredComments(task.id)?.length > 0 ? (
                              getFilteredComments(task.id).map((comment) => (
                                <div 
                                  key={comment.id} 
                                  className={`p-3 rounded-lg ${
                                    !comment.is_public ? 'bg-purple-50 border-l-4 border-purple-500' : 'bg-white border'
                                  }`}
                                >
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm text-blue-600">
                                        {comment.user_name || 'Utilisateur'}
                                      </span>
                                      {!comment.is_public && (
                                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                                          Privé
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">
                                        {new Date(comment.created_at).toLocaleString('fr-FR', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                      {comment.user_id === currentUser?.id && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            console.log('Bouton supprimer cliqué pour:', { 
                                              commentId: comment.id, 
                                              taskId: task.id, 
                                              commentUserId: comment.user_id, 
                                              currentUserId: currentUser?.id 
                                            });
                                            deleteComment(comment.id, task.id);
                                          }}
                                          className="text-red-500 hover:text-red-700 text-xs"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-700">
                                    {comment.content}
                                  </p>
                                  {comment.mentioned_user_name && (
                                    <div className="mt-1 text-xs text-purple-600">
                                      <AtSign size={12} className="inline mr-1" />
                                      Mention privée pour {comment.mentioned_user_name}
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 text-center py-4">
                                Aucun commentaire pour le moment
                              </p>
                            )}
                          </div>

                          {/* FORMULAIRE NOUVEAU COMMENTAIRE */}
                          <div className="relative">
                            <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                              <AtSign size={12} />
                              Tapez @ pour mentionner un utilisateur (au début pour un message privé)
                            </div>
                            <textarea
                              ref={commentInputRef}
                              value={commentText}
                              onChange={handleCommentChange}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setShowMentionSuggestions(false);
                                }
                              }}
                              placeholder="Écrivez un commentaire... (@nom pour une mention privée)"
                              className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                              rows={3}
                            />

                            {/* SUGGESTIONS DE MENTIONS */}
                            {(() => {
                              console.log('Affichage suggestions:', { showMentionSuggestions, filteredUsersLength: filteredUsers.length, filteredUsers });
                              // TEST: Afficher même si filteredUsers est vide
                              return showMentionSuggestions; // && filteredUsers.length > 0;
                            })() && (
                              <div 
                                className="absolute bottom-full mb-1 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto z-10"
                                style={mentionPosition || {}}
                              >
                                <div className="p-2 text-xs text-gray-500 border-b">
                                  Mentionner un utilisateur (message privé)
                                </div>
                                {filteredUsers.length > 0 ? (
                                  filteredUsers.map((user) => (
                                    <button
                                      key={user.id}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        insertMention(user);
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-2"
                                    >
                                      <AtSign size={14} className="text-blue-600" />
                                      <span className="text-sm">{user.name}</span>
                                    </button>
                                  ))
                                ) : (
                                  <div className="p-4 text-center text-gray-500">
                                    Aucun utilisateur trouvé
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex justify-end mt-2">
                              <button
                                onClick={addComment}
                                disabled={!commentText.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                              >
                                <Send size={14} />
                                Envoyer
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* MESSAGE DE TÂCHE TERMINÉE */}
                      {taskProgress[task.id] === 100 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                          <CheckCircle className="mx-auto text-green-600 mb-2" />
                          <p className="font-medium text-green-700">
                            Tâche terminée à 100%
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
