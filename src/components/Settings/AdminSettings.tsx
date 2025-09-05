// Admin password configuration
const ADMIN_PASSWORD = "2529Salon7";
const AUTH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get the admin password
 * @returns The admin password string
 */
export function getAdminPassword(): string {
  return ADMIN_PASSWORD;
}

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