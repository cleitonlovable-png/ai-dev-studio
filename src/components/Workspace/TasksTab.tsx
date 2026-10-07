import { useState } from "react";
import { ListTodo, Plus } from "lucide-react";
import type { Project } from "@/types/project";
import { useTasks } from "@/hooks/useTasks";
import { Card } from "@/components/common/Card";
import { TaskItem } from "./TaskItem";
import { NewTaskModal } from "./NewTaskModal";

interface TasksTabProps {
  project: Project;
}

export function TasksTab({ project }: TasksTabProps) {
  const { tasks, loading, addTask, toggleDone, removeTask } = useTasks(project.id);
  const [modalOpen, setModalOpen] = useState(false);

  const pending = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <Card
      title={`Tarefas (${pending.length} pendentes)`}
      action={
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-hover"
        >
          <Plus size={12} /> Nova
        </button>
      }
    >
      {loading ? (
        <p className="py-8 text-center text-sm text-muted">Carregando tarefas...</p>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <ListTodo size={22} className="text-muted" />
          <p className="text-sm text-muted">Nenhuma tarefa ainda.</p>
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          {pending.map((task) => (
            <TaskItem key={task.id} task={task} onToggle={toggleDone} onDelete={removeTask} />
          ))}
          {done.length > 0 && (
            <div className="pt-2">
              <p className="py-1 text-xs font-medium text-muted">Concluídas ({done.length})</p>
              {done.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={toggleDone} onDelete={removeTask} />
              ))}
            </div>
          )}
        </div>
      )}

      {modalOpen && <NewTaskModal onClose={() => setModalOpen(false)} onCreate={addTask} />}
    </Card>
  );
}
