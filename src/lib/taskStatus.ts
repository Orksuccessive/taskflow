export const TASK_STATUSES = ["todo", "in-progress", "done"] as const;

export const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  todo: ["in-progress"],
  "in-progress": ["todo", "done"],
  done: ["in-progress"],
};

export function canTransitionStatus(currentStatus: string, nextStatus: string) {
  const normalizedCurrent = String(currentStatus ?? "").trim();
  const normalizedNext = String(nextStatus ?? "").trim();

  return Boolean(ALLOWED_STATUS_TRANSITIONS[normalizedCurrent]?.includes(normalizedNext));
}
