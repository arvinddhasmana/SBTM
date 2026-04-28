/**
 * Centralised runtime configuration for the parent dashboard.
 *
 * VITE_API_URL must be set in the .env file (see .env.example).
 * Missing it causes a hard startup failure so misconfigured builds
 * are caught immediately rather than silently hitting localhost.
 */
const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) {
  throw new Error(
    'VITE_API_URL is not set. Add it to your .env file.\n' +
      'Example: VITE_API_URL=http://localhost:3001',
  );
}

export const API_BASE_URL: string = apiUrl;
