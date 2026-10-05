import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject, filter, interval, map, merge, takeUntil, finalize } from 'rxjs';
@Injectable()
export class Events {
  private bus = new Subject<{ recipient: string; data: object }>();
  private closures = new Subject<string>();
  publish(recipient: string, data: object) {
    this.bus.next({ recipient, data });
  }
  close(sessionId: string) {
    this.closures.next(sessionId);
  }
  stream(
    recipient: string,
    sessionId: string,
    valid: () => Promise<boolean>,
  ): Observable<MessageEvent> {
    const stop = new Subject<void>();
    const timer = setInterval(() => {
      void valid()
        .then((ok) => {
          if (!ok) stop.next();
        })
        .catch(() => stop.next());
    }, 15000);
    return merge(
      this.bus.pipe(
        filter((x) => x.recipient === recipient),
        map((x) => ({ data: x.data, type: 'notification' })),
      ),
      interval(15000).pipe(map(() => ({ data: { heartbeat: true }, type: 'heartbeat' }))),
    ).pipe(
      takeUntil(merge(stop, this.closures.pipe(filter((id) => id === sessionId)))),
      finalize(() => {
        clearInterval(timer);
        stop.complete();
      }),
    );
  }
}
