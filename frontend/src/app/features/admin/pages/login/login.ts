import { Component, inject, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-admin-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);

  private readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  readonly loading = signal(false);

  readonly error = signal<string | null>(null);

  readonly loginForm = this.fb.nonNullable.group({
    username: ['', Validators.required],

    password: ['', Validators.required],
  });

  submit(): void {
    this.error.set(null);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.error.set('Please enter username and password.');
      return;
    }

    this.loading.set(true);

    const { username, password } = this.loginForm.getRawValue();

    this.authService.login(username, password).subscribe({
      next: () => {
        this.loading.set(false);

        this.router.navigateByUrl('/admin');
      },

      error: (error) => {
        this.loading.set(false);

        this.error.set(error?.error?.message ?? 'Invalid username or password');
      },
    });
  }

  goHome(): void {
    this.router.navigateByUrl('/');
  }
}
