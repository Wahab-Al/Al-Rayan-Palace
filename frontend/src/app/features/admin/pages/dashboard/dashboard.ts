import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Router, RouterLink } from '@angular/router';

import { AuthStore } from '../../../../core/state/auth.store';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly authStore = inject(AuthStore);

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = this.authStore.user;

  logout(): void {
    this.authStore
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.router.navigate(['/admin/login']));
  }
}
