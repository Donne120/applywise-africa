export function formatDeadline(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getDaysLeftColor(days: number | null): string {
  if (days === null) return 'bar-red';
  if (days <= 30) return 'bar-orange';
  if (days <= 90) return 'bar-yellow';
  return 'bar-green';
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function calcDaysLeft(deadline: string): number | null {
  const now = new Date();
  const due = new Date(deadline);
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}
