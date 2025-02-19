export type ServiceRestartPolicy =
  | 'no'
  | 'on-success'
  | 'on-failure'
  | 'on-abnormal'
  | 'on-watchdog'
  | 'on-abort'
  | 'always';

/**
 * Learn more https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
 */
export interface ServiceQuadlet {
  /**
   * Configures whether the service shall be restarted when the service process exits, is killed, or a timeout is reached.
   */
  Restart?: ServiceRestartPolicy;
}
