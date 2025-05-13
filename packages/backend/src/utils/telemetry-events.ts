/**
 * @author axel7083
 */

export enum TelemetryEvents {
  // quadlet
  QUADLET_WRITE = 'quadlet-write',
  QUADLET_REMOVE = 'quadlet-remove',
  // systemd
  SYSTEMD_START = 'systemd-start',
  SYSTEMD_STOP = 'systemd-stop',
  // podlet
  PODLET_GENERATE = 'podlet-generate',
  PODLET_COMPOSE = 'podlet-compose',
}
