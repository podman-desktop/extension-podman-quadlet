import type { RunError } from '@podman-desktop/api';

export function isRunError(error: unknown): error is RunError {
  // check err is an RunError
  return !(!error || typeof error !== 'object' || !('exitCode' in error));
}
