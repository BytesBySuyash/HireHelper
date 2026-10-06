import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth, errorMessage } from './core';

@Component({
  selector: 'app-demo-banner',
  standalone: true,
  imports: [RouterLink],
  template: `<section class="demo-banner" aria-label="Portfolio demo controls">
    <div>
      <strong>Interactive demo.</strong
      ><span>Changes stay in this browser. Use sample details.</span>
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
    @if (auth.api.demoStatus()?.temporary) {
      <p role="status">Storage is unavailable. This demo uses memory; reloading loses changes.</p>
    }
    @if (auth.api.demoStatus()?.error) {
      <p class="error" role="alert">{{ auth.api.demoStatus()?.error }}</p>
    }
    @if (auth.api.demoStatus()?.expired) {
      <p>
        Some sample listings have expired. Visitor tasks and active assignments are preserved.
        <button type="button" (click)="refreshSamples()">Refresh expired sample dates</button>
      </p>
    }
    @if (auth.user()) {
      <button type="button" (click)="guide.set(!guide())">
        {{ guide() ? 'Hide walkthrough' : 'Show walkthrough' }}
      </button>
      @if (guide()) {
        <aside class="demo-walkthrough" aria-label="Guided walkthrough">
          <strong
            >Garden walkthrough ·
            {{ auth.api.demoStatus()?.garden || 'Reset to restore example' }}</strong
          >
          <ol>
            <li>Choose Mira and <a routerLink="/requests">accept Theo’s garden offer</a>.</li>
            <li>
              Choose Theo,
              <a routerLink="/tasks/sample-1">start the garden task and request completion</a>.
            </li>
            <li>Choose Mira and <a routerLink="/tasks/sample-1">confirm completion</a>.</li>
          </ol>
          <p>
            Use the account selector above. Actions are yours to complete. Reset demo restores this
            example.
          </p>
        </aside>
      }
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
  </section>`,
})
export class DemoBanner {
  auth = inject(Auth);
  busy = signal(false);
  error = signal('');
  guide = signal(false);
  refreshSamples() {
    this.error.set('');
    try {
      this.auth.api.refreshDemoSamples();
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
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
