/**
 * Types for the Reverse Centaur MCP server.
 * Mirrors the API domain types.
 */

export const TASK_CATEGORIES = [
  'verification',
  'research',
  'physical_action',
  'creative_judgment',
  'data_validation',
  'communication',
  'legal_identity',
  'sensory_evaluation',
  'other',
] as const;

export const DELIVERABLE_FORMATS = [
  'text',
  'json',
  'image',
  'file',
  'confirmation',
] as const;

export const TASK_STATUSES = [
  'posted',
  'matching',
  'assigned',
  'in_progress',
  'proof_submitted',
  'completed',
  'expired',
  'disputed',
  'cancelled',
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type DeliverableFormat = (typeof DELIVERABLE_FORMATS)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface PostTaskInput {
  title: string;
  description: string;
  category: TaskCategory;
  budget_usd: number;
  deadline_minutes?: number;
  deliverable_format?: DeliverableFormat;
  callback_url?: string;
}

export interface PostTaskResponse {
  task_id: string;
  status: 'posted';
  budget_usd: number;
  fair_trade_minimum_met: true;
  estimated_match_time_minutes: number;
  deadline: string;
  created_at: string;
}

export interface TaskResult {
  format: DeliverableFormat;
  content: unknown;
  submitted_at: string;
}

export interface TaskWorkerSummary {
  rating: number;
  tasks_completed: number;
}

export interface CheckTaskResponse {
  task_id: string;
  status: TaskStatus;
  worker_assigned?: boolean;
  worker_started_at?: string;
  estimated_completion_minutes?: number;
  deadline?: string;
  result?: TaskResult;
  worker?: TaskWorkerSummary;
  cost_usd?: number;
  fair_trade_certified?: boolean;
}

export interface CancelTaskResponse {
  task_id: string;
  status: 'cancelled';
  refund_usd: number;
  cancellation_fee_usd: number;
  message: string;
}

export interface CapabilityCategory {
  id: TaskCategory;
  name: string;
  description: string;
  fair_trade_minimum_usd: number;
  typical_range_usd: [number, number];
  average_completion_minutes: number;
  workers_available: number;
}

export interface CapabilitiesResponse {
  categories: CapabilityCategory[];
  platform_status: 'operational' | 'degraded' | 'maintenance';
  total_workers_online: number;
  fair_trade_standard: string;
  api_version: string;
}

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  mockMode: boolean;
}
