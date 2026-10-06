import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Auth, errorMessage } from './core';

@Component({
  standalone: true,
  imports: [MatButtonModule],
  template: `<main class="demo-entry">
    <a class="brand" href="#/login">h<span>HireHelper</span></a>
    <span class="eyebrow">A LITTLE HELP. A BIG DIFFERENCE.</span>
    <h1>Try a neighbourhood<br />built around helping.</h1>
    <p class="demo-intro">
      Explore the marketplace as a sample community member. Post a task, offer a hand, and follow
      the work through to completion.
    </p>
    <section class="demo-people" aria-label="Sample accounts">
      @for (person of auth.api.demoUsers(); track person.id) {
        <article>
          <div class="avatar">{{ person.firstName.charAt(0) }}</div>
          <h2>{{ person.firstName }} {{ person.lastName }}</h2>
          <p>{{ descriptions[person.id] }}</p>
          <button mat-flat-button [disabled]="busy()" (click)="enter(person.id)">
            Explore as {{ person.firstName }}
          </button>
        </article>
      }
    </section>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    <aside class="demo-explanation">
      <strong>Interactive portfolio demo</strong>
      <p>
        Sample accounts only. Changes stay in this browser; they are not shared with other visitors.
        No password is needed and no email is sent. Please use fictional details.
      </p>
      <p>
        Start as Mira to review Theo's existing offer, then switch to Theo to start and complete the
        work. Use the account selector above to explore both sides.
      </p>
    </aside>
  </main>`,
})
export class DemoEntry {
  auth = inject(Auth);
  busy = signal(false);
  error = signal('');
  descriptions: Record<string, string> = {
    mira: 'Organizing a community garden and a weekend book swap.',
    theo: 'Offering help with the garden and settling into a new home.',
    sam: 'Learning new skills and helping neighbours with everyday tasks.',
  };
  async enter(id: string) {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.chooseDemo(id);
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
