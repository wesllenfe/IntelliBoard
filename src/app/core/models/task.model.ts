export type Priority = 'baixa' | 'media' | 'alta';
export type Column = 'todo' | 'in_progress' | 'done';

export interface Subtask {
  text: string;
  done: boolean;
}

export interface AiSuggestion {
  prioridade: Priority;
  categoria: string;
  descricao: string;
  subtarefas: string[];
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  category: string | null;
  deadline: string;
  status: Column;
  position: number;
  subtasks: Subtask[] | null;
  ai_suggestion_accepted: boolean | null;
  ai_suggestion_original: AiSuggestion | null;
  created_at: string;
  updated_at: string;
}

export type TaskCreate = Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type TaskUpdate = Partial<TaskCreate>;
