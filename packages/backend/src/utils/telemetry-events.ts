/**
 * @author axel7083
 */

export enum TelemetryEvents {
  // quadlet
  QUADLET_WRITE = 'quadlet-write',
  QUADLET_REMOVE = 'quadlet-remove',
  QUADLET_COLLECT = 'quadlet-collect',
  // systemd
  SYSTEMD_START = 'systemd-start',
  SYSTEMD_STOP = 'systemd-stop',
  SYSTEMD_RESTART = 'systemd-restart',
  // podlet
  PODLET_GENERATE = 'podlet-generate',
  PODLET_COMPOSE = 'podlet-compose',
}
