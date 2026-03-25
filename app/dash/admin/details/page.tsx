"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  X,
  Send,
  User,
  Minus,
  Plus,
  Calendar,
  UserCheck,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
}

/* ======================
   DONNÉES DE BASE
====================== */

const daoTasks: Task[] = [
];

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

export default function DaoDetailsPage() {
  const router = useRouter();
  const [dao, setDao] = useState<Dao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>(daoTasks);
  const [comments, setComments] = useState<Comment[]>(commentsData);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");

  // Récupérer l'ID depuis l'URL
  useEffect(() => {
    const pathSegments = window.location.pathname.split('/');
    const daoId = pathSegments[pathSegments.length - 1];
    
    if (daoId && daoId !== 'details') {
      loadDao(daoId);
    } else {
      // Si pas d'ID, rediriger vers la liste
      router.push('/dash/admin/allDao');
    }
  }, [router]);

  // Charger les données du DAO
  async function loadDao(daoId: string) {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/daos/${daoId}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("API /api/daos/[id] error:", json);
        setError(json?.message || "Erreur lors du chargement du DAO");
        return;
      }

      setDao(json.data);
    } catch (err) {
      console.error("Error fetching DAO:", err);
      setError("Erreur réseau lors du chargement du DAO");
    } finally {
      setLoading(false);
    }
  }

  // Calculer la progression globale
  const globalProgress = useMemo(() => {
    const total = tasks.reduce((sum, t) => sum + t.progress, 0);
    return Math.round(total / tasks.length);
  }, [tasks]);

  // Mettre à jour la progression d'une tâche
  const updateProgress = (id: number, value: number) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, progress: Math.min(100, Math.max(0, value)) }
          : t
      )
    );
  };

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
                  <h1 className="font-bold text-2xl text-gray-900 truncate">{dao.numero}</h1>
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
                    dao.statut === 'aRisque' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {dao.statut === 'aRisque' ? (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        À risque
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        En cours
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* PROGRESSION GLOBALE */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">{globalProgress}%</span>
              </div>
              Progression globale du DAO
            </h2>
            <span className="text-sm text-gray-500">
              {tasks.filter(t => t.progress === 100).length} / {tasks.length} tâches terminées
            </span>
          </div>
          
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
            <span>Date de dépôt : {new Date(dao.date_depot || Date.now()).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit', 
                              year: 'numeric'
                            })}</span>
            <span>Progression : {globalProgress}%</span>
          </div>
        </section>

        {/* LISTE DES TÂCHES */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Progression des tâches</h2>
          
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
                    <h2 className="font-medium text-sm mb-1">{task.name}</h2>
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
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateProgress(task.id, Math.max(0, task.progress - 10));
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      disabled={task.progress === 0}
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateProgress(task.id, Math.min(100, task.progress + 10));
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      disabled={task.progress === 100}
                    >
                      <Plus size={14} />
                    </button>
                    <span className="text-xs text-gray-500 flex-1">
                      {task.comment}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION COMMENTAIRES */}
        {selectedTaskId && (
          <section className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Send className="w-5 h-5" />
                Commentaires - Tâche {selectedTaskId}
              </h2>
              <button
                onClick={() => setSelectedTaskId(null)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Liste des commentaires */}
            <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
              {taskComments.length > 0 ? (
                taskComments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.user}</span>
                        <span className="text-xs text-gray-500">({comment.role})</span>
                        <span className="text-xs text-gray-400">{comment.time}</span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Aucun commentaire pour cette tâche</p>
                </div>
              )}
            </div>

            {/* Espace pour écrire un commentaire */}
            <div className="border-t pt-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User size={16} className="text-gray-600" />
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Écrire un commentaire..."
                    className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
                      {newComment.length} caractères
                    </span>
                    <button
                      onClick={addComment}
                      disabled={!newComment.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send size={16} />
                      Envoyer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
