import { Component, input, output, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Task } from '../../../../core/models/task.model';
import { PomodoroService } from '../../../../core/services/pomodoro.service';

@Component({
  selector: 'app-task-card',
  imports: [DatePipe],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss',
})
export class TaskCardComponent {
  private pomodoro = inject(PomodoroService);

  task = input.required<Task>();
  editClicked    = output<Task>();
  deleteClicked  = output<string>();
  pomodoroStart  = output<Task>();

  // Subtarefas
  subtaskTotal   = computed(() => this.task().subtasks?.length ?? 0);
  subtaskDone    = computed(() => this.task().subtasks?.filter(s => s.done).length ?? 0);
  subtaskPercent = computed(() => {
    const t = this.subtaskTotal();
    return t > 0 ? Math.round((this.subtaskDone() / t) * 100) : 0;
  });

  // Pomodoro
  isActivePomodoro = computed(() =>
    this.pomodoro.isActive() && this.pomodoro.activeTask()?.id === this.task().id
  );
  pomodoroOtherActive = computed(() =>
    this.pomodoro.isActive() && this.pomodoro.activeTask()?.id !== this.task().id
  );
  pomodoroTime = computed(() =>
    this.isActivePomodoro() ? this.pomodoro.formatTime(this.pomodoro.remaining()) : null
  );
  pomodoroRunning = computed(() => this.isActivePomodoro() && this.pomodoro.isRunning());

  isOverdue(): boolean {
    return new Date(this.task().deadline) < new Date();
  }
}
