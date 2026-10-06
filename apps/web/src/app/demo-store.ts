// Portfolio simulation only. This module is not an authentication/security boundary.
import type { User, Task, HelpRequest, Notice } from './core';

type StoredTask = Omit<Task, 'owner' | 'assignment' | 'myRequest' | 'contacts'> & {
  createdAt: string;
  helperId?: string;
  returnReason?: string;
};
type StoredRequest = Omit<HelpRequest, 'task' | 'requester'>;
type StoredNotice = Notice & { recipientId: string };
type Image = { data: string; ownerId: string; use: string };
type State = {
  version: 1;
  users: User[];
  tasks: StoredTask[];
  requests: StoredRequest[];
  notices: StoredNotice[];
  images: Record<string, Image>;
};
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const DATA_KEY = 'hirehelper:pages-demo:v1';
const SESSION_KEY = 'hirehelper:pages-demo:user';
export const DEMO_EVENT = 'hirehelper:demo-changed';

export class DemoStore {
  constructor(
    private data: StorageLike,
    private session: StorageLike,
    private changed: () => void = () => {},
    private id = () => crypto.randomUUID(),
  ) {}

  private seed(): State {
    const now = Date.now();
    const users: User[] = [
      { id: 'mira', firstName: 'Mira', lastName: 'Patel', email: 'mira@example.test' },
      { id: 'theo', firstName: 'Theo', lastName: 'Shah', email: 'theo@example.test' },
      { id: 'sam', firstName: 'Sam', lastName: 'Roy', email: 'sam@example.test' },
    ];
    const examples = [
      [
        'mira',
        'Help set up a community garden',
        'Arrange planters and prepare a small garden for our neighbourhood. Tools and refreshments provided.',
        'Koramangala',
      ],
      [
        'theo',
        'A helping hand with moving boxes',
        'Help carry a few light boxes to my new apartment. No heavy furniture or specialist equipment needed.',
        'Indiranagar',
      ],
      [
        'sam',
        'Teach the basics of spreadsheets',
        'Show me how to organize a simple monthly budget and create a few useful spreadsheet formulas.',
        'Whitefield',
      ],
      [
        'mira',
        'Sort books for the weekend book swap',
        'Group donated books by genre and help arrange the reading table before the community book swap.',
        'HSR Layout',
      ],
      [
        'theo',
        'Photograph our neighbourhood clean-up',
        'Take a few photographs at our volunteer event. A phone camera and a good eye are all you need.',
        'Jayanagar',
      ],
      [
        'sam',
        'Assemble a small bookshelf',
        'Help put together a flat-pack bookshelf. I have the instructions and all the basic tools ready.',
        'Bellandur',
      ],
    ];
    return {
      version: 1,
      users,
      tasks: examples.map(([ownerId, title, description, location], i) => ({
        id: `sample-${i + 1}`,
        ownerId,
        title,
        description,
        location,
        status: 'OPEN',
        startAt: new Date(now + (i + 2) * 86400000).toISOString(),
        createdAt: new Date(now - i * 3600000).toISOString(),
      })),
      requests: [
        {
          id: 'sample-request',
          taskId: 'sample-1',
          requesterId: 'theo',
          status: 'PENDING',
          message: 'Happy to help! I have experience with planting and garden layout.',
        },
      ],
      notices: [
        {
          id: 'sample-notice',
          recipientId: 'mira',
          taskId: 'sample-1',
          body: 'Theo offered to help with your community garden task.',
          createdAt: new Date(now).toISOString(),
        },
      ],
      images: {},
    };
  }
  private load(): State {
    try {
      const raw = this.data.getItem(DATA_KEY);
      if (raw) {
        const state = JSON.parse(raw) as State;
        if (
          state.version !== 1 ||
          !Array.isArray(state.users) ||
          !Array.isArray(state.tasks) ||
          !Array.isArray(state.requests) ||
          !Array.isArray(state.notices) ||
          !state.images
        )
          throw new Error('Unsupported demo data.');
        return state;
      }
      const state = this.seed();
      this.save(state, false);
      return state;
    } catch {
      throw new Error(
        'Demo storage is unavailable or damaged. Allow browser storage, or use Reset demo.',
      );
    }
  }
  private save(state: State, notify = true) {
    const serialized = JSON.stringify(state);
    if (serialized.length > 3000000)
      throw new Error('This demo is full. Reset the demo to clear your browser-local data.');
    try {
      this.data.setItem(DATA_KEY, serialized);
    } catch {
      throw new Error('Browser storage is full or unavailable. Try Reset demo or another browser.');
    }
    if (notify) this.changed();
  }
  users() {
    return this.load().users.map((u) => ({ ...u }));
  }
  choose(id: string): User {
    const user = this.load().users.find((u) => u.id === id);
    if (!user) throw new Error('Choose a sample account.');
    this.session.setItem(SESSION_KEY, id);
    return { ...user };
  }
  reset() {
    this.data.removeItem(DATA_KEY);
    this.session.removeItem(SESSION_KEY);
    this.load();
    this.changed();
  }
  image(id?: string) {
    return id ? this.load().images[id]?.data || 'task-fallback.svg' : 'task-fallback.svg';
  }
  private user(state: State) {
    const user = state.users.find((u) => u.id === this.session.getItem(SESSION_KEY));
    if (!user) throw new Error('Choose a sample account to continue.');
    return user;
  }
  private publicUser(state: State, id: string): User {
    const user = state.users.find((u) => u.id === id)!;
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarId: user.avatarId,
    };
  }
  private taskView(state: State, task: StoredTask, userId: string, detail = false): Task {
    const mine = state.requests.find((r) => r.taskId === task.id && r.requesterId === userId);
    return {
      ...task,
      owner: this.publicUser(state, task.ownerId),
      assignment: task.helperId
        ? {
            helperId: task.helperId,
            helper: this.publicUser(state, task.helperId),
            returnReason: task.returnReason,
          }
        : undefined,
      myRequest: mine ? ({ ...mine } as HelpRequest) : undefined,
      contacts:
        detail && task.helperId && [task.ownerId, task.helperId].includes(userId)
          ? state.users
              .filter((u) => [task.ownerId, task.helperId].includes(u.id))
              .map((u) => ({ ...u }))
          : undefined,
    };
  }
  private notify(state: State, recipientId: string, body: string, taskId: string) {
    state.notices.unshift({
      id: this.id(),
      recipientId,
      body,
      taskId,
      createdAt: new Date().toISOString(),
    });
    state.notices = state.notices.slice(0, 200);
  }
  private page<T>(items: T[], query: URLSearchParams) {
    const page = Math.max(1, Math.floor(Number(query.get('page')) || 1));
    const limit = Math.min(50, Math.max(1, Math.floor(Number(query.get('limit')) || 12)));
    return {
      items: items.slice((page - 1) * limit, page * limit),
      total: items.length,
      page,
      limit,
    };
  }
  private text(value: unknown, min: number, max: number, name: string) {
    if (typeof value !== 'string' || value.trim().length < min || value.length > max)
      throw new Error(`Enter a valid ${name}.`);
    return value.trim();
  }
  private taskInput(body: Record<string, unknown>, state: State, userId: string) {
    const startAt = String(body.startAt || ''),
      endAt = body.endAt ? String(body.endAt) : undefined;
    if (
      !Number.isFinite(Date.parse(startAt)) ||
      Date.parse(startAt) <= Date.now() ||
      (endAt && (!Number.isFinite(Date.parse(endAt)) || Date.parse(endAt) <= Date.parse(startAt)))
    )
      throw new Error('Choose a future start and an end after the start.');
    const imageId = body.imageId ? String(body.imageId) : undefined;
    if (
      imageId &&
      (state.images[imageId]?.ownerId !== userId || state.images[imageId]?.use !== 'TASK')
    )
      throw new Error('Image unavailable.');
    return {
      title: this.text(body.title, 3, 100, 'title'),
      description: this.text(body.description, 10, 3000, 'description'),
      location: this.text(body.location, 2, 160, 'location'),
      startAt,
      endAt,
      imageId,
    };
  }

  async request(method: string, path: string, input: unknown = {}): Promise<unknown> {
    const url = new URL(path, 'https://demo.invalid/');
    const route = url.pathname.replace(/^\//, '');
    if (route === 'auth/csrf') return {};
    if (route === 'auth/logout') {
      this.session.removeItem(SESSION_KEY);
      return { ok: true };
    }
    if (route === 'files' && method === 'POST')
      return this.upload(input as FormData, url.searchParams.get('use') || 'TASK');
    const state = this.load(),
      user = this.user(state);
    const body = input as Record<string, unknown>;
    const segments = route.split('/');
    const finish = (value: unknown) => {
      this.save(state);
      return structuredClone(value);
    };
    if (route === 'auth/me') return { ...user };
    if (route === 'auth/profile' && method === 'POST') {
      const avatarId = body.avatarId ? String(body.avatarId) : undefined;
      if (
        avatarId &&
        (state.images[avatarId]?.ownerId !== user.id || state.images[avatarId]?.use !== 'AVATAR')
      )
        throw new Error('Image unavailable.');
      Object.assign(user, {
        firstName: this.text(body.firstName, 1, 60, 'first name'),
        lastName: this.text(body.lastName, 1, 60, 'last name'),
        phone: this.text(body.phone || '', 0, 30, 'phone'),
        avatarId,
      });
      return finish(user);
    }
    if (route === 'dashboard')
      return {
        open: state.tasks.filter(
          (t) => t.status === 'OPEN' && t.ownerId !== user.id && Date.parse(t.startAt) > Date.now(),
        ).length,
        owned: state.tasks.filter(
          (t) => t.ownerId === user.id && !['COMPLETED', 'CANCELLED'].includes(t.status),
        ).length,
        received: state.requests.filter(
          (r) =>
            r.status === 'PENDING' &&
            state.tasks.some((t) => t.id === r.taskId && t.ownerId === user.id),
        ).length,
        assigned: state.tasks.filter(
          (t) => t.helperId === user.id && !['COMPLETED', 'CANCELLED'].includes(t.status),
        ).length,
      };
    if (segments[0] === 'notifications') {
      if (method === 'GET') {
        const all = state.notices.filter((n) => n.recipientId === user.id);
        return { ...this.page(all, url.searchParams), unread: all.filter((n) => !n.readAt).length };
      }
      for (const notice of state.notices)
        if (
          notice.recipientId === user.id &&
          (segments[1] === 'read-all' || notice.id === segments[1])
        )
          notice.readAt = new Date().toISOString();
      return finish({ ok: true });
    }
    if ((route === 'tasks' || route === 'tasks/mine') && method === 'GET') {
      const mine = route.endsWith('/mine');
      const search = (url.searchParams.get('search') || '').toLowerCase();
      const location = (url.searchParams.get('location') || '').toLowerCase();
      const tasks = state.tasks.filter((t) =>
        mine
          ? t.ownerId === user.id
          : t.ownerId !== user.id &&
            t.status === 'OPEN' &&
            Date.parse(t.startAt) > Date.now() &&
            `${t.title} ${t.description}`.toLowerCase().includes(search) &&
            t.location.toLowerCase().includes(location),
      );
      tasks.sort((a, b) =>
        mine || url.searchParams.get('sort') === 'newest'
          ? Date.parse(b.createdAt) - Date.parse(a.createdAt)
          : Date.parse(a.startAt) - Date.parse(b.startAt),
      );
      return this.page(
        tasks.map((t) => this.taskView(state, t, user.id)),
        url.searchParams,
      );
    }
    if (route === 'tasks' && method === 'POST') {
      if (state.tasks.length >= 100)
        throw new Error('Demo task limit reached. Reset the demo to start fresh.');
      const task: StoredTask = {
        ...this.taskInput(body, state, user.id),
        id: this.id(),
        ownerId: user.id,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      };
      state.tasks.unshift(task);
      return finish(this.taskView(state, task, user.id));
    }
    if (segments[0] === 'tasks') {
      const task = state.tasks.find((t) => t.id === segments[1]);
      if (!task) throw new Error('Task unavailable.');
      const owner = task.ownerId === user.id,
        helper = task.helperId === user.id;
      const history = state.requests.filter((r) => r.taskId === task.id);
      if (method === 'GET') {
        if (
          !owner &&
          !helper &&
          !history.some((r) => r.requesterId === user.id) &&
          (task.status !== 'OPEN' || Date.parse(task.startAt) <= Date.now())
        )
          throw new Error('Task unavailable.');
        return this.taskView(state, task, user.id, true);
      }
      if (method === 'PATCH' || method === 'DELETE') {
        if (!owner || task.status !== 'OPEN' || history.length)
          throw new Error(
            'Only open tasks without request history can be edited or deleted by their owner.',
          );
        if (method === 'DELETE') state.tasks = state.tasks.filter((t) => t.id !== task.id);
        else Object.assign(task, this.taskInput(body, state, user.id));
        return finish(this.taskView(state, task, user.id));
      }
      const action = segments[2];
      if (action === 'requests') {
        if (
          owner ||
          task.status !== 'OPEN' ||
          Date.parse(task.startAt) <= Date.now() ||
          history.some((r) => r.requesterId === user.id)
        )
          throw new Error('You cannot offer help for this task.');
        const request = {
          id: this.id(),
          taskId: task.id,
          requesterId: user.id,
          status: 'PENDING',
          message: this.text(body.message || '', 0, 1000, 'message'),
        };
        state.requests.push(request);
        this.notify(
          state,
          task.ownerId,
          `${user.firstName} offered to help with ${task.title}.`,
          task.id,
        );
        return finish(request);
      }
      if (action === 'cancel' && owner && ['OPEN', 'ASSIGNED'].includes(task.status)) {
        task.status = 'CANCELLED';
        for (const request of history)
          if (['PENDING', 'ACCEPTED'].includes(request.status)) {
            request.status = 'CANCELLED';
            this.notify(state, request.requesterId, `${task.title} was cancelled.`, task.id);
          }
      } else if (action === 'start' && helper && task.status === 'ASSIGNED') {
        task.status = 'IN_PROGRESS';
        this.notify(state, task.ownerId, `${user.firstName} started ${task.title}.`, task.id);
      } else if (action === 'complete-request' && helper && task.status === 'IN_PROGRESS') {
        task.status = 'COMPLETION_PENDING';
        this.notify(
          state,
          task.ownerId,
          `${user.firstName} requested completion of ${task.title}.`,
          task.id,
        );
      } else if (action === 'confirm' && owner && task.status === 'COMPLETION_PENDING') {
        task.status = 'COMPLETED';
        this.notify(state, task.helperId!, `${task.title} was confirmed complete.`, task.id);
      } else if (action === 'return' && owner && task.status === 'COMPLETION_PENDING') {
        task.returnReason = this.text(body.reason, 3, 1000, 'return reason');
        task.status = 'IN_PROGRESS';
        this.notify(state, task.helperId!, `${task.title} was returned to progress.`, task.id);
      } else throw new Error('This action is not available in the current task state.');
      return finish(this.taskView(state, task, user.id));
    }
    if (segments[0] === 'requests') {
      if (method === 'GET') {
        const requests = state.requests.filter((r) =>
          segments[1] === 'received'
            ? state.tasks.some((t) => t.id === r.taskId && t.ownerId === user.id)
            : r.requesterId === user.id &&
              (url.searchParams.get('assigned') !== 'true' || r.status === 'ACCEPTED'),
        );
        return this.page(
          requests.map((r) => ({
            ...r,
            requester: this.publicUser(state, r.requesterId),
            task: this.taskView(state, state.tasks.find((t) => t.id === r.taskId)!, user.id),
          })),
          url.searchParams,
        );
      }
      const request = state.requests.find((r) => r.id === segments[1]);
      const task = state.tasks.find((t) => t.id === request?.taskId);
      if (!request || !task || request.status !== 'PENDING' || task.status !== 'OPEN')
        throw new Error('Request unavailable.');
      const action = segments[2];
      if (action === 'withdraw' && request.requesterId === user.id) request.status = 'WITHDRAWN';
      else if (['accept', 'reject'].includes(action) && task.ownerId === user.id) {
        request.status = action === 'accept' ? 'ACCEPTED' : 'REJECTED';
        if (action === 'accept') {
          task.helperId = request.requesterId;
          task.status = 'ASSIGNED';
          for (const other of state.requests)
            if (other.taskId === task.id && other.id !== request.id && other.status === 'PENDING') {
              other.status = 'REJECTED';
              this.notify(
                state,
                other.requesterId,
                `Another helper was selected for ${task.title}.`,
                task.id,
              );
            }
        }
        this.notify(
          state,
          request.requesterId,
          `Your offer for ${task.title} was ${request.status.toLowerCase()}.`,
          task.id,
        );
      } else throw new Error('You cannot perform this request action.');
      return finish(request);
    }
    throw new Error(
      'This account-security feature requires the full server version. No real email is sent in this demo.',
    );
  }

  private async upload(form: FormData, use: string) {
    const file = form.get('file');
    if (
      !(file instanceof File) ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    )
      throw new Error('Choose a JPEG, PNG or WebP image up to 5 MiB.');
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error('Invalid image.');
    }
    if (bitmap.width * bitmap.height > 25000000) {
      bitmap.close();
      throw new Error('Image dimensions are too large.');
    }
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      throw new Error('Image preview is unavailable.');
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const state = this.load(),
      user = this.user(state),
      id = this.id();
    if (!['TASK', 'AVATAR'].includes(use)) throw new Error('Invalid image use.');
    state.images[id] = { data: canvas.toDataURL('image/webp', 0.75), ownerId: user.id, use };
    this.save(state);
    return { id };
  }
}
