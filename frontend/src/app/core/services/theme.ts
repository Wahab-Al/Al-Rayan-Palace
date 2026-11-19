import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'alrayan-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  getInitialTheme(): ThemeMode {
    if (!isPlatformBrowser(this.platformId)) return 'light';

    try {
      const saved = this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // Fall through to the system preference when storage is unavailable.
    }

    return this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  applyTheme(theme: ThemeMode): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const root = this.document.documentElement;
    if (!root?.dataset || !root.style) return;

    root.dataset['theme'] = theme;
    root.style.colorScheme = theme;
  }

  persistTheme(theme: ThemeMode): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The theme remains usable when storage is unavailable.
    }
  }
}
