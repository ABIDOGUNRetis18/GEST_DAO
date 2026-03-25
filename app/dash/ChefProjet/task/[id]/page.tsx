"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Send, Trash } from "lucide-react";

interface Member {
  id: number;
  username: string;
}

interface TaskRow {
  id: number;
  nom: string;
}

interface TaskAssignmentRow {
  id: number;
  dao_id: number;
  id_task: number;
  assigned_to: number | null;
}

export default function ChefProjetTasksPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const daoId = params?.id;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [assignments, setAssignments] = useState<Record<number, number | null>>(
    {},
  );
  const [newTaskName, setNewTaskName] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!daoId) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const membersRes = await fetch(`/api/dao/${daoId}/team-members`, {
          cache: "no-store",
        });

        if (!membersRes.ok) {
          const data = await membersRes.json().catch(() => null);
          throw new Error(data?.message || "Erreur lors du chargement des membres");
        }

        const membersJson = await membersRes.json();
        setMembers(membersJson?.data || []);

        const tasksRes = await fetch("/api/task", { cache: "no-store" });

        if (!tasksRes.ok) {
          const data = await tasksRes.json().catch(() => null);
          throw new Error(data?.message || "Erreur lors du chargement des taches");
        }

        const tasksJson = await tasksRes.json();
        setTasks(tasksJson?.data || []);

        const assignRes = await fetch(
          `/api/task-assignment?daoId=${daoId}`,
          { cache: "no-store" },
        );

        if (assignRes.ok) {
          const assignJson = await assignRes.json().catch(() => null);
          const rows: TaskAssignmentRow[] = assignJson?.data || [];
          const map: Record<number, number | null> = {};
          for (const row of rows) {
            if (row.id_task) {
              map[row.id_task] = row.assigned_to ?? null;
            }
          }
          setAssignments(map);
        }
      } catch (e: any) {
        console.error("Erreur chargement taches DAO", e);
        setError(e?.message || "Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    })();
  }, [daoId]);

  const handleAssign = async (task: TaskRow, memberId: number | "") => {
    const numericMemberId = memberId ? Number(memberId) : null;

    setAssignments((prev) => ({
      ...prev,
      [task.id]: numericMemberId,
    }));

    if (!daoId) {
      return;
    }

    try {
      // Si numericMemberId est null, on désassigne la tâche
      if (!numericMemberId) {
        // Appeler l'API pour désassigner
        const response = await fetch(`/api/task-assignment/unassign`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dao_id: Number(daoId),
            id_task: task.id,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`Tâche désassignée avec succès:`, result);
          // Pas besoin de recharger, l'état est déjà mis à jour localement
        } else {
          console.error("Erreur lors de la désassignation de la tâche");
          // En cas d'erreur, on restore l'état précédent
          setAssignments((prev) => ({
            ...prev,
            [task.id]: assignments[task.id], // Restore previous value
          }));
        }
      } else {
        // Utiliser l'API task-assignment qui gère maintenant les mises à jour automatiquement
        const response = await fetch(`/api/task-assignment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dao_id: Number(daoId),
            id_task: task.id,
            assigned_to: numericMemberId,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`Tâche assignée avec succès:`, result);
          // Rafraîchir les données pour voir les changements
          router.refresh();
        } else {
          console.error("Erreur lors de l'assignation de la tâche");
          // En cas d'erreur, on restore l'état précédent
          setAssignments((prev) => ({
            ...prev,
            [task.id]: assignments[task.id], // Restore previous value
          }));
        }
      }
    } catch (e) {
      console.error("Erreur lors de l'assignation de la tache", e);
    }
  };

  if (!daoId) {
    return <div className="p-4 text-sm">DAO introuvable.</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
        Chargement des taches...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-sm text-red-600">
        <p>{error}</p>
        <button
          onClick={() => router.refresh()}
          className="mt-3 px-3 py-2 border rounded text-xs"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-50 p-6 no-print">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <Link href="/dash/ChefProjet/MyDao" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </Link>
              <div>
                <h3 className="font-bold text-xl text-gray-900">DAO N°{daoId}</h3>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <section className="bg-white rounded shadow p-4">
          <h4 className="font-semibold mb-3 text-sm">Créer une tache (table task)</h4>

          <form
            className="flex flex-col sm:flex-row gap-3 items-start"
            onSubmit={async (e) => {
              e.preventDefault();
              setSaveMessage(null);
              const value = newTaskName.trim();
              if (!value) {
                setSaveMessage("Le nom de la tache est requis.");
                return;
              }

              try {
                setSavingTask(true);
                const res = await fetch("/api/task", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ nom: value }),
                });

                const data = await res.json().catch(() => null);
                if (!res.ok) {
                  setSaveMessage(data?.message || "Erreur lors de l'enregistrement");
                  return;
                }

                setNewTaskName("");
                setSaveMessage("Tache enregistree avec succes.");

                if (data && (data.id || data.insertId)) {
                  const newId = Number(data.id || data.insertId);
                  const newNom = data.nom || value;
                  setTasks((prev) => [...prev, { id: newId, nom: newNom }]);
                }
              } catch (err: any) {
                console.error("Erreur POST /api/task", err);
                setSaveMessage("Erreur reseau lors de l'enregistrement");
              } finally {
                setSavingTask(false);
              }
            }}
          >
            <input
              type="text"
              className="flex-1 border rounded px-3 py-2 text-sm w-full"
              placeholder="Nom de la tache a enregistrer dans la table task"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
            />
            <button
              type="submit"
              disabled={savingTask}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-60"
            >
              {savingTask ? "Enregistrement..." : "Enregistrer"}
            </button>
          </form>

          {saveMessage && (
            <p className="mt-2 text-xs text-gray-600">{saveMessage}</p>
          )}
        </section>

        <section className="bg-white rounded shadow p-4">
          <h5 className="font-semibold mb-3 text-sm">Taches du DAO</h5>

          {tasks.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left border-b">N°</th>
                    <th className="px-3 py-2 text-left border-b">Tache</th>
                    <th className="px-3 py-2 text-left border-b">Assigner à</th>
                    <th className="px-3 py-2 text-left border-b">Membres assignés</th>
                    
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, index) => (
                    <tr key={task.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 align-top">{index + 1}</td>
                      <td className="px-3 py-2 align-top max-w-xs">
                        <div className="font-medium break-words">{task.nom}</div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <select
                          className="w-full border rounded px-2 py-1 text-xs"
                          value={assignments[task.id] ?? ""}
                          onChange={(e) =>
                            handleAssign(
                              task,
                              e.target.value ? Number(e.target.value) : "",
                            )
                          }
                        >
                          <option value="">Non assignée</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.username}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 align-top text-gray-600">
                        {assignments[task.id] && (
                          <span className="inline-flex items-center gap-1">
                            <User size={12} />
                            {
                              members.find(
                                (m) => m.id === assignments[task.id]!,
                              )?.username
                            }
                          </span>
                        )}
                      </td>
                     
                        
                      
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}