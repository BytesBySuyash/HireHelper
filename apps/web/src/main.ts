import { bootstrapApplication } from '@angular/platform-browser';
import { Component, inject, provideAppInitializer } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { CanActivateFn, provideRouter, RouterOutlet, Router } from '@angular/router';
import { Auth, csrfInterceptor } from './app/core';
const guarded:CanActivateFn=()=>inject(Auth).user()?true:inject(Router).parseUrl('/login');
@Component({selector:'app-root',standalone:true,imports:[RouterOutlet],template:'<router-outlet />'})class App{}
bootstrapApplication(App,{providers:[provideHttpClient(withInterceptors([csrfInterceptor])),provideAppInitializer(()=>inject(Auth).init()),provideRouter([
  {path:'login',loadComponent:()=>import('./app/auth-page').then(m=>m.AuthPage)},
  {path:'register',loadComponent:()=>import('./app/auth-page').then(m=>m.AuthPage)},
  {path:'forgot',loadComponent:()=>import('./app/auth-page').then(m=>m.AuthPage)},
  {path:'',canActivate:[guarded],loadComponent:()=>import('./app/shell').then(m=>m.Shell),children:[
    {path:'feed',loadComponent:()=>import('./app/task-list').then(m=>m.TaskList)},
    {path:'my-tasks',loadComponent:()=>import('./app/task-list').then(m=>m.TaskList)},
    {path:'add-task',loadComponent:()=>import('./app/task-form').then(m=>m.TaskForm)},
    {path:'tasks/:id/edit',loadComponent:()=>import('./app/task-form').then(m=>m.TaskForm)},
    {path:'tasks/:id',loadComponent:()=>import('./app/task-detail').then(m=>m.TaskDetail)},
    {path:'requests',loadComponent:()=>import('./app/requests').then(m=>m.RequestsPage)},
    {path:'my-requests',loadComponent:()=>import('./app/requests').then(m=>m.RequestsPage)},
    {path:'settings',loadComponent:()=>import('./app/settings').then(m=>m.SettingsPage)},
    {path:'',pathMatch:'full',redirectTo:'feed'}
  ]},{path:'**',redirectTo:'feed'}
])]});
