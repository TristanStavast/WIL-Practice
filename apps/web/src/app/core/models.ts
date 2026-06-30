// Mirrors the API's response shapes. Kept deliberately small and explicit.

export type Role = 'OWNER' | 'COLLABORATOR';
export type IssueStatus =
  | 'BACKLOG'
  | 'TODO'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'DONE';
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const ISSUE_STATUSES: IssueStatus[] = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
];

export const ISSUE_PRIORITIES: IssuePriority[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
];

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface ProjectSummary {
  id: string;
  key: string;
  name: string;
  description: string | null;
  updatedAt: string;
  _count: { issues: number; memberships: number };
}

export interface Member {
  role: Role;
  user: User;
}

export interface ProjectDetail {
  id: string;
  key: string;
  name: string;
  description: string | null;
  createdAt: string;
  memberships: Member[];
}

export interface PersonRef {
  id: string;
  name: string;
}

export interface Issue {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  reporter: PersonRef;
  assignee: PersonRef | null;
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: PersonRef;
}
