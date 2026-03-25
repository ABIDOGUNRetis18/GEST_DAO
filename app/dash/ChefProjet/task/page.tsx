"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeft,
  X,
  Send,
  User,
  Minus,
  Plus,
} from "lucide-react";
import Link from "next/link";

interface Task {
  id: number;
  name: string;
  progress: number;
  comment: string;
  assigned_to?: string;
  deadline?: Date;
}

/* ======================
   COMPOSANT PRINCIPAL
====================== */

export default function DaoDetailStatic() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");

  const dao = {
    numero: "DAO-2025-001",
    objet: "Rénovation école primaire — Lot 1",
  };

  /* PROGRESSION GLOBALE */
  const globalProgress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const total = tasks.reduce((sum, t) => sum + t.progress, 0);
    return Math.round(total / tasks.length);
  }, [tasks]);

  const updateProgress = (id: number, value: number) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, progress: Math.min(100, Math.max(0, value)) }
          : t
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-gray-50 p-4 sm:p-6 no-print">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <Link href="/dash/ChefProjet/MyDao" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </Link>
                <div className="min-w-0">
                  <h1 className="font-bold text-xl text-gray-900 truncate">{dao.numero}</h1>
                  <p className="text-sm text-gray-600 truncate mt-1">{dao.objet}</p>
                </div>
              </div>

              <button className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 text-sm">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* PROGRESSION GLOBALE */}
        <section className="bg-white rounded shadow p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Progression globale</span>
            <span className="font-semibold">{globalProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 h-3 rounded">
            <div
              className="h-3 bg-green-600 rounded transition-all"
              style={{ width: `${globalProgress}%` }}
            />
          </div>
        </section>

        {/* TÂCHES */}
        <section className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-3">Tâches</h2>

          {tasks.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Aucune tâche disponible pour ce DAO
            </p>
          ) : (
            tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onProgressChange={(v) => updateProgress(task.id, v)}
                onCommentClick={() => setSelectedTaskId(task.id)}
              />
            ))
          )}
        </section>
      </main>

      {/* COMMENTAIRES */}
      {selectedTaskId && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedTaskId(null)}
          />

          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl flex flex-col z-50">
            <div className="border-b p-4 flex justify-between items-center">
              <p className="font-semibold">Commentaires</p>
              <button onClick={() => setSelectedTaskId(null)}>
                <X />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-sm text-gray-500 text-center py-4">
                Aucun commentaire pour cette tâche
              </p>
            </div>

            <div className="border-t p-3 flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Écrire un commentaire..."
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
              <button className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                <Send size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ======================
   TÂCHE
====================== */

function TaskItem({
  task,
  onProgressChange,
  onCommentClick,
}: {
  task: { id: number; name: string; progress: number; comment: string };
  onProgressChange: (v: number) => void;
  onCommentClick: () => void;
}) {
  const [showProgress, setShowProgress] = useState(false);

  return (
    <div className="border rounded p-3 sm:p-4 mb-3">
      <h3 className="text-sm font-medium">{task.name}</h3>
      
      <div className="mt-2">
        <div className="mb-1">
          <span className="text-xs">Assigné à: Non assigné</span>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:justify-between text-xs mb-1 gap-1">
          <span>Avancement</span>
          <span>{task.progress}%</span>
        </div>
        
        <div className="w-full bg-gray-200 h-2 rounded">
          <div
            className="h-2 bg-blue-600 rounded transition-all"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setShowProgress(!showProgress)}
          className="flex-1 text-xs border rounded py-1 hover:bg-gray-100"
        >
          Progression
        </button>

        <button
          onClick={onCommentClick}
          className="flex-1 text-xs border rounded py-1 hover:bg-gray-100"
        >
          Commentaires
        </button>
      </div>

      {showProgress && (
        <div className="mt-3 bg-gray-50 p-3 rounded">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={task.progress}
            onChange={(e) => onProgressChange(Number(e.target.value))}
            className="w-full"
          />

          <div className="flex justify-between mt-2">
            <button
              onClick={() => onProgressChange(task.progress - 5)}
              disabled={task.progress <= 0}
              className={`px-2 py-1 text-xs border rounded ${
                task.progress <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
              }`}
            >
              <Minus size={14} />
            </button>
            <button
              onClick={() => onProgressChange(task.progress + 5)}
              disabled={task.progress >= 100}
              className={`px-2 py-1 text-xs border rounded ${
                task.progress >= 100 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
              }`}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}