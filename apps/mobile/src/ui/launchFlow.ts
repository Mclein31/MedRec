export type LaunchKind = 'first-use' | 'returning';
type AuthStatus = 'loading' | 'offline' | 'signedOut' | 'signedIn';

/** Only a confirmed session gets the post-login arrival; OTP challenges remain on auth. */
export function launchPresentation({ startupComplete, completedUser, status, onboarded, userId }: {
  startupComplete: boolean;
  completedUser: string | null;
  status: AuthStatus;
  onboarded: boolean | null;
  userId: string | null;
}): { key: string; kind: LaunchKind | null; reason: 'startup' | 'sign-in'; done: boolean } | null {
  const ready = status !== 'loading' && onboarded !== null;
  if (!startupComplete) return {
    key: 'startup', kind: onboarded === true ? 'returning' : ready ? status === 'signedOut' && !onboarded ? 'first-use' : 'returning' : null,
    reason: 'startup', done: ready,
  };
  if (status === 'loading' || (status === 'signedIn' && userId !== null && userId !== completedUser)) {
    return { key: 'session', kind: 'returning', reason: 'sign-in', done: ready };
  }
  return null;
}

export const LAUNCH_DURATION = { 'first-use': 1640, returning: 720 } as const;
