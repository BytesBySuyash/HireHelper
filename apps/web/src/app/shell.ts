import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Auth } from './core';
@Component({
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, MatButtonModule, DatePipe],
  template: ` <a href="#main-content" class="skip-link">Skip to content</a>
    <div class="app-layout" [class.menu-open]="menu()" [class.sidebar-collapsed]="collapsed()">
      <aside class="sidebar">
        <a routerLink="/feed" class="brand" aria-label="HireHelper home">h<span>HireHelper</span></a
        ><span class="nav-label">YOUR WORKSPACE</span>
        <nav aria-label="Main navigation">
          @for (link of links; track link.path) {
            <a
              [routerLink]="link.path"
              [attr.aria-label]="link.label"
              routerLinkActive="active"
              (click)="menu.set(false)"
              ><span aria-hidden="true">{{ link.symbol }}</span
              ><span class="nav-text">{{ link.label }}</span></a
            >
          }
        </nav>
        <div class="sidebar-note">
          <span>✦</span>
          <h3>Post a task.<br />Offer help.</h3>
          <p>Manage tasks and offers from your workspace.</p>
          <a routerLink="/add-task">Post your first task →</a>
        </div>
        <div class="sidebar-user">
          <div class="avatar">{{ auth.user()?.firstName?.charAt(0) }}</div>
          <div>
            <strong>{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</strong
            ><small>Community member</small>
          </div>
        </div>
      </aside>
      @if (menu()) {
        <button
          class="menu-backdrop"
          aria-label="Close navigation"
          (click)="menu.set(false)"
        ></button>
      }
      <div class="workspace">
        <header class="topbar">
          <button
            mat-button
            class="menu-button"
            (click)="toggle()"
            [attr.aria-expanded]="menu() || !collapsed()"
            aria-label="Toggle navigation"
          >
            ☰</button
          ><span class="topbar-caption">Task assistance</span>
          <div class="topbar-actions">
            <button
              mat-button
              (click)="notices.set(!notices())"
              [attr.aria-expanded]="notices()"
              aria-label="Notifications"
            >
              Notifications <span class="count-badge">{{ auth.unread() }}</span>
            </button>
            <details class="user-menu">
              <summary>{{ auth.user()?.firstName }} ⌄</summary>
              <div>
                <a routerLink="/settings">Account settings</a
                ><button mat-button (click)="auth.logout()">Sign out</button>
              </div>
            </details>
          </div>
        </header>
        @if (notices()) {
          <section class="notification-panel" aria-label="Notifications">
            <div class="section-heading">
              <h3>Notifications</h3>
              <button mat-button (click)="markAll()">Mark all read</button>
            </div>
            @for (n of auth.notifications(); track n.id) {
              <a
                [routerLink]="n.taskId ? '/tasks/' + n.taskId : '/feed'"
                [class.unread]="!n.readAt"
                (click)="read(n.id)"
                >{{ n.body }}<small>{{ n.createdAt | date: 'short' }}</small></a
              >
            } @empty {
              <p class="muted">You’re all caught up.</p>
            }
          </section>
        }
        <main class="content" id="main-content"><router-outlet /></main>
        <footer>HireHelper · Portfolio project</footer>
      </div>
    </div>`,
})
export class Shell {
  auth = inject(Auth);
  menu = signal(false);
  collapsed = signal(false);
  notices = signal(false);
  toggle() {
    if (window.innerWidth > 850) this.collapsed.set(!this.collapsed());
    else this.menu.set(!this.menu());
  }
  links = [
    { path: '/feed', label: 'Feed', symbol: '▦' },
    { path: '/my-tasks', label: 'My Tasks', symbol: '□' },
    { path: '/requests', label: 'Requests', symbol: '↙' },
    { path: '/my-requests', label: 'My Requests', symbol: '↗' },
    { path: '/add-task', label: 'Add Task', symbol: '+' },
    { path: '/settings', label: 'Settings', symbol: '⚙' },
  ];
  async markAll() {
    await this.auth.api.post('notifications/read-all');
    await this.auth.reconcile();
  }
  async read(id: string) {
    await this.auth.api.post(`notifications/${id}/read`);
    await this.auth.reconcile();
    this.notices.set(false);
  }
}
