/* ===== Utility / helper functions ===== */

/**
 * Convert an ISO date string into a human-readable "time ago" string.
 */
export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/**
 * Format an ISO date string to a short date.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format an ISO date string to short date + time.
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Readable status label — replaces underscores with spaces and title-cases.
 */
export function statusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Valid complaint status transitions from current status.
 */
export function getComplaintTransitions(currentStatus: string, _role: string): string[] {
  switch (currentStatus) {
    case 'open':
      return ['under_review', 'investigating'];
    case 'under_review':
      return ['investigating', 'resolved'];
    case 'investigating':
      return ['resolved', 'under_review'];
    case 'resolved':
      return ['closed', 'rejected']; // only management can actually do this
    default:
      return [];
  }
}

/**
 * Valid ticket status transitions from current status.
 */
export function getTicketTransitions(currentStatus: string): string[] {
  switch (currentStatus) {
    case 'open':
      return ['in_progress', 'waiting_customer', 'resolved'];
    case 'in_progress':
      return ['waiting_customer', 'resolved', 'escalated_to_complaint'];
    case 'waiting_customer':
      return ['in_progress', 'resolved'];
    case 'resolved':
      return ['closed'];
    default:
      return [];
  }
}
