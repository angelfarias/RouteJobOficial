// frontend/lib/env.ts
export function getApiUrl() {
  // Si hay variable pública, úsala (para Vercel)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Fallback razonable para desarrollo local
  return "http://localhost:3001";
}
