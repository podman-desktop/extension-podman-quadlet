export const IGNORED_ANNOTATIONS: Set<string> = new Set([
  'io.container.manager',
  'org.opencontainers.image.stopSignal',
  'org.systemd.property.KillSignal',
  'org.systemd.property.TimeoutStopUSec',
]);

export const IGNORED_ENVIRONMENTS: Set<string> = new Set(['container', 'HOME', 'HOSTNAME']);
