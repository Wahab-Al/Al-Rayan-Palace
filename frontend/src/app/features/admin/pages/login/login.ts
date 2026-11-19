import { Component, computed, effect, inject, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router, RouterLink } from '@angular/router';

import { AuthStore } from '../../../../core/state/auth.store';

@Component({
  selector: 'app-admin-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);

  private readonly authStore = inject(AuthStore);

  private readonly router = inject(Router);

  private readonly validationError = signal<string | null>(null);
  readonly loading = computed(() => this.authStore.loginStatus() === 'pending');
  readonly error = computed(() => this.validationError() ?? this.authStore.loginError());

  readonly loginForm = this.fb.nonNullable.group({
    username: ['', Validators.required],

    password: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      if (this.authStore.loginStatus() === 'success') {
        void this.router.navigateByUrl('/admin');
      }
    });
  }

  submit(): void {
    this.validationError.set(null);
    this.authStore.resetLoginStatus();

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.validationError.set('Please enter username and password.');
      return;
    }

    const { username, password } = this.loginForm.getRawValue();
    this.authStore.login({ username, password });
  }

  goHome(): void {
    this.router.navigateByUrl('/');
  }
}
