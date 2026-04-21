/**
 * Returns the base URL for API calls.
 * - In development: empty string (Vite proxy handles /api/*)
 * - In production: VITE_API_URL environment variable (Railway backend URL)
 */
export const apiBase = (): string => {
  return (process.env.VITE_API_URL || '').replace(/\/$/, '');
};

export const apiUrl = (path: string): string => {
  return `${apiBase()}${path}`;
};
