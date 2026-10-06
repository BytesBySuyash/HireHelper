import { Component, inject, signal, Injectable } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import {
  DateAdapter,
  NativeDateAdapter,
  MAT_DATE_LOCALE,
  MAT_DATE_FORMATS,
} from '@angular/material/core';
import { Api, errorMessage, Task } from './core';
// Parse typed dates explicitly; Date.parse interprets ambiguous dates differently by browser.
@Injectable()
class TaskDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (value instanceof Date) return value;
    if (typeof value !== 'string' || !value.trim()) return null;
    const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
    if (!parts) return new Date(NaN);
    const [, day, month, year] = parts.map(Number);
    const result = new Date(year, month - 1, day);
    return result.getFullYear() === year &&
      result.getMonth() === month - 1 &&
      result.getDate() === day
      ? result
      : new Date(NaN);
  }
}
function timestamp(date: Date | null, time: Date | null): Date | null {
  if (
    !(date instanceof Date) ||
    !Number.isFinite(date.getTime()) ||
    !(time instanceof Date) ||
    !Number.isFinite(time.getTime())
  )
    return null;
  const hours = time.getHours(),
    minutes = time.getMinutes();
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
  // Reject a nonexistent local time during a daylight-saving transition.
  return value.getHours() === hours && value.getMinutes() === minutes ? value : null;
}
function schedule(control: AbstractControl) {
  const v = control.value;
  const start = timestamp(v.startDate, v.startTime);
  if (!start || start.getTime() <= Date.now())
    return { schedule: 'Choose a valid future start date and time.' };
  if (v.endDate || v.endTime) {
    const end = timestamp(v.endDate, v.endTime);
    if (!end) return { schedule: 'Enter both an end date and time, or leave both empty.' };
    if (end <= start) return { schedule: 'End time must follow start time.' };
  }
  return null;
}
@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatTimepickerModule,
  ],
  providers: [
    { provide: DateAdapter, useClass: TaskDateAdapter },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: { dateInput: null, timeInput: null },
        display: {
          timeInput: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
          timeOptionLabel: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
          dateInput: { day: '2-digit', month: '2-digit', year: 'numeric' },
          monthYearLabel: { month: 'short', year: 'numeric' },
          dateA11yLabel: { dateStyle: 'full' },
          monthYearA11yLabel: { month: 'long', year: 'numeric' },
        },
      },
    },
  ],
  template: ` <div class="page-heading">
      <div>
        <span class="eyebrow">TASK DETAILS</span>
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
            ><mat-label>Start date</mat-label>
            <input
              matInput
              [matDatepicker]="startPicker"
              formControlName="startDate"
              placeholder="DD/MM/YYYY"
            />
            <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker><mat-hint>DD/MM/YYYY</mat-hint>
            <mat-error>Enter a valid date as DD/MM/YYYY.</mat-error>
          </mat-form-field>
          <mat-form-field
            ><mat-label>Start time</mat-label
            ><input
              matInput
              [matTimepicker]="startTimePicker"
              [matTimepickerOpenOnClick]="false"
              formControlName="startTime"
              placeholder="HH:mm"
            />
            <mat-timepicker-toggle
              matIconSuffix
              [for]="startTimePicker"
              aria-label="Choose start time"
            ></mat-timepicker-toggle>
            <mat-timepicker
              #startTimePicker
              interval="15m"
              aria-label="Start time options"
            ></mat-timepicker>
            <mat-hint>HH:mm or use the clock button.</mat-hint
            ><mat-error>Enter a start time.</mat-error></mat-form-field
          >
        </div>
        <div class="form-row">
          <mat-form-field
            ><mat-label>End date (optional)</mat-label>
            <input
              matInput
              [matDatepicker]="endPicker"
              formControlName="endDate"
              placeholder="DD/MM/YYYY"
            />
            <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker><mat-hint>DD/MM/YYYY</mat-hint>
            <mat-error>Enter a valid date as DD/MM/YYYY.</mat-error>
          </mat-form-field>
          <mat-form-field
            ><mat-label>End time (optional)</mat-label
            ><input
              matInput
              [matTimepicker]="endTimePicker"
              [matTimepickerOpenOnClick]="false"
              formControlName="endTime"
              placeholder="HH:mm"
            />
            <mat-timepicker-toggle
              matIconSuffix
              [for]="endTimePicker"
              aria-label="Choose end time"
            ></mat-timepicker-toggle>
            <mat-timepicker
              #endTimePicker
              interval="15m"
              aria-label="End time options"
            ></mat-timepicker>
            <mat-hint>HH:mm or use the clock button.</mat-hint
            ><mat-error>Enter a valid time as HH:mm.</mat-error></mat-form-field
          >
        </div>
        @if (form.touched && form.errors?.['schedule']) {
          <p class="error" role="alert">{{ form.errors?.['schedule'] }}</p>
        }
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
  form = inject(FormBuilder).nonNullable.group(
    {
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: [
        '',
        [Validators.required, Validators.minLength(10), Validators.maxLength(3000)],
      ],
      location: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
      startDate: [null as Date | null, Validators.required],
      startTime: [null as Date | null, Validators.required],
      endDate: [null as Date | null],
      endTime: [null as Date | null],
    },
    { validators: schedule },
  );
  constructor() {
    if (this.id)
      void this.api
        .get<Task>(`tasks/${this.id}`)
        .then((t) => {
          const start = new Date(t.startAt),
            end = t.endAt ? new Date(t.endAt) : null;
          this.form.patchValue({
            title: t.title,
            description: t.description,
            location: t.location,
            startDate: start,
            startTime: start,
            endDate: end,
            endTime: end,
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
    if (this.busy()) return;
    this.form.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const v = this.form.getRawValue();
      if (this.file) this.imageId = (await this.api.upload(this.file, 'TASK')).id;
      const dto = {
        title: v.title,
        description: v.description,
        location: v.location,
        startAt: timestamp(v.startDate, v.startTime)!.toISOString(),
        endAt: v.endDate ? timestamp(v.endDate, v.endTime)!.toISOString() : undefined,
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
