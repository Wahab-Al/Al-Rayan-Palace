import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/catalog/pages/home/home').then((m) => m.Home),
  },

  {
    path: 'products/:id',
    loadComponent: () =>
      import('./features/catalog/pages/product-details/product-details').then(
        (m) => m.ProductDetail,
      ),
  },

  {
    path: 'admin/login',
    loadComponent: () => import('./features/admin/pages/login/login').then((m) => m.Login),
  },

  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/pages/dashboard/dashboard').then((m) => m.Dashboard),
  },

  {
    path: 'admin/products/new',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/pages/product-form/product-form').then((m) => m.ProductForm),
  },

  {
    path: 'admin/products/:id/edit',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/pages/product-form/product-form').then((m) => m.ProductForm),
  },

  {
    path: 'admin/products',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/pages/products/products').then((m) => m.Products),
  },

  {
    path: '**',
    redirectTo: '',
  },
];
