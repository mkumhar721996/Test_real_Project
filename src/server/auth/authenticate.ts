export interface AuthenticatedUser {
  token: string;
}

export function authenticateRequest(request: Request): AuthenticatedUser | null {
  const header = request.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) return null;

  return { token };
}
