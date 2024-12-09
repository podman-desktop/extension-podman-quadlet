/**
 * @author axel7083
 */
import { test, expect } from 'vitest';
import { KeyMergeStrategies, parse, stringify } from 'js-ini';

// full example of an
const COMPLEX_SERVICE = `
[X-Container]
ContainerName=demo-quadlet-2
Image=nginx
PodmanArgs=--cgroups=enabled
PublishPort=8081:80

[Service]
Restart=always
Environment=PODMAN_SYSTEMD_UNIT=%n
KillMode=mixed
ExecStop=/usr/bin/podman rm -v -f -i --cidfile=%t/%N.cid
ExecStopPost=-/usr/bin/podman rm -v -f -i --cidfile=%t/%N.cid
Delegate=yes
Type=notify
NotifyAccess=all
SyslogIdentifier=%N
ExecStart=/usr/bin/podman run --name=demo-quadlet-2 --cidfile=%t/%N.cid --replace --rm --cgroups=split --sdnotify=conmon -d --publish 8081:80 --cgroups=enabled nginx

[Install]
WantedBy=default.target

[Unit]
Wants=network-online.target
After=network-online.target
SourcePath=/home/user/.config/containers/systemd/nginx2.container
RequiresMountsFor=%t/containers
`;

// comments such as # are very common
const COMMENTS_EXAMPLE = `
# demo-quadlet.container
[X-Container]
ContainerName=demo-quadlet-2
Image=nginx
PodmanArgs=--cgroups=enabled
PublishPort=8081:80
`;

// basic example
const SIMPLE_EXAMPLE = `
[X-Container]
ContainerName=demo-quadlet-2
Image=nginx
PodmanArgs="--cgroups=enabled"
PublishPort=8081:80
`;

const DUPLICATE_KEY_EXAMPLE = `
[X-Container]
ContainerName=demo-quadlet-2
Image=nginx
PodmanArgs=--cgroups=enabled
PublishPort=8081:80
Annotation=hello=world
Annotation=world=hello
`;

test('expect COMPLEX_SERVICE to be parsed to be parsed properly', () => {
  const ini = parse(COMPLEX_SERVICE);
  expect(ini).toHaveProperty('X-Container');
  expect(ini).toHaveProperty('Service');
  expect(ini).toHaveProperty('Install');
  expect(ini).toHaveProperty('Unit');

  expect(ini['X-Container']).toEqual({
    ContainerName: 'demo-quadlet-2',
    Image: 'nginx',
    PodmanArgs: '--cgroups=enabled',
    PublishPort: '8081:80',
  });

  expect(ini['Service']).toEqual({
    Delegate: 'yes',
    Environment: 'PODMAN_SYSTEMD_UNIT=%n',
    ExecStart:
      '/usr/bin/podman run --name=demo-quadlet-2 --cidfile=%t/%N.cid --replace --rm --cgroups=split --sdnotify=conmon -d --publish 8081:80 --cgroups=enabled nginx',
    ExecStop: '/usr/bin/podman rm -v -f -i --cidfile=%t/%N.cid',
    ExecStopPost: '-/usr/bin/podman rm -v -f -i --cidfile=%t/%N.cid',
    KillMode: 'mixed',
    NotifyAccess: 'all',
    Restart: 'always',
    SyslogIdentifier: '%N',
    Type: 'notify',
  });

  expect(ini['Install']).toEqual({
    WantedBy: 'default.target',
  });

  expect(ini['Unit']).toEqual({
    After: 'network-online.target',
    RequiresMountsFor: '%t/containers',
    SourcePath: '/home/user/.config/containers/systemd/nginx2.container',
    Wants: 'network-online.target',
  });
});

test('expect COMMENTS_EXAMPLE to be parsed properly', () => {
  const ini = parse(COMMENTS_EXAMPLE, {
    comment: [';', '#'],
  });
  expect(ini).toEqual({
    'X-Container': {
      ContainerName: 'demo-quadlet-2',
      Image: 'nginx',
      PodmanArgs: '--cgroups=enabled',
      PublishPort: '8081:80',
    },
  });
});

test('expect identity operation to keep all data', () => {
  const ini = parse(SIMPLE_EXAMPLE);
  const raw = stringify(ini);

  expect(raw.trim()).toBe(SIMPLE_EXAMPLE.trim());
});

test('expect duplicate key to be merged as an array', () => {
  const ini = parse(DUPLICATE_KEY_EXAMPLE, {
    keyMergeStrategy: KeyMergeStrategies.JOIN_TO_ARRAY,
  });
  expect(ini).toEqual({
    'X-Container': {
      ContainerName: 'demo-quadlet-2',
      Annotation: ['hello=world', 'world=hello'],
      Image: 'nginx',
      PodmanArgs: '--cgroups=enabled',
      PublishPort: '8081:80',
    },
  });
});
