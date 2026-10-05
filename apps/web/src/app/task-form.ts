import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Api, errorMessage, Task } from './core';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: ` <div class="page-heading">
      <div>
        <span class="eyebrow">LET YOUR COMMUNITY LEND A HAND</span>
        <h1>{{ id ? 'Edit task' : 'Post a task' }}</h1>
        <p class="muted">Tell people what you need, where, and when.</p>
      </div>
      <a mat-button routerLink="/my-tasks">Back to my tasks</a>
    </div>
    <section class="form-panel">
      <form [formGroup]="form" (ngSubmit)="submit()">
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
        <mat-form-field
          ><mat-label>Task title</mat-label
          ><input matInput formControlName="title" maxlength="100" /><mat-hint
            >Make it clear and specific.</mat-hint
          ><mat-error>Use 3–100 characters.</mat-error></mat-form-field
        ><mat-form-field
          ><mat-label>What do you need help with?</mat-label
          ><textarea matInput formControlName="description" rows="5" maxlength="3000"></textarea
          ><mat-error>Use 10–3000 characters.</mat-error></mat-form-field
        ><mat-form-field
          ><mat-label>Location</mat-label
          ><input matInput formControlName="location" maxlength="160" /><mat-hint
            >Use a neighbourhood or public meeting place.</mat-hint
          ><mat-error>Enter a location.</mat-error></mat-form-field
        >
        <div class="form-row">
          <mat-form-field
            ><mat-label>Start date and time</mat-label
            ><input matInput type="datetime-local" formControlName="startAt" /><mat-error
              >Choose a future start.</mat-error
            ></mat-form-field
          ><mat-form-field
            ><mat-label>End date and time (optional)</mat-label
            ><input matInput type="datetime-local" formControlName="endAt"
          /></mat-form-field>
        </div>
        <p class="muted">
          Times use your device timezone: {{ timezone }}. Tasks leave the feed when the start time
          passes.
        </p>
        <label class="upload-label" for="task-image"
          >Task picture (optional) · JPEG, PNG, WebP · up to 5 MiB</label
        ><input
          id="task-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          (change)="select($event)"
        />
        @if (file) {
          <p>{{ file.name }}</p>
        }
        <div class="form-actions">
          <button mat-flat-button [disabled]="busy() || form.invalid">
            {{ busy() ? 'Saving…' : id ? 'Save changes' : 'Publish task' }}</button
          ><a mat-button routerLink="/my-tasks">Cancel</a>
        </div>
      </form>
    </section>`,
})
export class TaskForm {
  api = inject(Api);
  router = inject(Router);
  id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  busy = signal(false);
  error = signal('');
  file?: File;
  imageId?: string;
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(3000)]],
    location: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
    startAt: ['', Validators.required],
    endAt: [''],
  });
  constructor() {
    if (this.id)
      void this.api
        .get<Task>(`tasks/${this.id}`)
        .then((t) => {
          const local = (v: string) => {
            const d = new Date(v);
            return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          };
          this.form.patchValue({
            ...t,
            startAt: local(t.startAt),
            endAt: t.endAt ? local(t.endAt) : '',
          });
          this.imageId = t.imageId;
        })
        .catch((e) => this.error.set(errorMessage(e)));
  }
  select(event: Event) {
    this.file = (event.target as HTMLInputElement).files?.[0];
    if (this.file && this.file.size > 5 * 1024 * 1024) {
      this.error.set('Maximum image size is 5 MiB.');
      this.file = undefined;
    }
  }
  async submit() {
    this.busy.set(true);
    this.error.set('');
    try {
      const v = this.form.getRawValue();
      if (new Date(v.startAt) <= new Date()) throw new Error('Choose a future start time.');
      if (v.endAt && new Date(v.endAt) <= new Date(v.startAt))
        throw new Error('End time must follow start time.');
      if (this.file) this.imageId = (await this.api.upload(this.file, 'TASK')).id;
      const dto = {
        ...v,
        startAt: new Date(v.startAt).toISOString(),
        endAt: v.endAt ? new Date(v.endAt).toISOString() : undefined,
        imageId: this.imageId,
      };
      const task = this.id
        ? await this.api.patch<Task>(`tasks/${this.id}`, dto)
        : await this.api.post<Task>('tasks', dto);
      await this.router.navigate(['/tasks', task.id]);
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
