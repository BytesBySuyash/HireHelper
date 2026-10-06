import { Component, inject, signal } from '@angular/core';
import { Auth, errorMessage } from './core';

@Component({
  selector: 'app-demo-banner',
  standalone: true,
  template: `<section class="demo-banner" aria-label="Portfolio demo controls">
    <div>
      <strong>Portfolio demo</strong
      ><span>Sample accounts · browser-local data · no real email</span>
    </div>
    <label
      >Demo account
      <select [value]="auth.user()?.id || ''" [disabled]="busy()" (change)="switch($event)">
        <option value="" disabled>Choose a sample account</option>
        @for (person of auth.api.demoUsers(); track person.id) {
          <option [value]="person.id">{{ person.firstName }} {{ person.lastName }}</option>
        }
      </select>
    </label>
    <button type="button" [disabled]="busy()" (click)="reset()">Reset demo</button>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
  </section>`,
})
export class DemoBanner {
  auth = inject(Auth);
  busy = signal(false);
  error = signal('');
  async switch(event: Event) {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.chooseDemo((event.target as HTMLSelectElement).value);
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
  async reset() {
    if (!confirm("Reset this browser's demo tasks, pictures and profile changes?")) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.resetDemo();
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
