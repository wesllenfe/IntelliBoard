import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Task, TaskCreate, TaskUpdate, Column } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private supabase = inject(SupabaseService);

  private _tasks = signal<Task[]>([]);
  readonly tasks = this._tasks.asReadonly();

  async loadTasks() {
    const { data, error } = await this.supabase.supabase
      .from('tasks')
      .select('*')
      .order('position', { ascending: true });

    if (error) throw error;
    this._tasks.set(data ?? []);
  }

  async createTask(task: TaskCreate): Promise<Task> {
    const user = await this.supabase.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado. Faça login novamente para criar tarefas.');
    }

    const { data, error } = await this.supabase.supabase
      .from('tasks')
      .insert({ ...task, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    this._tasks.update(tasks => [...tasks, data]);
    return data;
  }

  async updateTask(id: string, updates: TaskUpdate): Promise<void> {
    const { error } = await this.supabase.supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    this._tasks.update(tasks =>
      tasks.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  }

  async deleteTask(id: string): Promise<void> {
    const { error } = await this.supabase.supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    this._tasks.update(tasks => tasks.filter(t => t.id !== id));
  }

  async moveTask(id: string, status: Column, position: number): Promise<void> {
    await this.updateTask(id, { status, position });
  }

  async reorderColumn(status: Column, orderedIds: string[]): Promise<void> {
    const updates = orderedIds.map((id, index) =>
      this.supabase.supabase
        .from('tasks')
        .update({ position: index, updated_at: new Date().toISOString() })
        .eq('id', id)
    );

    await Promise.all(updates);

    this._tasks.update(tasks =>
      tasks.map(t => {
        const idx = orderedIds.indexOf(t.id);
        return idx !== -1 && t.status === status ? { ...t, position: idx } : t;
      })
    );
  }
}
