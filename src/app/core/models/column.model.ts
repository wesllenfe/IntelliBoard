import type { Column } from './task.model';

export interface BoardColumn {
  id: Column;
  label: string;
  color: string;
}

export const BOARD_COLUMNS: BoardColumn[] = [
  { id: 'todo', label: 'A fazer', color: 'var(--col-todo)' },
  { id: 'in_progress', label: 'Em andamento', color: 'var(--col-progress)' },
  { id: 'done', label: 'Concluído', color: 'var(--col-done)' },
];
