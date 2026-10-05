import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Api, Auth, errorMessage, Task } from './core';
@Component({
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  template: ` <a routerLink="/feed" class="back-link">← Back to feed</a>
    @if (error()) {
      <p class="error" role="alert">
        {{ error() }} <button mat-button (click)="load()">Retry</button>
      </p>
    }
    @if (task(); as t) {
      <div class="page-heading">
        <div>
          <span class="eyebrow">TASK DETAILS</span>
          <h1>{{ t.title }}</h1>
          <p class="muted">Posted by {{ t.owner.firstName }} {{ t.owner.lastName }}</p>
        </div>
        <span class="status">{{ t.status.replaceAll('_', ' ') }}</span>
      </div>
      <div class="detail-grid">
        <article class="detail-panel">
          <img
            class="detail-image"
            [src]="t.imageId ? '/api/v1/files/' + t.imageId : '/task-fallback.svg'"
            alt="Task picture"
          />
          <h2>About this task</h2>
          <p class="description">{{ t.description }}</p>
          <div class="detail-meta">
            <div>
              <span>Location</span><strong>{{ t.location }}</strong>
            </div>
            <div>
              <span>Starts</span><strong>{{ t.startAt | date: 'medium' }}</strong>
            </div>
            @if (t.endAt) {
              <div>
                <span>Ends</span><strong>{{ t.endAt | date: 'medium' }}</strong>
              </div>
            }
          </div>
          @if (t.contacts?.length) {
            <h3>Participant contact details</h3>
            @for (c of t.contacts; track c.id) {
              <p>
                {{ c.firstName }} {{ c.lastName }} · {{ c.email }}
                @if (c.phone) {
                  · {{ c.phone }}
                }
              </p>
            }
          }
          @if (t.assignment?.returnReason) {
            <p class="message">Owner’s return reason: {{ t.assignment?.returnReason }}</p>
          }
        </article>
        <aside class="action-panel">
          <h3>
            {{
              owner() ? 'Manage your task' : helper() ? 'Your assigned work' : 'Lend a helping hand'
            }}
          </h3>
          @if (t.assignment) {
            <p>
              Assigned to {{ t.assignment.helper.firstName }} {{ t.assignment.helper.lastName }}
            </p>
          }
          @if (!owner() && !helper() && t.status === 'OPEN' && !t.myRequest) {
            <form [formGroup]="requestForm" (ngSubmit)="request()">
              <mat-form-field
                ><mat-label>Message (optional)</mat-label
                ><textarea
                  matInput
                  rows="4"
                  formControlName="message"
                  maxlength="1000"
                ></textarea></mat-form-field
              ><button mat-flat-button [disabled]="busy()">Offer to help</button>
            </form>
            <p class="muted">
              One helper is selected. Contact details become available after assignment.
            </p>
          }
          @if (t.myRequest) {
            <p>
              Your request: <strong>{{ t.myRequest.status }}</strong>
            </p>
            @if (t.myRequest.status === 'PENDING') {
              <button mat-button [disabled]="busy()" (click)="withdraw()">Withdraw request</button>
            }
          }
          @if (helper() && t.status === 'ASSIGNED') {
            <button mat-flat-button [disabled]="busy()" (click)="action('start')">
              Start work
            </button>
          }
          @if (helper() && t.status === 'IN_PROGRESS') {
            <button mat-flat-button [disabled]="busy()" (click)="action('complete-request')">
              Request completion
            </button>
          }
          @if (owner() && t.status === 'COMPLETION_PENDING') {
            <button mat-flat-button [disabled]="busy()" (click)="action('confirm')">
              Confirm completion
            </button>
            <form [formGroup]="returnForm" (ngSubmit)="action('return', returnForm.getRawValue())">
              <mat-form-field
                ><mat-label>Reason to return to progress</mat-label
                ><textarea matInput formControlName="reason" rows="3"></textarea></mat-form-field
              ><button mat-button [disabled]="busy() || returnForm.invalid">
                Return to progress
              </button>
            </form>
          }
          @if (owner() && t.status === 'OPEN') {
            <a mat-button [routerLink]="'/tasks/' + t.id + '/edit'">Edit task</a
            ><button mat-button [disabled]="busy()" (click)="remove()">Delete task</button>
            <p class="muted">Editing and deletion require no request history.</p>
          }
          @if (owner() && ['OPEN', 'ASSIGNED'].includes(t.status)) {
            <button mat-button [disabled]="busy()" (click)="action('cancel')">Cancel task</button>
          }
          <p class="muted">
            Cancellation is available before work begins. Completed and cancelled tasks are final.
          </p>
        </aside>
      </div>
    } @else if (!error()) {
      <div class="skeleton" aria-label="Loading task" aria-busy="true"></div>
    }`,
})
export class TaskDetail {
  api = inject(Api);
  auth = inject(Auth);
  router = inject(Router);
  id = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  task = signal<Task | null>(null);
  error = signal('');
  busy = signal(false);
  requestForm = inject(FormBuilder).nonNullable.group({ message: [''] });
  returnForm = inject(FormBuilder).nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(1000)]],
  });
  owner = () => this.task()?.ownerId === this.auth.user()?.id;
  helper = () => this.task()?.assignment?.helperId === this.auth.user()?.id;
  constructor() {
    const destroy = inject(DestroyRef);
    this.auth.refresh.pipe(takeUntilDestroyed(destroy)).subscribe(() => void this.load());
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed(destroy))
      .subscribe((params) => {
        this.id = params.get('id')!;
        this.task.set(null);
        void this.load();
      });
  }
  async load() {
    try {
      this.task.set(await this.api.get<Task>(`tasks/${this.id}`));
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
  async run(fn: () => Promise<unknown>) {
    this.busy.set(true);
    this.error.set('');
    try {
      await fn();
      await this.load();
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
  request() {
    return this.run(() =>
      this.api.post(`tasks/${this.id}/requests`, this.requestForm.getRawValue()),
    );
  }
  withdraw() {
    return this.run(() => this.api.post(`requests/${this.task()!.myRequest!.id}/withdraw`));
  }
  action(action: string, dto: unknown = {}) {
    if (
      ['cancel', 'confirm'].includes(action) &&
      !confirm(
        action === 'cancel'
          ? 'Cancel this task and close pending requests?'
          : 'Confirm that this task is completed?',
      )
    )
      return;
    return this.run(() => this.api.post(`tasks/${this.id}/${action}`, dto));
  }
  remove() {
    if (!confirm('Delete this task? This action cannot be undone.')) return;
    return this.run(async () => {
      await this.api.delete(`tasks/${this.id}`);
      await this.router.navigateByUrl('/my-tasks');
    });
  }
}
