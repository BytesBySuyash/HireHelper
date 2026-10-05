import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Api, Auth, Challenge, errorMessage, User } from './core';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: ` <main class="auth-layout">
    <section class="auth-story">
      <a class="brand" routerLink="/">h<span>HireHelper</span></a>
      <div>
        <span class="eyebrow">GOOD NEIGHBOURS. GREAT POSSIBILITIES.</span>
        <h1>A little help.<br />A big difference.</h1>
        <p>
          Find a helping hand for your everyday tasks.<br />Or be that helping hand for someone
          nearby.
        </p>
        <div class="story-art" aria-hidden="true">
          <span>✦</span>
          <div class="art-card">A community built<br />one task at a time.</div>
        </div>
      </div>
      <small>An independent portfolio project. Local email goes to the Mailpit test inbox.</small>
    </section>
    <section class="auth-form">
      <div class="form-wrap">
        <a class="mobile-brand brand" routerLink="/">h<span>HireHelper</span></a
        ><span class="eyebrow">WELCOME TO YOUR COMMUNITY</span>
        <h2>
          {{
            challenge()
              ? 'Check your inbox'
              : resetAuthorization()
                ? 'Choose a new password'
                : mode === 'register'
                  ? 'Let’s get you started'
                  : mode === 'forgot'
                    ? 'Forgot your password?'
                    : 'Welcome back'
          }}
        </h2>
        <p class="muted">
          {{
            challenge()
              ? 'Enter the six-digit code. It expires after five minutes.'
              : mode === 'register'
                ? 'Create an account to post tasks and offer help.'
                : mode === 'forgot'
                  ? 'We’ll send a code if your address is eligible.'
                  : 'Sign in, then verify your email to continue.'
          }}
        </p>
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
        @if (auth.notice()) {
          <p class="message" role="status">{{ auth.notice() }}</p>
        }
        @if (challenge()) {
          <form [formGroup]="otp" (ngSubmit)="verify()">
            <mat-form-field
              ><mat-label>Verification code</mat-label
              ><input
                matInput
                formControlName="code"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
              /><mat-error>Enter six digits.</mat-error></mat-form-field
            ><button mat-flat-button [disabled]="busy() || otp.invalid">Verify code</button>
          </form>
          <p class="muted">Codes can be used once. Resending replaces the previous code.</p>
          <button mat-button [disabled]="busy() || DateNow() < resendAt" (click)="resend()">
            Resend code</button
          ><button mat-button (click)="challenge.set(null)">Start again</button>
        } @else if (resetAuthorization()) {
          <form [formGroup]="reset" (ngSubmit)="resetPassword()">
            <mat-form-field
              ><mat-label>New password</mat-label
              ><input
                matInput
                type="password"
                formControlName="password"
                autocomplete="new-password"
              /><mat-error>Use 12–128 characters.</mat-error></mat-form-field
            ><button mat-flat-button [disabled]="busy() || reset.invalid">Reset password</button>
          </form>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()">
            @if (mode === 'register') {
              <div class="form-row">
                <mat-form-field
                  ><mat-label>First name</mat-label
                  ><input
                    matInput
                    formControlName="firstName"
                    autocomplete="given-name" /></mat-form-field
                ><mat-form-field
                  ><mat-label>Last name</mat-label
                  ><input matInput formControlName="lastName" autocomplete="family-name"
                /></mat-form-field>
              </div>
            }
            <mat-form-field
              ><mat-label>Email address</mat-label
              ><input
                matInput
                type="email"
                formControlName="email"
                autocomplete="email"
              /><mat-error>Enter a valid email.</mat-error></mat-form-field
            >
            @if (mode !== 'forgot') {
              <mat-form-field
                ><mat-label>Password</mat-label
                ><input
                  matInput
                  type="password"
                  formControlName="password"
                  [autocomplete]="mode === 'register' ? 'new-password' : 'current-password'"
                /><mat-error>Use 12–128 characters.</mat-error></mat-form-field
              >
            }
            @if (mode === 'register') {
              <mat-form-field
                ><mat-label>Confirm password</mat-label
                ><input
                  matInput
                  type="password"
                  formControlName="passwordConfirmation"
                  autocomplete="new-password" /></mat-form-field
              ><mat-form-field
                ><mat-label>Phone (optional)</mat-label
                ><input matInput formControlName="phone" autocomplete="tel"
              /></mat-form-field>
            }
            <button mat-flat-button [disabled]="busy() || form.invalid">
              {{
                busy()
                  ? 'Please wait…'
                  : mode === 'register'
                    ? 'Create account'
                    : mode === 'forgot'
                      ? 'Send reset code'
                      : 'Continue with email'
              }}
            </button>
          </form>
          <div class="auth-links">
            @if (mode === 'login') {
              <a routerLink="/forgot">Forgot password?</a>
              <p>New here? <a routerLink="/register">Create an account</a></p>
            } @else {
              <a routerLink="/login">Back to sign in</a>
            }
          </div>
        }
        <p class="test-inbox">
          Local demo: open
          <a href="http://localhost:8025" target="_blank" rel="noopener">Mailpit test inbox</a> for
          your code. Email is captured locally.
        </p>
      </div>
    </section>
  </main>`,
})
export class AuthPage {
  api = inject(Api);
  auth = inject(Auth);
  router = inject(Router);
  fb = inject(FormBuilder);
  mode = this.router.url.split('?')[0].slice(1);
  busy = signal(false);
  error = signal('');
  challenge = signal<Challenge | null>(null);
  resetAuthorization = signal('');
  resendAt = 0;
  now = signal(Date.now());
  DateNow = () => this.now();
  form = this.fb.nonNullable.group({
    firstName: [''],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    passwordConfirmation: [''],
    phone: [''],
  });
  otp = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });
  reset = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
  });
  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
    if (this.mode !== 'forgot')
      this.form.controls.password.addValidators([
        Validators.required,
        Validators.minLength(12),
        Validators.maxLength(128),
      ]);
    if (this.mode === 'register') {
      for (const key of ['firstName', 'lastName', 'passwordConfirmation'] as const)
        this.form.controls[key].addValidators(Validators.required);
    }
  }
  async run(fn: () => Promise<void>) {
    this.busy.set(true);
    this.error.set('');
    try {
      await fn();
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
  async submit() {
    await this.run(async () => {
      const v = this.form.getRawValue();
      if (this.mode === 'register' && v.password !== v.passwordConfirmation)
        throw new Error('Passwords must match.');
      const dto =
        this.mode === 'register'
          ? v
          : this.mode === 'forgot'
            ? { email: v.email }
            : { email: v.email, password: v.password };
      this.challenge.set(
        await this.api.post<Challenge>(
          `auth/${this.mode === 'forgot' ? 'forgot' : this.mode}`,
          dto,
        ),
      );
      this.resendAt = Date.now() + 60000;
    });
  }
  async verify() {
    await this.run(async () => {
      const result = await this.api.post<{ user?: User; authorization?: string }>('auth/verify', {
        challengeId: this.challenge()!.challengeId,
        code: this.otp.getRawValue().code,
      });
      if (result.user) await this.auth.signedIn(result.user);
      else if (result.authorization) {
        this.resetAuthorization.set(result.authorization);
        this.challenge.set(null);
      }
    });
  }
  async resend() {
    await this.run(async () => {
      this.challenge.set(
        await this.api.post<Challenge>('auth/resend', {
          challengeId: this.challenge()!.challengeId,
        }),
      );
      this.resendAt = Date.now() + 60000;
      this.otp.reset();
    });
  }
  async resetPassword() {
    await this.run(async () => {
      await this.api.post('auth/reset', {
        authorization: this.resetAuthorization(),
        password: this.reset.getRawValue().password,
      });
      this.auth.notice.set('Password reset. Sign in with your new password.');
      await this.router.navigateByUrl('/login');
    });
  }
}
