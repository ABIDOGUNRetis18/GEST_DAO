"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Search, ChevronDown, Minus, Plus, CheckSquare } from "lucide-react";

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
  created_at: string;
  updated_at?: string;
  dao_reference?: string;
  dao_objet?: string;
}

/* =======================
   DASHBOARD
======================= */
export default function MembreEquipeDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskProgress, setTaskProgress] = useState<Record<number, number>>({});

  // Fetch tasks from API
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Début du chargement des tâches...");
        
        // Récupérer l'utilisateur depuis une variable en mémoire
        // NOTE: localStorage n'est pas supporté dans les artifacts Claude.ai
        const mockUser = { id: 1 }; // Simule un utilisateur connecté
        
        const userId = mockUser.id;
        console.log("ID utilisateur:", userId);
        
        if (!userId) {
          const errorMsg = "Erreur: ID utilisateur non trouvé";
          console.error(errorMsg);
          setError(errorMsg);
          return;
        }
        
        try {
          console.log(`Envoi de la requête à /api/member-tasks?userId=${userId}`);
          const response = await fetch(`/api/member-tasks?userId=${userId}`);
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur HTTP: ${response.status} - ${errorText}`);
          }
          
          const result = await response.json();
          console.log("Réponse brute de l'API:", JSON.stringify(result, null, 2));
          
          if (result.success) {
            console.log(`${result.data?.length || 0} tâches reçues`);
            
            setTasks(result.data || []);
            
            // Initialize progress from database
            const progressMap: Record<number, number> = {};
            (result.data || []).forEach((task: Task) => {
              if (task.id === undefined) {
                console.error("Tâche sans ID détectée:", task);
              } else {
                progressMap[task.id] = task.progress || 0;
              }
            });
            
            console.log("Carte de progression initialisée:", progressMap);
            setTaskProgress(progressMap);
          } else {
            const errorMsg = result.message || 'Erreur inconnue lors du chargement des tâches';
            console.error("Erreur de l'API:", errorMsg);
            setError(errorMsg);
          }
        } catch (error) {
          const errorMsg = `Erreur lors de la récupération des tâches: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errorMsg);
          setError(errorMsg);
        }
      } catch (err) {
        setError('Erreur de connexion au serveur');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter(
    (task: Task) =>
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.dao_reference && task.dao_reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.dao_objet && task.dao_objet.toLowerCase().includes(searchTerm.toLowerCase())) ||
      task.id.toString().includes(searchTerm.toLowerCase())
  );

  const updateProgress = async (taskId: number, value: number) => {
    const newValue = Math.min(100, Math.max(0, value));
    
    if (!taskId || isNaN(Number(taskId))) {
      return;
    }
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      return;
    }
    
    setTaskProgress((prev) => ({
      ...prev,
      [taskId]: newValue
    }));
    
    try {
      const apiUrl = `/api/tasks/${taskId}/progress`;
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ progress: newValue }),
      });
      
      if (!response.ok) {
        throw new Error('Échec de la mise à jour');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Erreur lors de la mise à jour');
      }
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la progression:', error);
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
                <div
                  key={task.id}
                  className="bg-white rounded-xl border shadow-sm"
                >
                  {/* HEADER */}
                  <div
                    className="p-4 sm:p-6 cursor-pointer"
                    onClick={() =>
                      setExpandedTask(expandedTask === task.id ? null : task.id)
                    }
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-semibold">Tâche #{task.id}</h3>

                        <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-gray-600 mt-2">
                          <span className="flex items-center gap-1">
                            <CheckSquare size={14} /> DAO-{task.dao_id}
                            {task.dao_reference && ` (${task.dao_reference})`}
                          </span>
                          {task.dao_objet && (
                            <span className="flex items-center gap-1">
                              <CheckSquare size={14} /> {task.dao_objet}
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
                          onClick={() =>
                            setEditingTask(
                              editingTask === task.id ? null : task.id
                            )
                          }
                          className="px-3 py-2 sm:py-1 text-xs border rounded hover:bg-gray-100"
                        >
                          Progression
                        </button>
                        <button
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