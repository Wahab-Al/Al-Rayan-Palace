import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme';

describe('ThemeService', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset['theme'] = 'light';
    TestBed.configureTestingModule({});
  });

  it('restores the saved theme and applies it to the document', () => {
    window.localStorage.setItem('alrayan-theme', 'dark');

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('toggles the theme and persists the selection', () => {
    const service = TestBed.inject(ThemeService);

    service.toggle();

    expect(service.theme()).toBe('dark');
    expect(window.localStorage.getItem('alrayan-theme')).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');

    service.toggle();

    expect(service.theme()).toBe('light');
    expect(window.localStorage.getItem('alrayan-theme')).toBe('light');
  });
});