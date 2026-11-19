import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';

import { ThemeService, type ThemeMode } from '../services/theme';

export const ThemeStore = signalStore(
  { providedIn: 'root' },
  withState<{ theme: ThemeMode }>({ theme: 'light' }),
  withMethods((store, themeService = inject(ThemeService)) => {
    const setTheme = (nextTheme: ThemeMode): void => {
      patchState(store, { theme: nextTheme });
      themeService.applyTheme(nextTheme);
      themeService.persistTheme(nextTheme);
    };
    const initialize = (): void => {
      const theme = themeService.getInitialTheme();
      patchState(store, { theme });
      themeService.applyTheme(theme);
    };

    return {
      initialize,
      setTheme,
      toggle(): void {
        setTheme(store.theme() === 'dark' ? 'light' : 'dark');
      },
    };
  }),
  withHooks((store) => ({
    onInit(): void {
      store.initialize();
    },
  })),
);
