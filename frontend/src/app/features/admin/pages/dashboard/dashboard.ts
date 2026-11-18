import { Component, inject } from '@angular/core';

import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  readonly user = this.authService.user;

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/admin/login']);
      },

      error: () => {
        this.authService.clearSession();

        this.router.navigate(['/admin/login']);
      },
    });
  }
}
