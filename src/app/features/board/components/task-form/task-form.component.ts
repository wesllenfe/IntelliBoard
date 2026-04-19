import { Component, inject, input, output, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Task, TaskCreate, TaskUpdate, Priority, Column, AiSuggestion, Subtask } from '../../../../core/models/task.model';
import { TaskService } from '../../../../core/services/task.service';
import { GroqService } from '../../../../core/services/groq.service';

@Component({
  selector: 'app-task-form',
  imports: [FormsModule],
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.scss',
})
export class TaskFormComponent implements OnInit {
  private taskService = inject(TaskService);
  private groq = inject(GroqService);

  task = input<Task | null>(null);
  defaultColumn = input<Column>('todo');
  closed = output<void>();
  saved = output<void>();

  // ── Campos do formulário
  title = signal('');
  description = signal('');
  priority = signal<Priority>('media');
  category = signal('');
  deadline = signal('');
  subtasks = signal<Subtask[]>([]);

  // ── Estado da IA
  aiLoading = signal(false);
  aiSuggestion = signal<AiSuggestion | null>(null);
  aiError = signal<string | null>(null);
  userModified = signal(false);

  // ── Estado geral
  loading = signal(false);
  error = signal<string | null>(null);

  readonly priorities: Priority[] = ['baixa', 'media', 'alta'];

  readonly canAnalyze = computed(() => this.title().trim().length >= 3 && !this.task());
  readonly aiWasUsed = computed(() => this.aiSuggestion() !== null);

  ngOnInit() {
    const t = this.task();
    if (t) {
      this.title.set(t.title);
      this.description.set(t.description ?? '');
      this.priority.set(t.priority);
      this.category.set(t.category ?? '');
      this.deadline.set(t.deadline.slice(0, 10));
      this.subtasks.set(t.subtasks ? [...t.subtasks] : []);
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      this.deadline.set(tomorrow.toISOString().slice(0, 10));
    }
  }

  async analyzeWithAi() {
    const title = this.title().trim();
    if (!title || this.aiLoading()) return;

    this.aiLoading.set(true);
    this.aiError.set(null);

    try {
      const suggestion = await this.groq.analyzeTask(title);
      this.aiSuggestion.set(suggestion);
      this.userModified.set(false);

      // Preencher campos com sugestão
      this.description.set(suggestion.descricao);
      this.priority.set(suggestion.prioridade);
      this.category.set(suggestion.categoria);
      this.subtasks.set(suggestion.subtarefas.map(text => ({ text, done: false })));
    } catch {
      this.aiError.set('A IA não está disponível agora. Continue preenchendo manualmente.');
    } finally {
      this.aiLoading.set(false);
    }
  }

  markModified() {
    if (this.aiWasUsed()) this.userModified.set(true);
  }

  // ── Gerenciamento de subtarefas
  addSubtask() {
    this.subtasks.update(list => [...list, { text: '', done: false }]);
  }

  updateSubtask(index: number, text: string) {
    this.subtasks.update(list =>
      list.map((s, i) => i === index ? { ...s, text } : s)
    );
    this.markModified();
  }

  toggleSubtask(index: number) {
    this.subtasks.update(list =>
      list.map((s, i) => i === index ? { ...s, done: !s.done } : s)
    );
  }

  removeSubtask(index: number) {
    this.subtasks.update(list => list.filter((_, i) => i !== index));
    this.markModified();
  }

  private resolveAiAccepted(): boolean | null {
    if (!this.aiWasUsed()) return null;
    return !this.userModified();
  }

  async submit() {
    if (!this.title().trim()) {
      this.error.set('Título é obrigatório.');
      return;
    }
    if (!this.deadline()) {
      this.error.set('Deadline é obrigatório.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const cleanSubtasks = this.subtasks().filter(s => s.text.trim());

    try {
      const existing = this.task();
      if (existing) {
        const updates: TaskUpdate = {
          title: this.title().trim(),
          description: this.description().trim() || null,
          priority: this.priority(),
          category: this.category().trim() || null,
          deadline: this.deadline(),
          subtasks: cleanSubtasks.length ? cleanSubtasks : null,
        };
        if (this.aiWasUsed()) {
          updates.ai_suggestion_accepted = this.resolveAiAccepted();
          updates.ai_suggestion_original = this.aiSuggestion();
        }
        await this.taskService.updateTask(existing.id, updates);
      } else {
        const tasks = this.taskService.tasks();
        const colTasks = tasks.filter(t => t.status === this.defaultColumn());
        const payload: TaskCreate = {
          title: this.title().trim(),
          description: this.description().trim() || null,
          priority: this.priority(),
          category: this.category().trim() || null,
          deadline: this.deadline(),
          status: this.defaultColumn(),
          position: colTasks.length,
          subtasks: cleanSubtasks.length ? cleanSubtasks : null,
          ai_suggestion_accepted: this.resolveAiAccepted(),
          ai_suggestion_original: this.aiSuggestion(),
        };
        await this.taskService.createTask(payload);
      }
      this.saved.emit();
      this.closed.emit();
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Erro ao salvar tarefa.');
    } finally {
      this.loading.set(false);
    }
  }
}
