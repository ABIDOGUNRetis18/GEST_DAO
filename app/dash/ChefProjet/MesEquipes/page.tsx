"use client";

import { useEffect, useState } from "react";

import {
  Users,
  Search,
  ChevronRight,
  User,
  Briefcase,
  Users2,
  FolderOpen,
} from "lucide-react";

interface ApiTeamDao {
  daoId: number;
  numero: string;
  objet: string | null;
  chefName: string | null;
  members: { id: number; name: string }[];
}

interface Task {
  id: number;
  id_task: string;
  titre: string;
  description: string;
  statut: string;
  progress: number;
  dao_id: number;
  assigned_to: number;
  date_creation: string;
  date_echeance: string;
  priorite: string;
}

interface TeamData {
  id: number;
  name: string;
  leader: string;
  memberCount: number;
  daoCount: number;
  status: string;
  members: { id: number; name: string; role: string; status: string; tasks: Task[] }[];
  daos: { id: number; name: string; progress: number }[];
  tasks: Task[];
}

export default function ChefProjetDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [teamsData, setTeamsData] = useState<TeamData[]>([]);

  // Fonction pour calculer la progression basée sur le statut
  const getProgressFromStatus = (statut: string) => {
    switch (statut) {
      case 'termine': return 100;
      case 'en_cours': return 50;
      case 'a_faire': return 0;
      default: return 0;
    }
  };

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        return;
      }

      const user = JSON.parse(storedUser);
      const chefId = user?.id;
      if (!chefId) {
        return;
      }

      // Fonction pour charger les tâches d'un membre
      const loadMemberTasks = async (memberId: number) => {
        try {
          const res = await fetch(`/api/member-tasks?userId=${memberId}`);
          if (res.ok) {
            const json = await res.json();
            return json.data || [];
          }
        } catch (error) {
          console.error(`Erreur chargement tâches membre ${memberId}:`, error);
        }
        return [];
      };

      (async () => {
        try {
          const res = await fetch(`/api/chef-teams?chefId=${chefId}`);
          if (!res.ok) {
            console.error("Erreur chargement équipes chef", await res.text());
            return;
          }

          const json = await res.json();
          const apiData: ApiTeamDao[] = json?.data || [];

          const mapped: TeamData[] = apiData.map((item, index) => {
            const members = (item.members || []).map((m) => ({
              id: m.id,
              name: m.name,
              role: "Membre d'équipe",
              status: "available",
              tasks: [], // Sera chargé plus tard
            }));

            return {
              id: item.daoId,
              name: item.numero,
              leader: item.chefName || "",
              memberCount: members.length,
              daoCount: 1,
              status: "active",
              members,
              tasks: [], // Initialisation vide, les tâches sont dans les membres
              daos: [
                {
                  id: item.daoId,
                  name: item.objet || item.numero,
                  progress: 0,
                },
              ],
            };
          });

          // Charger les tâches pour chaque membre
          const membersWithTasks = await Promise.all(
            mapped.map(async (team) => {
              const membersWithTasksData = await Promise.all(
                team.members.map(async (member) => {
                  const tasks = await loadMemberTasks(member.id);
                  return {
                    ...member,
                    tasks: tasks,
                  };
                })
              );

              return {
                ...team,
                members: membersWithTasksData,
              };
            })
          );

          setTeamsData(membersWithTasks);
        } catch (e) {
          console.error("Erreur réseau chargement équipes chef", e);
        }
      })();
    } catch (e) {
      console.error("Erreur lecture utilisateur depuis localStorage (MesEquipes)", e);
    }
  }, []);

  const filteredTeams = teamsData.filter((team) => {
    const matchesSearch =
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.leader.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || team.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalTeams: teamsData.length,
    activeTeams: teamsData.filter((t) => t.status === "active").length,
    totalMembers: teamsData.reduce((sum, team) => sum + team.memberCount, 0),
    totalDaos: teamsData.reduce((sum, team) => sum + team.daoCount, 0),
    averageProgress:
      teamsData.length === 0
        ? 0
        : Math.round(
            teamsData.reduce(
              (sum, team) =>
                sum + team.daos.reduce((s, d) => s + d.progress, 0),
              0,
            ) /
              teamsData.reduce((sum, team) => sum + team.daos.length, 0),
          ),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-gray-50 p-6 no-print">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Gestion des équipes
                </h3>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* STATISTIQUES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Équipes Totales"
            value={stats.totalTeams}
            icon={<Briefcase className="text-blue-700" />}
            color="blue"
          />
          <StatCard
            title="Membres Totaux"
            value={stats.totalMembers}
            icon={<Users2 className="text-purple-700" />}
            color="purple"
          />
          <StatCard
            title="DAOs Assignés"
            value={stats.totalDaos}
            icon={<FolderOpen className="text-orange-700" />}
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* SECTION GAUCHE - LISTE DES ÉQUIPES */}
          <div className="space-y-6">
            {/* BARRE DE RECHERCHE ET FILTRES */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="Rechercher une équipe ou un membre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterStatus("all")}
                    className={`px-4 py-2 rounded-lg ${filterStatus === "all" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}`}
                  >
                    Filtrer
                  </button>
                </div>
              </div>
            </div>

            {/* LISTE DES ÉQUIPES */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h4 className="text-lg font-semibold text-gray-900">Équipes</h4>
              </div>
              <div className="divide-y divide-gray-200">
                {filteredTeams.map((team) => (
                  <div
                    key={team.id}
                    className={`p-6 hover:bg-gray-50 cursor-pointer transition-all duration-200 ${selectedTeam === team.id ? "bg-gray-50" : ""}`}
                    onClick={() =>
                      setSelectedTeam(selectedTeam === team.id ? null : team.id)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            team.status === "active"
                              ? "bg-green-100"
                              : "bg-gray-100"
                          }`}
                        >
                          <Users
                            className={
                              team.status === "active"
                                ? "text-green-600"
                                : "text-gray-400"
                            }
                          />
                        </div>
                        <div>
                          <h4 className="font-semibold">{team.name}</h4>
                          <p className="text-sm text-gray-500">
                            Chef d'équipe: {team.leader}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {team.memberCount} membres
                            </span>
                          </div>
                        </div>
                        <ChevronRight
                          className={`transform transition-transform ${selectedTeam === team.id ? "rotate-90" : ""}`}
                        />
                      </div>
                    </div>

                    {/* DÉTAILS DE L'ÉQUIPE (DÉPLIÉ) */}
                    {selectedTeam === team.id && (
                      <div className="mt-6 pt-6 animate-fadeIn">
                        {/* TÂCHES ASSIGNÉES */}
                        <div className="bg-gray-100 rounded-xl p-4 mb-4">
                          <h4 className="font-semibold text-gray-900">
                            Tâches Assignées
                          </h4>
                        </div>
                        <div className="space-y-4">
                          {team.members.map((member) => {
                            // Filtrer les tâches pour ce DAO spécifique
                            const memberTasksForDao = member.tasks?.filter((task: Task) => task.dao_id === team.id) || [];

                            if (memberTasksForDao.length === 0) {
                              return null; // Ne pas afficher les membres sans tâches sur ce DAO
                            }

                            return (
                              <div key={member.id} className="border-2 border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-white shadow-sm hover:shadow-md transition-all duration-200">
                                {/* En-tête avec nom du membre */}
                                <div className="bg-gray-100 px-4 py-3 border-b-2 border-gray-200 rounded-t-xl">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                                        member.status === "available"
                                          ? "bg-green-100 border-2 border-green-200"
                                          : member.status === "busy"
                                            ? "bg-yellow-100 border-2 border-yellow-200"
                                            : "bg-gray-100 border-2 border-gray-200"
                                      }`}
                                    >
                                      <User
                                        size={18}
                                        className={
                                          member.status === "available"
                                            ? "text-green-600"
                                            : member.status === "busy"
                                              ? "text-yellow-600"
                                              : "text-gray-400"
                                        }
                                      />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900">
                                        {member.name}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        {member.role}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Liste des tâches du membre */}
                                <div className="p-4 space-y-3">
                                  {memberTasksForDao.map((task: Task) => {
                                    // Utiliser la progression sauvegardée, fallback sur le statut si non défini
                                    const progress = task.progress !== undefined ? task.progress : getProgressFromStatus(task.statut);
                                    return (
                                      <div key={task.id} className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md hover:border-gray-400 transition-all duration-200">
                                        <div className="flex justify-between items-center mb-3">
                                          <span className="text-sm font-semibold text-gray-700 truncate flex-1 mr-3">
                                            {task.id_task} - {task.titre || task.description || `Tâche ${task.id}`}
                                          </span>
                                          <span className="text-sm font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-md">
                                            {progress}%
                                          </span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                                          <div
                                            className={`h-3 rounded-full transition-all duration-300 ${
                                              task.statut === 'termine' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                              task.statut === 'en_cours' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 
                                              'bg-gradient-to-r from-blue-500 to-blue-600'
                                            }`}
                                            style={{ width: `${progress}%` }}
                                          />
                                        </div>
                                        <span className="text-xs font-medium px-2 py-1 rounded text-white">
                                            {task.statut}
                                          </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}

                          {/* Message si aucune tâche assignée sur ce DAO */}
                          {team.members.every((member) => 
                            (member.tasks?.filter((task: Task) => task.dao_id === team.id) || []).length === 0
                          ) && (
                            <div className="text-sm text-gray-500 italic text-center py-8">
                              Aucune tâche assignée sur ce DAO
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-100",
    purple: "bg-purple-50 border-purple-100",
    orange: "bg-orange-50 border-orange-100",
  };

  return (
    <div
      className={`${colorClasses[color as keyof typeof colorClasses]} border rounded-xl p-4`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="p-2 rounded-lg bg-white">{icon}</div>
      </div>
    </div>
  );
}