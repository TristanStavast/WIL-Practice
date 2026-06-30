import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../core/api.service';
import { ProjectSummary } from '../../core/models';

@Component({
  selector: 'app-projects',
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <h1>Your projects</h1>
      <button class="btn btn-primary" (click)="openCreate()">+ New project</button>
    </div>

    @if (loading()) {
      <div class="spinner">Loading…</div>
    } @else if (projects().length === 0) {
      <div class="empty">
        <p>No projects yet.</p>
        <button class="btn btn-primary" (click)="openCreate()">
          Create your first project
        </button>
      </div>
    } @else {
      <div class="grid">
        @for (p of projects(); track p.id) {
          <div class="card proj-card" (click)="open(p)">
            <span class="proj-key">{{ p.key }}</span>
            <h3>{{ p.name }}</h3>
            <div class="muted">{{ p.description || 'No description' }}</div>
            <div class="proj-meta">
              <span>{{ p._count.memberships }} issues</span>
              <span>{{ p._count.issues }} members</span>
            </div>
          </div>
        }
      </div>
    }

    @if (showCreate()) {
      <div class="modal-backdrop" (click)="closeCreate()">
        <form class="modal" (click)="$event.stopPropagation()" (ngSubmit)="create()">
          <div class="modal-head">
            <h2>New project</h2>
            <button type="button" class="btn btn-ghost btn-sm" (click)="closeCreate()">✕</button>
          </div>

          @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

          <div class="field">
            <label for="key">Key</label>
            <input id="key" name="key" class="input" [(ngModel)]="key"
                   placeholder="e.g. DEV" maxlength="8"
                   (input)="key = key.toUpperCase()" required />
            <small class="muted">2–8 uppercase letters/digits. Used to prefix issues.</small>
          </div>
          <div class="field">
            <label for="name">Name</label>
            <input id="name" name="name" class="input" [(ngModel)]="name" required />
          </div>
          <div class="field">
            <label for="desc">Description (optional)</label>
            <textarea id="desc" name="desc" class="textarea" [(ngModel)]="description"></textarea>
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            {{ saving() ? 'Creating…' : 'Create project' }}
          </button>
        </form>
      </div>
    }
  `,
})
export class ProjectsComponent {
  private api = inject(ApiService);
  private router = inject(Router);

  projects = signal<ProjectSummary[]>([]);
  loading = signal(true);

  showCreate = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  key = '';
  name = '';
  description = '';

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.listProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  open(p: ProjectSummary): void {
    this.router.navigate(['/projects', p.id]);
  }

  openCreate(): void {
    this.key = '';
    this.name = '';
    this.description = '';
    this.error.set(null);
    this.showCreate.set(true);
  }

  closeCreate(): void {
    this.showCreate.set(false);
  }

  create(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    this.api
      .createProject({
        key: this.key.trim(),
        name: this.name.trim(),
        description: this.description.trim() || undefined,
      })
      .subscribe({
        next: (project) => {
          this.saving.set(false);
          this.showCreate.set(false);
          this.router.navigate(['/projects', project.id]);
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.error.set(
            err.error?.error?.message ?? 'Could not create project.',
          );
        },
      });
  }
}
