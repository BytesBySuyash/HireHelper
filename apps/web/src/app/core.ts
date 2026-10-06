import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, Subject } from 'rxjs';
import { DEMO_MODE } from './demo-mode';
import { browserDemo, DEMO_EVENT } from './demo-store';
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  avatarId?: string;
}
export interface Task {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt?: string;
  imageId?: string;
  status: string;
  owner: User;
  assignment?: { helperId: string; helper: User; returnReason?: string };
  myRequest?: HelpRequest;
  contacts?: User[];
}
export interface HelpRequest {
  id: string;
  taskId: string;
  requesterId: string;
  message?: string;
  status: string;
  task: Task;
  requester: User;
}
export interface Notice {
  id: string;
  body: string;
  taskId?: string;
  readAt?: string;
  createdAt: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  unread?: number;
}
export interface Challenge {
  challengeId: string;
  expiresIn: number;
  resendAfter: number;
}
export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  const value = document.cookie
    .split('; ')
    .find((c) => c.startsWith('hh_csrf='))
    ?.split('=')
    .slice(1)
    .join('=');
  return next(
    value && !['GET', 'HEAD'].includes(req.method)
      ? req.clone({ setHeaders: { 'X-CSRF-Token': decodeURIComponent(value) } })
      : req,
  );
};
@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  readonly demo = DEMO_MODE;
  private demoStore = DEMO_MODE
    ? browserDemo(() => window.dispatchEvent(new Event(DEMO_EVENT)))
    : undefined;
  demoStatus() {
    return this.demoStore?.status();
  }
  refreshDemoSamples() {
    this.demoStore?.refreshSamples();
  }
  demoUsers() {
    return this.demoStore?.users() || [];
  }
  chooseDemo(id: string) {
    if (!this.demoStore) throw new Error('Sample accounts are available only in the static demo.');
    return this.demoStore.choose(id);
  }
  resetDemo() {
    this.demoStore?.reset();
  }
  image(id?: string) {
    return this.demoStore
      ? this.demoStore.image(id)
      : id
        ? `/api/v1/files/${id}`
        : 'task-fallback.svg';
  }
  get<T>(path: string) {
    if (this.demoStore) return this.demoStore.request('GET', path) as Promise<T>;
    return firstValueFrom(this.http.get<T>(`/api/v1/${path}`));
  }
  post<T>(path: string, body: unknown = {}) {
    if (this.demoStore) return this.demoStore.request('POST', path, body) as Promise<T>;
    return firstValueFrom(this.http.post<T>(`/api/v1/${path}`, body));
  }
  patch<T>(path: string, body: unknown) {
    if (this.demoStore) return this.demoStore.request('PATCH', path, body) as Promise<T>;
    return firstValueFrom(this.http.patch<T>(`/api/v1/${path}`, body));
  }
  delete<T>(path: string) {
    if (this.demoStore) return this.demoStore.request('DELETE', path) as Promise<T>;
    return firstValueFrom(this.http.delete<T>(`/api/v1/${path}`));
  }
  async upload(file: File, use: 'TASK' | 'AVATAR') {
    const form = new FormData();
    form.append('file', file);
    return this.post<{ id: string }>(`files?use=${use}`, form);
  }
}
export function errorMessage(e: unknown) {
  if (e instanceof HttpErrorResponse) {
    const message = e.error?.error?.message;
    return Array.isArray(message)
      ? message.join('. ')
      : message || 'Unable to connect. Please try again.';
  }
  return e instanceof Error ? e.message : 'Something went wrong. Please try again.';
}
@Injectable({ providedIn: 'root' })
export class Auth {
  api = inject(Api);
  router = inject(Router);
  user = signal<User | null>(null);
  notice = signal('');
  private events?: EventSource;
  refresh = new Subject<void>();
  unread = signal(0);
  notifications = signal<Notice[]>([]);
  private demoListening = false;
  async chooseDemo(id: string) {
    await this.signedIn(this.api.chooseDemo(id));
  }
  async resetDemo() {
    this.api.resetDemo();
    this.user.set(null);
    this.unread.set(0);
    this.notifications.set([]);
    await this.router.navigateByUrl('/login');
  }
  async init() {
    try {
      await this.api.get('auth/csrf');
    } catch {
      this.notice.set('Unable to reach the server. Refresh the page to retry.');
      return;
    }
    try {
      this.user.set(await this.api.get<User>('auth/me'));
      this.connect();
    } catch {
      this.user.set(null);
    }
  }
  async signedIn(user: User) {
    this.user.set(user);
    this.connect();
    await this.router.navigateByUrl('/feed');
  }
  async reconcile() {
    try {
      const p = await this.api.get<Page<Notice>>('notifications?limit=20');
      this.unread.set(p.unread || 0);
      this.notifications.set(p.items);
    } catch {
      /* Session guard handles access on next navigation. */
    }
  }
  connect() {
    this.events?.close();
    if (this.api.demo) {
      if (!this.demoListening) {
        const refresh = () => {
          void this.reconcile();
          this.refresh.next();
        };
        window.addEventListener(DEMO_EVENT, refresh);
        window.addEventListener('storage', refresh);
        this.demoListening = true;
      }
      void this.reconcile();
      this.refresh.next();
      return;
    }
    this.events = new EventSource('/api/v1/notifications/events');
    this.events.onopen = () => {
      void this.reconcile();
      this.refresh.next();
    };
    this.events.addEventListener('notification', () => {
      void this.reconcile();
      this.refresh.next();
    });
    this.events.onerror = () => {
      void this.api.get<User>('auth/me').catch((e) => {
        if (e instanceof HttpErrorResponse && e.status === 401) this.expired();
      });
    };
    void this.reconcile();
  }
  expired() {
    this.events?.close();
    this.user.set(null);
    this.notice.set('Your session expired. Please sign in again.');
    void this.router.navigateByUrl('/login');
  }
  async logout() {
    await this.api.post('auth/logout');
    this.events?.close();
    this.user.set(null);
    this.notifications.set([]);
    await this.router.navigateByUrl('/login');
  }
}
