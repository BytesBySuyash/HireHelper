import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Api, Auth, errorMessage, Page, Task } from './core';
@Component({
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    DatePipe,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  template: ` <div class="page-heading">
      <div>
        <span class="eyebrow">{{
          mine ? 'YOUR TASKS, ALL IN ONE PLACE' : 'FIND YOUR NEXT OPPORTUNITY TO HELP'
        }}</span>
        <h1>{{ mine ? 'My Tasks' : 'Hello, ' + auth.user()?.firstName + ' 👋' }}</h1>
        <p class="muted">
          {{
            mine
              ? 'Keep track of the tasks you’ve posted.'
              : 'A little time, a useful skill, a helping hand. Explore what’s happening nearby.'
          }}
        </p>
      </div>
      <a mat-flat-button routerLink="/add-task">+ Post a task</a>
    </div>
    <section class="stats" aria-label="Dashboard counts">
      <div>
        <span>Open opportunities</span><strong>{{ counts().open }}</strong>
      </div>
      <div>
        <span>My active tasks</span><strong>{{ counts().owned }}</strong>
      </div>
      <div>
        <span>Requests received</span><strong>{{ counts().received }}</strong>
      </div>
      <div>
        <span>Assigned to me</span><strong>{{ counts().assigned }}</strong>
      </div>
    </section>
    <div class="section-heading">
      <div>
        <h2>{{ mine ? 'Tasks you posted' : 'Community feed' }}</h2>
        <p class="muted">
          {{
            mine
              ? 'Active, completed and cancelled tasks.'
              : 'Open tasks from other community members.'
          }}
        </p>
      </div>
      <span class="results-count">{{ data().total }} tasks</span>
    </div>
    @if (!mine) {
      <form class="filters" [formGroup]="filters" (ngSubmit)="page = 1; load()">
        <mat-form-field
          ><mat-label>Search tasks</mat-label
          ><input
            matInput
            formControlName="search"
            placeholder="What would you like to help with?" /></mat-form-field
        ><mat-form-field
          ><mat-label>Location</mat-label
          ><input
            matInput
            formControlName="location"
            placeholder="Neighbourhood or city" /></mat-form-field
        ><mat-form-field
          ><mat-label>Sort by</mat-label
          ><mat-select formControlName="sort"
            ><mat-option value="soonest">Soonest first</mat-option
            ><mat-option value="newest">Newest first</mat-option></mat-select
          ></mat-form-field
        ><button mat-flat-button [disabled]="loading()">Search</button>
      </form>
    }
    @if (error()) {
      <div class="error" role="alert">
        {{ error() }} <button mat-button (click)="load()">Retry</button>
      </div>
    }
    @if (loading()) {
      <div class="task-grid" aria-busy="true" aria-label="Loading tasks">
        @for (n of [1, 2, 3]; track n) {
          <div class="skeleton"></div>
        }
      </div>
    } @else {
      <section class="task-grid" aria-label="Tasks">
        @for (task of data().items; track task.id) {
          <article class="task-card">
            <a [routerLink]="'/tasks/' + task.id" class="task-image"
              ><img
                [src]="task.imageId ? '/api/v1/files/' + task.imageId : '/task-fallback.svg'"
                alt=""
                loading="lazy"
                (error)="fallback($event)"
              /><span class="status" [class.closed]="task.status !== 'OPEN'">{{
                task.status.replaceAll('_', ' ')
              }}</span></a
            >
            <div class="task-card-body">
              <span class="location">⌖ {{ task.location }}</span>
              <h3>
                <a [routerLink]="'/tasks/' + task.id">{{ task.title }}</a>
              </h3>
              <p class="excerpt">{{ task.description }}</p>
              <div class="task-time">◷ {{ task.startAt | date: 'MMM d, y · h:mm a' }}</div>
              <div class="card-footer">
                <span>{{ task.owner.firstName }} {{ task.owner.lastName }}</span
                ><a [routerLink]="'/tasks/' + task.id">View task ↗</a>
              </div>
            </div>
          </article>
        } @empty {
          <div class="empty">
            <span>✦</span>
            <h3>{{ mine ? 'Your next task starts here' : 'No tasks found' }}</h3>
            <p>
              {{
                mine
                  ? 'Post a task and let the community lend a hand.'
                  : 'Try a different search or check back soon.'
              }}
            </p>
            <a mat-button routerLink="/add-task">Post a task</a>
          </div>
        }
      </section>
    }
    <div class="pagination">
      <button mat-button [disabled]="page === 1 || loading()" (click)="page = page - 1; load()">
        ← Previous</button
      ><span>Page {{ page }}</span
      ><button
        mat-button
        [disabled]="page * 12 >= data().total || loading()"
        (click)="page = page + 1; load()"
      >
        Next →
      </button>
    </div>`,
})
export class TaskList {
  api = inject(Api);
  auth = inject(Auth);
  mine = inject(Router).url.startsWith('/my-tasks');
  page = 1;
  loading = signal(true);
  error = signal('');
  data = signal<Page<Task>>({ items: [], total: 0, page: 1, limit: 12 });
  counts = signal({ open: 0, owned: 0, received: 0, assigned: 0 });
  filters = inject(FormBuilder).nonNullable.group({
    search: [''],
    location: [''],
    sort: ['soonest'],
  });
  constructor() {
    this.auth.refresh
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => void this.load());
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const q = new URLSearchParams({ ...this.filters.getRawValue(), page: String(this.page) });
      const [data, counts] = await Promise.all([
        this.api.get<Page<Task>>(`${this.mine ? 'tasks/mine' : 'tasks'}?${q}`),
        this.api.get<{ open: number; owned: number; received: number; assigned: number }>(
          'dashboard',
        ),
      ]);
      this.data.set(data);
      this.counts.set(counts);
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
  fallback(event: Event) {
    (event.target as HTMLImageElement).src = '/task-fallback.svg';
  }
}
