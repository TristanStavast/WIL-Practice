import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import {
  Comment,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  Issue,
  IssuePriority,
  IssueStatus,
  ProjectDetail,
} from '../../core/models';

const STATUS_LABELS: Record<IssueStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
  DONE: 'Done',
};

@Component({
  selector: 'app-project-detail',
  imports: [FormsModule, DatePipe],
  templateUrl: './project-detail.component.html',
})
export class ProjectDetailComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  auth = inject(AuthService);

  readonly statuses = ISSUE_STATUSES;
  readonly priorities = ISSUE_PRIORITIES;
  readonly statusLabels = STATUS_LABELS;

  projectId = this.route.snapshot.paramMap.get('id')!;
  project = signal<ProjectDetail | null>(null);
  issues = signal<Issue[]>([]);
  loading = signal(true);

  // Kanban columns derived from the issue list.
  board = computed(() =>
    this.statuses.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      issues: this.issues().filter((i) => i.status === status),
    })),
  );

  isOwner = computed(() => {
    const me = this.auth.user()?.id;
    return (
      this.project()?.memberships.find((m) => m.user.id === me)?.role ===
      'OWNER'
    );
  });

  // --- Create issue modal ---
  showCreate = signal(false);
  newTitle = '';
  newPriority: IssuePriority = 'MEDIUM';
  newLabels = '';
  saving = signal(false);
  createError = signal<string | null>(null);

  // --- Issue detail modal ---
  selected = signal<Issue | null>(null);
  comments = signal<Comment[]>([]);
  newComment = '';
  detailError = signal<string | null>(null);

  // --- Members modal ---
  showMembers = signal(false);
  memberEmail = '';
  memberError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getProject(this.projectId).subscribe({
      next: (project) => this.project.set(project),
      error: () => this.router.navigate(['/projects']),
    });
    this.api.listIssues(this.projectId).subscribe({
      next: (issues) => {
        this.issues.set(issues);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ---- Create issue ----
  openCreate(): void {
    this.newTitle = '';
    this.newPriority = 'MEDIUM';
    this.newLabels = '';
    this.createError.set(null);
    this.showCreate.set(true);
  }

  createIssue(): void {
    if (this.saving() || !this.newTitle.trim()) return;
    this.saving.set(true);
    this.createError.set(null);
    const labels = this.newLabels
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);
    this.api
      .createIssue(this.projectId, {
        title: this.newTitle.trim(),
        priority: this.newPriority,
        labels,
      })
      .subscribe({
        next: (issue) => {
          this.issues.update((list) => [issue, ...list]);
          this.saving.set(false);
          this.showCreate.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.createError.set(
            err.error?.error?.message ?? 'Could not create issue.',
          );
        },
      });
  }

  // ---- Issue detail ----
  openIssue(issue: Issue): void {
    this.selected.set(issue);
    this.detailError.set(null);
    this.newComment = '';
    this.comments.set([]);
    this.api.listComments(this.projectId, issue.id).subscribe({
      next: (comments) => this.comments.set(comments),
    });
  }

  closeIssue(): void {
    this.selected.set(null);
  }

  patchIssue(changes: Partial<{ status: IssueStatus; priority: IssuePriority; assigneeId: string | null }>): void {
    const issue = this.selected();
    if (!issue) return;
    this.api.updateIssue(this.projectId, issue.id, changes).subscribe({
      next: (updated) => {
        this.selected.set(updated);
        this.issues.update((list) =>
          list.map((i) => (i.id === updated.id ? updated : i)),
        );
      },
      error: (err: HttpErrorResponse) =>
        this.detailError.set(err.error?.error?.message ?? 'Update failed.'),
    });
  }

  onStatusChange(value: string): void {
    this.patchIssue({ status: value as IssueStatus });
  }
  onPriorityChange(value: string): void {
    this.patchIssue({ priority: value as IssuePriority });
  }
  onAssigneeChange(value: string): void {
    this.patchIssue({ assigneeId: value || null });
  }

  deleteIssue(): void {
    const issue = this.selected();
    if (!issue || !confirm(`Delete issue #${issue.number}?`)) return;
    this.api.deleteIssue(this.projectId, issue.id).subscribe({
      next: () => {
        this.issues.update((list) => list.filter((i) => i.id === issue.id));
        this.selected.set(null);
      },
    });
  }

  addComment(): void {
    const issue = this.selected();
    if (!issue || !this.newComment.trim()) return;
    this.api.addComment(this.projectId, issue.id, this.newComment.trim()).subscribe({
      next: (comment) => {
        this.comments.update((list) => [...list, comment]);
        this.newComment = '';
      },
    });
  }

  // ---- Members ----
  openMembers(): void {
    this.memberEmail = '';
    this.memberError.set(null);
    this.showMembers.set(true);
  }

  addMember(): void {
    if (!this.memberEmail.trim()) return;
    this.memberError.set(null);
    this.api
      .addMember(this.projectId, this.memberEmail.trim(), 'COLLABORATOR')
      .subscribe({
        next: (project) => {
          this.project.set(project);
          this.memberEmail = '';
        },
        error: (err: HttpErrorResponse) =>
          this.memberError.set(
            err.error?.error?.message ?? 'Could not add member.',
          ),
      });
  }
}
