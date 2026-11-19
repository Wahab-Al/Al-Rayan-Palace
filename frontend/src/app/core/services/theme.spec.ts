import { TestBed } from '@angular/core/testing';

import { ThemeStore } from '../state/theme.store';

describe('ThemeStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset['theme'] = 'light';
    TestBed.configureTestingModule({});
  });

  it('restores the saved theme and applies it to the document', () => {
    window.localStorage.setItem('alrayan-theme', 'dark');

    const store = TestBed.inject(ThemeStore);

    expect(store.theme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('toggles the theme and persists the selection', () => {
    const store = TestBed.inject(ThemeStore);

    store.toggle();

    expect(store.theme()).toBe('dark');
    expect(window.localStorage.getItem('alrayan-theme')).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');

    store.toggle();

    expect(store.theme()).toBe('light');
    expect(window.localStorage.getItem('alrayan-theme')).toBe('light');
  });
});
