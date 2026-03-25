"use client";



import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import {

  CheckCircle,

  Clock,

  FileText,

  User,

  Search,

  ChevronDown,

  Plus,

  Edit,

  Trash2,

  MessageCircle,

  BarChart3,

  Calendar,

  Target,

} from "lucide-react";

import Link from "next/link";



interface Task {

  id: number;

  titre: string;

  description: string;

  dao_objet: string;

  progress: number;

  status: string;

  priority: string;

  assigned_to: number;

  created_at: string;

  updated_at: string;

}



interface TeamData {

  id: number;

  username: string;

  role_id: string;

  url_photo: string | null;

}



export default function MembreEquipeDashboard() {

  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);

  const [teamData, setTeamData] = useState<TeamData[]>([]);

  const [currentUser, setCurrentUser] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");

  const [taskProgress, setTaskProgress] = useState<{ [key: number]: number }>({});

  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

  const [showTaskForm, setShowTaskForm] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [taskForm, setTaskForm] = useState({

    titre: "",

    description: "",

    dao_objet: "",

    priority: "medium",

  });



  // Fetch current user

  useEffect(() => {

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



  // Fetch tasks

  useEffect(() => {

    fetchTasks();

    fetchTeamData();

  }, [currentUser]);



  const fetchTasks = async () => {

    try {

      const userId = currentUser?.id;

      console.log("fetchTasks - Utilisateur courant:", currentUser);

      console.log("fetchTasks - userId:", userId);

      

      if (!userId) {

        console.log("Pas d'utilisateur courant, impossible de récupérer les tâches");

        return;

      }

      

      console.log("Appel API /api/member-tasks?userId=", userId);

      const response = await fetch(`/api/member-tasks?userId=${userId}`);

      console.log("Response status:", response.status);

      

      if (response.ok) {

        const result = await response.json();

        console.log("API result:", result);

        if (result.success) {

          setTasks(result.data || []);

          console.log("Tâches récupérées:", result.data);

          // Initialize progress for each task

          const initialProgress: { [key: number]: number } = {};

          result.data.forEach((task: Task) => {

            initialProgress[task.id] = task.progress || 0;

          });

          setTaskProgress(initialProgress);

        }

      } else {

        const errorText = await response.text();

        console.error("API Error:", response.status, errorText);

      }

    } catch (error) {

      console.error("Error fetching tasks:", error);

    } finally {

      setLoading(false);

    }

  };



  const fetchTeamData = async () => {

    try {

      const response = await fetch("/api/team-members");

      if (response.ok) {

        const result = await response.json();

        if (result.success) {

          setTeamData(result.data || []);

        }

      }

    } catch (error) {

      console.error("Error fetching team data:", error);

    }

  };



  const updateProgress = async (taskId: number, value: number) => {

    if (updatingTaskId) return;

    

    const newValue = Math.min(100, Math.max(0, value));

    

    const task = tasks.find(t => t.id === taskId);

    if (!task) return;

    

    setTaskProgress((prev) => ({

      ...prev,

      [taskId]: newValue

    }));

    

    setUpdatingTaskId(taskId);

    

    try {

      const response = await fetch(`/api/tasks/${taskId}/progress`, {

        method: "PUT",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          progress: newValue,

        }),

      });

      

      if (response.ok) {

        const result = await response.json();

        if (result.success) {

          await fetchTasks();

        }

      } else {

        // Revert on error

        setTaskProgress((prev) => ({

          ...prev,

          [taskId]: task.progress || 0

        }));

      }

    } catch (error) {

      console.error("Error updating progress:", error);

      // Revert on error

      setTaskProgress((prev) => ({

        ...prev,

        [taskId]: task.progress || 0

      }));

    } finally {

      setUpdatingTaskId(null);

    }

  };



  const getProgressFromStatus = (status: string) => {

    switch (status) {

      case "completed": return 100;

      case "in-progress": return 50;

      case "pending": return 0;

      default: return 0;

    }

  };



  const getStatusFromProgress = (progress: number) => {

    if (progress === 100) return "completed";

    if (progress > 0) return "in-progress";

    return "pending";

  };



  const getStatusColor = (status: string) => {

    switch (status) {

      case "completed": return "text-green-600 bg-green-100";

      case "in-progress": return "text-blue-600 bg-blue-100";

      case "pending": return "text-yellow-600 bg-yellow-100";

      default: return "text-gray-600 bg-gray-100";

    }

  };



  const getPriorityColor = (priority: string) => {

    switch (priority) {

      case "high": return "text-red-600 bg-red-100";

      case "medium": return "text-orange-600 bg-orange-100";

      case "low": return "text-green-600 bg-green-100";

      default: return "text-gray-600 bg-gray-100";

    }

  };



  const filteredTasks = tasks.filter(

    (task: Task) =>

      (task.titre && task.titre.toLowerCase().includes(searchTerm.toLowerCase())) ||

      (task.dao_objet && task.dao_objet.toLowerCase().includes(searchTerm.toLowerCase())) ||

      task.id.toString().includes(searchTerm.toLowerCase())

  );



  const stats = {

    total: tasks.length,

    completed: tasks.filter(t => t.progress === 100).length,

    inProgress: tasks.filter(t => t.progress > 0 && t.progress < 100).length,

    pending: tasks.filter(t => t.progress === 0).length,

  };



  if (loading) {

    return (

      <div className="min-h-screen bg-gray-50 flex items-center justify-center">

        <div className="text-center">

          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>

          <p className="text-gray-600">Chargement du dashboard...</p>

        </div>

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-gray-50">

      {/* Header */}

      <header className="bg-gray-50 p-6 no-print">

        <div className="max-w-7xl mx-auto">

          <div className="bg-white rounded-xl shadow-lg p-6">

            <div className="flex justify-between items-center">

              <div className="flex items-center">

                <h3 className="text-2xl font-bold text-gray-900">Dashboard Membre d'Équipe</h3>

              </div>

              <div className="flex items-center space-x-4">

                <div className="flex items-center space-x-2 text-sm text-gray-600">

                  <User className="w-4 h-4" />

                  <span>{currentUser?.username || "Membre d'équipe"}</span>

                </div>

              </div>

            </div>

          </div>

        </div>

      </header>



      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats Cards */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">

          <StatCard

            title="Tâches totales"

            value={stats.total}

            icon={<FileText className="w-6 h-6 text-blue-600" />}

            color="blue"

          />

          <StatCard

            title="Termínées"

            value={stats.completed}

            icon={<CheckCircle className="w-6 h-6 text-green-600" />}

            color="green"

          />

          <StatCard

            title="En cours"

            value={stats.inProgress}

            icon={<Clock className="w-6 h-6 text-yellow-600" />}

            color="yellow"

          />

          <StatCard

            title="En attente"

            value={stats.pending}

            icon={<Target className="w-6 h-6 text-gray-600" />}

            color="blue"

          />

        </div>



        {/* Search and Filters */}

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">

          <div className="flex flex-col sm:flex-row gap-4">

            <div className="flex-1 relative">

              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />

              <input

                type="text"

                placeholder="Rechercher une tâche..."

                value={searchTerm}

                onChange={(e) => setSearchTerm(e.target.value)}

                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"

              />

            </div>

          </div>

        </div>



        {/* Tasks List */}

        <div className="space-y-4">

          {filteredTasks.length === 0 ? (

            <div className="bg-white rounded-lg shadow-sm p-8 text-center">

              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />

              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune tâche trouvée</h3>

              <p className="text-gray-600">

                {searchTerm ? "Aucune tâche ne correspond à votre recherche." : "Vous n'avez aucune tâche assignée pour le moment."}

              </p>

            </div>

          ) : (

            filteredTasks.map((task) => (

              <div key={task.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">

                <div className="p-6">

                  <div className="flex items-start justify-between mb-4">

                    <div className="flex-1">

                      <div className="flex items-center gap-3 mb-2">

                        <h6 className="text-lg font-semibold text-gray-900">{task.titre}</h6>

                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(getStatusFromProgress(task.progress))}`}>

                          {getStatusFromProgress(task.progress) === "completed" && "Complétée"}

                          {getStatusFromProgress(task.progress) === "in-progress" && "En cours"}

                          {getStatusFromProgress(task.progress) === "pending" && "En attente"}

                        </span>

                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>

                          {task.priority === "high" && "Haute"}

                          {task.priority === "medium" && "Moyenne"}

                          {task.priority === "low" && "Basse"}

                        </span>

                      </div>

                      <p className="text-gray-600 mb-2">{task.description}</p>

                      <p className="text-sm text-gray-500 mb-3">

                        <strong>DAO:</strong> {task.dao_objet}

                      </p>

                      <div className="flex items-center gap-4 text-sm text-gray-500">

                        <span className="flex items-center gap-1">

                        </span>

                      </div>

                    </div>

                    <div className="flex items-center gap-2 ml-4">

                      <Link

                        href={`/dash/MembreEquipe/task?id=${task.id}`}

                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"

                        title="Voir les détails et commenter"

                      >

                        <MessageCircle className="w-5 h-5" />

                      </Link>

                    </div>

                  </div>



                  {/* Progress Bar */}

                  <div className="space-y-2">

                    <div className="flex justify-between items-center">

                      <span className="text-sm font-medium text-gray-700">Progression</span>

                      <span className="text-sm text-gray-600">{taskProgress[task.id] || 0}%</span>

                    </div>

                    <div className="relative">

                      <div className="w-full bg-gray-200 rounded-full h-2">

                        <div

                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"

                          style={{ width: `${taskProgress[task.id] || 0}%` }}

                        ></div>

                      </div>

                      <input

                        type="range"

                        min="0"

                        max="100"

                        value={taskProgress[task.id] || 0}

                        onChange={(e) => updateProgress(task.id, parseInt(e.target.value))}

                        disabled={updatingTaskId === task.id}

                        className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"

                        style={{ cursor: updatingTaskId === task.id ? "not-allowed" : "pointer" }}

                      />

                    </div>

                    {updatingTaskId === task.id && (

                      <p className="text-xs text-blue-600">Mise à jour en cours...</p>

                    )}

                  </div>

                </div>

              </div>

            ))

          )}

        </div>

      </main>

    </div>

  );

}



/* =======================

   STAT CARD

======================= */

function StatCard({

  title,

  value,

  icon,

  color,

}: {

  title: string;

  value: number;

  icon: React.ReactNode;

  color: "blue" | "yellow" | "green";

}) {

  const colors = {

    blue: "bg-blue-50 border-blue-200",

    yellow: "bg-yellow-50 border-yellow-200",

    green: "bg-green-50 border-green-200",

  };



  return (

    <div className={`border rounded-xl p-4 ${colors[color]}`}>

      <div className="flex items-center justify-between mb-2">

        <div className="p-2 bg-white rounded-lg">{icon}</div>

        <span className="text-2xl font-bold">{value}</span>

      </div>

      <p className="font-medium text-gray-800">{title}</p>

    </div>

  );

}

