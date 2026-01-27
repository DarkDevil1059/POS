const AUTH_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * Set the last authentication time in local storage
 */
export function setLastAuthTime(): void {
  const now = Date.now();
  localStorage.setItem('lastAuthTime', now.toString());
}

/**
 * Check if the current time is within the authentication cooldown period
 * @returns Object with cooldown status and remaining time
 */
export function isWithinCooldown(): { isActive: boolean; remainingMs: number } {
  const lastAuthTime = localStorage.getItem('lastAuthTime');

  if (!lastAuthTime) {
    return { isActive: false, remainingMs: 0 };
  }

  const lastAuth = parseInt(lastAuthTime, 10);
  const now = Date.now();
  const elapsed = now - lastAuth;
  const remaining = AUTH_COOLDOWN_MS - elapsed;

  if (remaining > 0) {
    return { isActive: true, remainingMs: remaining };
  }

  return { isActive: false, remainingMs: 0 };
}

/**
 * Clear the authentication cooldown
 */
export function clearAuthCooldown(): void {
  localStorage.removeItem('lastAuthTime');
}

/**
 * Hash a password using SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
