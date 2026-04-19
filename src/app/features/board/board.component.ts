import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CdkDragDrop, CdkDrag, CdkDropList, CdkDropListGroup,
  moveItemInArray, transferArrayItem,
} from '@angular/cdk/drag-drop';

import { AuthService }          from '../../core/services/auth.service';
import { TaskService }           from '../../core/services/task.service';
import { PomodoroService }       from '../../core/services/pomodoro.service';
import { UserSettingsService }   from '../../core/services/user-settings.service';
import { Task, Column }          from '../../core/models/task.model';
import { BOARD_COLUMNS, BoardColumn } from '../../core/models/column.model';

import { TaskCardComponent }     from './components/task-card/task-card.component';
import { TaskFormComponent }     from './components/task-form/task-form.component';
import { PomodoroTimerComponent }    from './components/pomodoro-timer/pomodoro-timer.component';
import { PomodoroSettingsComponent } from './components/pomodoro-settings/pomodoro-settings.component';

@Component({
  selector: 'app-board',
  imports: [
    RouterLink,
    CdkDropListGroup, CdkDropList, CdkDrag,
    TaskCardComponent, TaskFormComponent,
    PomodoroTimerComponent, PomodoroSettingsComponent,
  ],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss',
})
export class BoardComponent implements OnInit {
  private auth         = inject(AuthService);
  private taskService  = inject(TaskService);
  readonly pomodoro    = inject(PomodoroService);
  private settingsSvc  = inject(UserSettingsService);

  readonly columns     = BOARD_COLUMNS;
  readonly tasks       = this.taskService.tasks;

  loading             = signal(true);
  showForm            = signal(false);
  editingTask         = signal<Task | null>(null);
  formColumn          = signal<Column>('todo');
  showPomodoroSettings = signal(false);

  columnTasks = computed(() => {
    const all = this.tasks();
    return (col: Column) =>
      all.filter(t => t.status === col).sort((a, b) => a.position - b.position);
  });

  inProgressCount = computed(() =>
    this.tasks().filter(t => t.status === 'in_progress').length
  );

  async ngOnInit() {
    try {
      await Promise.all([
        this.taskService.loadTasks(),
        this.settingsSvc.load(),
      ]);
      this.pomodoro.registerSettingsRef(this.settingsSvc);
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(col: Column) {
    this.editingTask.set(null);
    this.formColumn.set(col);
    this.showForm.set(true);
  }

  openEdit(task: Task) {
    this.editingTask.set(task);
    this.formColumn.set(task.status);
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingTask.set(null);
  }

  async deleteTask(id: string) {
    await this.taskService.deleteTask(id);
  }

  startPomodoro(task: Task) {
    void this.pomodoro.startFocus(task, this.settingsSvc.settings());
  }

  async drop(event: CdkDragDrop<Task[]>, targetColumn: Column) {
    const sourceColumn = event.previousContainer.data[event.previousIndex]?.status ?? targetColumn;

    if (event.previousContainer === event.container) {
      const colTasks = [...event.container.data];
      moveItemInArray(colTasks, event.previousIndex, event.currentIndex);
      await this.taskService.reorderColumn(targetColumn, colTasks.map(t => t.id));
    } else {
      const sourceTasks = [...event.previousContainer.data];
      const targetTasks = [...event.container.data];
      const moved = sourceTasks[event.previousIndex];
      transferArrayItem(sourceTasks, targetTasks, event.previousIndex, event.currentIndex);
      await this.taskService.moveTask(moved.id, targetColumn, event.currentIndex);
      await this.taskService.reorderColumn(sourceColumn, sourceTasks.map(t => t.id));
      await this.taskService.reorderColumn(targetColumn, targetTasks.map(t => t.id));
    }
  }

  signOut() { this.auth.signOut(); }
  colIds()  { return this.columns.map(c => c.id); }
}
