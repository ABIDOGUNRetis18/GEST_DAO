"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  X,
  Send,
  UserCheck,
  AlertCircle,
  CheckCircle,
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
}

/* ======================
   COMPOSANT PRINCIPAL
====================== */

export default function DirecteurGeneralTaskPage() {
  const [dao, setDao] = useState<Dao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [globalComment, setGlobalComment] = useState("");
  const [showGlobalComments, setShowGlobalComments] = useState(false);

  // Récupérer l'ID depuis les query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const daoId = urlParams.get('id');
    
    if (daoId) {
      loadDao(daoId);
    }
  }, []);

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
      
      // Charger les tâches depuis la base de données
      await loadTasks(daoId);
    } catch (err) {
      console.error("Error fetching DAO:", err);
      setError("Erreur réseau lors du chargement du DAO");
    } finally {
      setLoading(false);
    }
  }

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
        console.log(` ${adaptedTasks.length} tâches chargées depuis la base`);
      } else {
        console.log("❌ Erreur lors du chargement des tâches, aucune tâche à afficher");
        // Garder un tableau vide si l'API échoue
        setTasks([]);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      console.log("❌ Erreur lors du chargement des tâches, aucune tâche à afficher");
      // Garder un tableau vide si l'API échoue
      setTasks([]);
    }
  }

  // Calculer la progression globale
  const globalProgress = useMemo(() => {
    const total = tasks.reduce((sum, t) => sum + t.progress, 0);
    return Math.round(total / tasks.length);
  }, [tasks]);

  // Ajouter un commentaire
  const addComment = () => {
    if (!newComment.trim() || !selectedTaskId) return;

    const comment: Comment = {
      id: comments.length + 1,
      user: "Directeur Général",
      role: "Directeur Général",
      text: newComment.trim(),
      time: "À l'instant",
      task_id: selectedTaskId,
    };

    setComments((prev) => [...prev, comment]);
    setNewComment("");
  };

  
  // Afficher le modal pour écrire un commentaire
  const showAllComments = () => {
    setShowCommentModal(true);
  };

  // Ajouter un commentaire global
  const addGlobalComment = () => {
    if (!globalComment.trim()) return;

    // Ajouter le commentaire à la première tâche ou créer un commentaire général
    const comment: Comment = {
      id: comments.length + 1,
      user: "Directeur Général",
      role: "Directeur Général",
      text: globalComment.trim(),
      time: "À l'instant",
      task_id: tasks.length > 0 ? tasks[0].id : 1,
    };

    setComments((prev) => [...prev, comment]);
    setGlobalComment("");
    // Ne pas fermer automatiquement le modal - laisser l'utilisateur décider
    // setShowCommentModal(false);
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
          <Link href="/dash/DirecteurGeneral" className="text-blue-600 hover:underline">
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
                <Link href="/dash/DirecteurGeneral" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </Link>
                <div className="min-w-0">
                  <h3 className="font-bold text-2xl text-gray-900 truncate">{dao.numero}</h3>
                  <p className="text-sm text-gray-600 truncate mt-1">{dao.objet || dao.reference}</p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <UserCheck className="w-4 h-4" />
                    Chef projet
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
                <div className="flex items-center gap-2">
                 
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
              <h5 className="text-lg font-semibold flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">{globalProgress}%</span>
                </div>
                Progression globale du DAO
              </h5>
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{globalProgress}%</div>
                <div className="text-sm text-gray-600">Progression totale</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{tasks.filter(t => t.progress === 100).length}</div>
                <div className="text-sm text-gray-600">Tâches terminées</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">{tasks.filter(t => t.progress > 0 && t.progress < 100).length}</div>
                <div className="text-sm text-gray-600">Tâches en cours</div>
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
            <h5 className="text-lg font-semibold mb-4">Progression des tâches</h5>
            
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
                      <h6 className="font-medium text-sm mb-1">{task.name}</h6>
                      <div className="text-xs text-gray-600">
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
                      {task.comment}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

         
        </main>
      </div>

     
    </div>
  );
}
