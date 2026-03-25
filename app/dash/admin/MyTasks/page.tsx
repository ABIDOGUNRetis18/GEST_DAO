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
  titre?: string;
  description?: string;
  progress: number;
  assigned_to: number;
  dao_reference?: string;
  dao_objet?: string;
  statut?: string;
  date_creation?: string;
  date_echeance?: string;
  priorite?: string;
}
 
interface Comment {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  created_at: string;
  username?: string;
}
 
interface User {
  id: number;
  username: string;
  role: string;
}
 
/* =======================
   COMPONENT
======================= */
export default function MyTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [taskProgress, setTaskProgress] = useState<{ [key: number]: number }>({});
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [comments, setComments] = useState<{ [key: number]: Comment[] }>({});
  const [commentText, setCommentText] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [selectedMention, setSelectedMention] = useState<number | null>(null);
  const [commentingTask, setCommentingTask] = useState<number | null>(null);
  const [mentionPosition, setMentionPosition] = useState<{top: number; left: number} | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
 
  // Fetch current user
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      console.log('Current user:', user);
    }
  }, []);
 
  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
 
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        setError("Utilisateur non connecté");
        return;
      }
 
      const user = JSON.parse(storedUser);
      const userId = user.id;
 
      if (!userId) {
        setError("ID utilisateur invalide");
        return;
      }
 
      console.log('Fetching tasks for user:', userId);
     
      const response = await fetch(`/api/member-tasks?userId=${userId}`);
     
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
 
      const data = await response.json();
      console.log('Tasks response:', data);
 
      if (data.success && Array.isArray(data.data)) {
        setTasks(data.data);
        // Initialize progress state
        const initialProgress: { [key: number]: number } = {};
        data.data.forEach((task: Task) => {
          initialProgress[task.id] = task.progress;
        });
        setTaskProgress(initialProgress);
      } else {
        throw new Error(data.message || "Format de réponse invalide");
      }
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(err.message || "Erreur lors du chargement des tâches");
    } finally {
      setLoading(false);
    }
  };
 
  useEffect(() => {
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
          if (result.success && Array.isArray(result.data)) {
            setUsers(result.data);
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
      console.log('Response text:', responseText);
     
      if (!response.ok) {
        console.error('Response not ok:', response.status, responseText);
        return;
      }
     
      try {
        const data = JSON.parse(responseText);
        console.log('Comments data:', data);
       
        if (data.success && Array.isArray(data.data)) {
          setComments(prev => ({
            ...prev,
            [taskId]: data.data
          }));
        }
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };
 
  // Handle task expansion
  const handleTaskExpand = (taskId: number) => {
    const newExpandedState = expandedTask === taskId ? null : taskId;
    setExpandedTask(newExpandedState);
   
    // Charger les commentaires si on ouvre la tâche
    if (newExpandedState === taskId && !comments[taskId]) {
      fetchComments(taskId);
    }
  };
 
  // Handle progress change
  const handleProgressChange = (taskId: number, delta: number) => {
    const currentProgress = taskProgress[taskId] || 0;
    const newProgress = Math.max(0, Math.min(100, currentProgress + delta));
    setTaskProgress(prev => ({
      ...prev,
      [taskId]: newProgress
    }));
  };
 
  // Handle progress input
  const handleProgressInput = (taskId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(0, Math.min(100, numValue));
    setTaskProgress(prev => ({
      ...prev,
      [taskId]: clampedValue
    }));
  };
 
  // Save progress
  const saveProgress = (taskId: number) => {
    const newProgress = taskProgress[taskId] || 0;
   
    // Send update to API
    updateTaskProgress(taskId, newProgress);
  };
 
  // Update task progress in API
  const updateTaskProgress = async (taskId: number, progress: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ progress }),
      });
 
      if (!response.ok) {
        const errorData = await response.json();
       
        // Vérifier si c'est une erreur de blocage
        if (response.status === 403 && errorData.details) {
          alert(`🚫 ${errorData.message}\n\n${errorData.details}\n\nTâche 1: ${errorData.firstTaskId} (${errorData.firstTaskProgress}%)\nTâche actuelle: ${errorData.currentTaskId}`);
          return;
        }
       
        throw new Error(errorData.message || 'Erreur lors de la mise à jour');
      }
 
      const data = await response.json();
      console.log('✅ Task progress updated:', data);
     
      // Refresh tasks to show updated progress
      fetchTasks();
    } catch (error) {
      console.error('❌ Error updating task progress:', error);
      alert(`Erreur lors de la mise à jour de la progression: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };
 
  // Handle comment input
  const handleCommentInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCommentText(value);
   
    // Check for @ symbol
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
   
    if (lastAtIndex !== -1) {
      const mentionText = textBeforeCursor.substring(lastAtIndex + 1);
      const spaceIndex = mentionText.indexOf(' ');
     
      if (spaceIndex === -1) {
        setMentionFilter(mentionText);
        setShowMentionSuggestions(true);
       
        // Calculate position for dropdown
        if (commentInputRef.current) {
          const rect = commentInputRef.current.getBoundingClientRect();
          setMentionPosition({
            top: rect.top + window.scrollY + 30,
            left: rect.left + window.scrollX
          });
        }
      } else {
        setShowMentionSuggestions(false);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };
 
  // Handle mention selection
  const handleMentionSelect = (user: User) => {
    if (commentInputRef.current && commentingTask) {
      const cursorPos = commentInputRef.current.selectionStart;
      const text = commentText;
      const textBeforeCursor = text.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
     
      const newText = text.substring(0, lastAtIndex) + `@${user.username} ` + text.substring(cursorPos);
      setCommentText(newText);
     
      // Position cursor after the mention
      setTimeout(() => {
        if (commentInputRef.current) {
          const newCursorPos = lastAtIndex + user.username.length + 2;
          commentInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
          commentInputRef.current.focus();
        }
      }, 0);
    }
   
    setShowMentionSuggestions(false);
    setMentionFilter("");
  };
 
  // Add comment
  const addComment = async (taskId: number) => {
    if (!commentText.trim()) return;
 
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;
 
    const user = JSON.parse(storedUser);
   
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: taskId,
          user_id: user.id,
          content: commentText,
        }),
      });
 
      if (response.ok) {
        const data = await response.json();
        console.log(' Commentaire ajouté avec succès:', data.data);
       
       
        setCommentText('');
        setShowMentionSuggestions(false);
      } else {
        const responseText = await response.text();
        console.error('Erreur lors de l\'ajout du commentaire:', response.status, responseText);
        alert('Erreur lors de l\'ajout du commentaire');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du commentaire:', error);
      alert('Erreur lors de l\'ajout du commentaire');
    }
  };
 
  // Delete comment
  const deleteComment = async (taskId: number, commentId: number) => {
    try {
      const deleteUrl = `/api/messages/${commentId}`;
      console.log('URL de suppression:', deleteUrl);
     
      // Pour le test, on envoie pas de body
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
      });
 
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
      console.error('Erreur lors de la suppression:', error);
    }
  };
 
  // Filter tasks
  const filteredTasks = tasks.filter(task =>
    task.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.dao_objet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.dao_reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );
 
  // Get priority color
  const getPriorityColor = (priorite?: string) => {
   
  };
 
  // Get status color
  const getStatusColor = (statut?: string) => {
   
  };
 
  // Get progress bar color
  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-success';
    if (progress > 0) return 'bg-primary';
    return 'bg-secondary';
  };
 
  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
        </div>
      </div>
    );
  }
 
  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">
          {error}
        </div>
      </div>
    );
  }
 
  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 mb-1">Mes Tâches</h2>
          <p className="text-muted mb-0">
            {tasks.length} tâche{tasks.length > 1 ? 's' : ''} assignée{tasks.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="position-relative">
          <Search className="position-absolute" style={{ left: '12px', top: '12px' }} size={18} />
          <input
            type="text"
            className="form-control ps-5"
            placeholder="Rechercher une tâche..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '300px' }}
          />
        </div>
      </div>
 
      {filteredTasks.length === 0 ? (
        <div className="text-center py-5">
          <FileText size={48} className="text-muted mb-3" />
          <p className="text-muted">
            {searchTerm ? 'Aucune tâche trouvée' : 'Aucune tâche assignée'}
          </p>
        </div>
      ) : (
        <div className="row">
          {filteredTasks.map((task) => (
            <div key={task.id} className="col-lg-6 mb-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="flex-grow-1">
                      <h5 className="card-title mb-2">{task.titre || 'Sans titre'}</h5>
                      <p className="text-muted small mb-2">DAO: {task.dao_objet} (Réf: {task.dao_reference})</p>
                      {task.description && (
                        <p className="card-text">{task.description}</p>
                      )}
                    </div>
                  </div>
 
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge ${getPriorityColor(task.priorite)}`}>
                        {task.priorite || 'moyenne'}
                      </span>
                      <span className={`badge ${getStatusColor(task.statut)}`}>
                        {task.statut === 'termine' ? 'terminée' : task.statut === 'en_cours' ? 'en cours' : 'à faire'}
                      </span>
                    </div>
                    {task.date_echeance && (
                      <small className="text-muted">
                        Échéance: {new Date(task.date_echeance).toLocaleDateString('fr-FR')}
                      </small>
                    )}
                  </div>
 
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small fw-bold">Progression</span>
                      <span className="small fw-bold">{taskProgress[task.id] || 0}%</span>
                    </div>
                    <div className="progress mb-2" style={{ height: '8px' }}>
                      <div
                        className={`progress-bar ${getProgressColor(taskProgress[task.id] || 0)}`}
                        style={{ width: `${taskProgress[task.id] || 0}%` }}
                      />
                    </div>
                    {editingTask === task.id ? (
                      <div className="d-flex align-items-center gap-2">
                        <div className="input-group input-group-sm">
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => handleProgressChange(task.id, -10)}
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            className="form-control text-center"
                            min="0"
                            max="100"
                            value={taskProgress[task.id] || 0}
                            onChange={(e) => handleProgressInput(task.id, e.target.value)}
                            style={{ width: '60px' }}
                          />
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => handleProgressChange(task.id, 10)}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            saveProgress(task.id);
                            setEditingTask(null);
                          }}
                        >
                          <CheckCircle size={14} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditingTask(null)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setEditingTask(task.id)}
                      >
                        Modifier
                      </button>
                    )}
                  </div>
 
                 
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
 
      {/* Mention suggestions dropdown */}
      {showMentionSuggestions && mentionPosition && (
        <div
          className="card position-absolute"
          style={{
            top: `${mentionPosition.top}px`,
            left: `${mentionPosition.left}px`,
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          <div className="card-body p-0">
            {users
              .filter(user =>
                user.username.toLowerCase().includes(mentionFilter.toLowerCase())
              )
              .map(user => (
                <div
                  key={user.id}
                  className="px-3 py-2 hover:bg-light cursor-pointer"
                  onClick={() => handleMentionSelect(user)}
                >
                  <AtSign size={14} className="me-2" />
                  {user.username}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}