/**
 * Mock data for local development and testing without hitting the API.
 * Enabled via REVERSECENTAUR_MOCK_MODE=true.
 */

import type {
  CapabilitiesResponse,
  CancelTaskResponse,
  CheckTaskResponse,
  PostTaskInput,
  PostTaskResponse,
} from './types.js';

let mockTaskCounter = 0;
const mockTasks = new Map<string, { input: PostTaskInput; createdAt: string }>();

export function mockPostTask(input: PostTaskInput): PostTaskResponse {
  mockTaskCounter++;
  const taskId = `mock-task-${mockTaskCounter.toString().padStart(4, '0')}`;
  const now = new Date().toISOString();
  const deadline = new Date(
    Date.now() + (input.deadline_minutes ?? 1440) * 60_000,
  ).toISOString();

  mockTasks.set(taskId, { input, createdAt: now });

  return {
    task_id: taskId,
    status: 'posted',
    budget_usd: input.budget_usd,
    fair_trade_minimum_met: true,
    estimated_match_time_minutes: 15,
    deadline,
    created_at: now,
  };
}

export function mockCheckTask(taskId: string): CheckTaskResponse {
  const task = mockTasks.get(taskId);
  if (!task) {
    return {
      task_id: taskId,
      status: 'in_progress',
      worker_assigned: true,
      worker_started_at: new Date(Date.now() - 300_000).toISOString(),
      estimated_completion_minutes: 25,
      deadline: new Date(Date.now() + 3_600_000).toISOString(),
    };
  }

  return {
    task_id: taskId,
    status: 'completed',
    result: {
      format: task.input.deliverable_format ?? 'text',
      content:
        'This is a mock result. In production, this would contain the human worker\'s deliverable.',
      submitted_at: new Date().toISOString(),
    },
    worker: {
      rating: 4.8,
      tasks_completed: 42,
    },
    cost_usd: task.input.budget_usd,
    fair_trade_certified: true,
  };
}

export function mockListCapabilities(): CapabilitiesResponse {
  return {
    categories: [
      {
        id: 'verification',
        name: 'Verification & Fact-Checking',
        description: 'Confirm real-world facts, check that something is true, verify physical conditions',
        fair_trade_minimum_usd: 1.0,
        typical_range_usd: [1.0, 5.0],
        average_completion_minutes: 20,
        workers_available: 45,
      },
      {
        id: 'research',
        name: 'Research & Investigation',
        description: 'Gather information requiring human access, judgment, or real-world presence',
        fair_trade_minimum_usd: 5.0,
        typical_range_usd: [5.0, 50.0],
        average_completion_minutes: 120,
        workers_available: 32,
      },
      {
        id: 'physical_action',
        name: 'Physical Action',
        description: 'Do something in the physical world (delivery, inspection, on-site task)',
        fair_trade_minimum_usd: 10.0,
        typical_range_usd: [10.0, 100.0],
        average_completion_minutes: 90,
        workers_available: 21,
      },
      {
        id: 'creative_judgment',
        name: 'Creative Judgment',
        description: 'Subjective or aesthetic evaluation requiring human taste',
        fair_trade_minimum_usd: 5.0,
        typical_range_usd: [5.0, 75.0],
        average_completion_minutes: 60,
        workers_available: 28,
      },
      {
        id: 'data_validation',
        name: 'Data Validation',
        description: 'Validate data quality or truthfulness with human judgment',
        fair_trade_minimum_usd: 1.0,
        typical_range_usd: [1.0, 20.0],
        average_completion_minutes: 25,
        workers_available: 36,
      },
      {
        id: 'communication',
        name: 'Human Communication',
        description: 'Interact with people on behalf of an agent',
        fair_trade_minimum_usd: 5.0,
        typical_range_usd: [5.0, 60.0],
        average_completion_minutes: 45,
        workers_available: 24,
      },
      {
        id: 'legal_identity',
        name: 'Legal Identity Tasks',
        description: 'Tasks requiring legal-person identity (signing, notarization)',
        fair_trade_minimum_usd: 10.0,
        typical_range_usd: [10.0, 150.0],
        average_completion_minutes: 75,
        workers_available: 12,
      },
      {
        id: 'sensory_evaluation',
        name: 'Sensory Evaluation',
        description: 'Taste, smell, touch, and qualitative sensory inspection',
        fair_trade_minimum_usd: 5.0,
        typical_range_usd: [5.0, 80.0],
        average_completion_minutes: 50,
        workers_available: 18,
      },
      {
        id: 'other',
        name: 'Other Human Task',
        description: 'General human-in-the-loop task with broad requirements',
        fair_trade_minimum_usd: 3.0,
        typical_range_usd: [3.0, 40.0],
        average_completion_minutes: 40,
        workers_available: 22,
      },
    ],
    platform_status: 'operational',
    total_workers_online: 238,
    fair_trade_standard: 'v1.0',
    api_version: 'v1-mock',
  };
}

export function mockCancelTask(taskId: string, _reason?: string): CancelTaskResponse {
  mockTasks.delete(taskId);
  return {
    task_id: taskId,
    status: 'cancelled',
    refund_usd: 5.0,
    cancellation_fee_usd: 0,
    message: `Task ${taskId} cancelled successfully (mock mode).`,
  };
}
