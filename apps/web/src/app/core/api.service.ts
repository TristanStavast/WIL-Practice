import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  Comment,
  Issue,
  IssuePriority,
  IssueStatus,
  ProjectDetail,
  ProjectSummary,
  Role,
} from './models';

export interface IssueInput {
  title?: string;
  description?: string | null;
  status?: IssueStatus;
  priority?: IssuePriority;
  labels?: string[];
  assigneeId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // ---- Projects ---------------------------------------------------------
  listProjects(): Observable<ProjectSummary[]> {
    return this.http
      .get<{ projects: ProjectSummary[] }>('/api/projects')
      .pipe(map((r) => r.projects));
  }

  getProject(id: string): Observable<ProjectDetail> {
    return this.http
      .get<{ project: ProjectDetail }>(`/api/projects/${id}`)
      .pipe(map((r) => r.project));
  }

  createProject(input: {
    key: string;
    name: string;
    description?: string;
  }): Observable<ProjectSummary> {
    return this.http
      .post<{ project: ProjectSummary }>('/api/projects', input)
      .pipe(map((r) => r.project));
  }

  addMember(
    projectId: string,
    email: string,
    role: Role,
  ): Observable<ProjectDetail> {
    return this.http
      .post<{ project: ProjectDetail }>(`/api/projects/${projectId}/members`, {
        email,
        role,
      })
      .pipe(map((r) => r.project));
  }

  // ---- Issues -----------------------------------------------------------
  listIssues(projectId: string): Observable<Issue[]> {
    return this.http
      .get<{ issues: Issue[] }>(`/api/projects/${projectId}/issues`)
      .pipe(map((r) => r.issues));
  }

  createIssue(projectId: string, input: IssueInput): Observable<Issue> {
    return this.http
      .post<{ issue: Issue }>(`/api/projects/${projectId}/issues`, input)
      .pipe(map((r) => r.issue));
  }

  updateIssue(
    projectId: string,
    issueId: string,
    input: IssueInput,
  ): Observable<Issue> {
    return this.http
      .patch<{ issue: Issue }>(
        `/api/projects/${projectId}/issues/${issueId}`,
        input,
      )
      .pipe(map((r) => r.issue));
  }

  deleteIssue(projectId: string, issueId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/projects/${projectId}/issues/${issueId}`,
    );
  }

  // ---- Comments ---------------------------------------------------------
  listComments(projectId: string, issueId: string): Observable<Comment[]> {
    return this.http
      .get<{ comments: Comment[] }>(
        `/api/projects/${projectId}/issues/${issueId}/comments`,
      )
      .pipe(map((r) => r.comments));
  }

  addComment(
    projectId: string,
    issueId: string,
    body: string,
  ): Observable<Comment> {
    return this.http
      .post<{ comment: Comment }>(
        `/api/projects/${projectId}/issues/${issueId}/comments`,
        { body },
      )
      .pipe(map((r) => r.comment));
  }
}
