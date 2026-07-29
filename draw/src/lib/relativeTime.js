/**
 * "Edited 3 minutes ago" strings for the drawing cards and the save indicator.
 * Deliberately matches the wording used by the homepage (index.html) so the two
 * lists read the same.
 */
export function relativeTime(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return '';
  const seconds = Math.round((Date.now() - then) / 1000);

  if (seconds < 45) return 'just now';
  if (seconds < 90) return 'a minute ago';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;

  const date = new Date(then);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
