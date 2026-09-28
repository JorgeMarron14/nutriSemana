import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tabs/planner' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'tabs',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'planner' },
      {
        path: 'planner',
        loadComponent: () => import('./pages/planner/planner.page').then((m) => m.PlannerPage),
      },
      {
        path: 'diets',
        loadComponent: () => import('./pages/diets/diets.page').then((m) => m.DietsPage),
      },
      {
        path: 'diets/preview',
        loadComponent: () => import('./pages/diets/diet-preview/diet-preview.page').then((m) => m.DietPreviewPage),
      },
      {
        path: 'diets/:id/edit',
        loadComponent: () => import('./pages/diets/diet-editor/diet-editor.page').then((m) => m.DietEditorPage),
      },
      {
        path: 'shopping-list',
        loadComponent: () => import('./pages/shopping-list/shopping-list.page').then((m) => m.ShoppingListPage),
      },
      {
        path: 'chat',
        loadComponent: () => import('./pages/chat/chat.page').then((m) => m.ChatPage),
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage),
      },
    ],
  },
  { path: '**', redirectTo: 'tabs/planner' },
];
