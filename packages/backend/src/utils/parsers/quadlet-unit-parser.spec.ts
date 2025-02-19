/**
 * @author axel7083
 */

import { test, expect } from 'vitest';
import { QuadletUnitParser } from './quadlet-unit-parser';
import { QuadletType } from '/@shared/src/utils/quadlet-type';

const CONTAINER_QUADLET_EXAMPLE = `
# demo-quadlet.container
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

const DUMMY_SERVICE_NAME = 'dummy.container';

test('expect path to be properly extracted', async () => {
  const parser = new QuadletUnitParser(DUMMY_SERVICE_NAME, CONTAINER_QUADLET_EXAMPLE);
  const result = parser.parse();

  expect(result).toStrictEqual(
    expect.objectContaining({
      path: '/home/user/.config/containers/systemd/nginx2.container',
      type: QuadletType.CONTAINER,
      service: DUMMY_SERVICE_NAME,
    }),
  );
});

test('expect content to be identical to input', async () => {
  const parser = new QuadletUnitParser(DUMMY_SERVICE_NAME, CONTAINER_QUADLET_EXAMPLE);
  const result = parser.parse();

  expect(result).toStrictEqual(
    expect.objectContaining({
      content: CONTAINER_QUADLET_EXAMPLE,
      service: DUMMY_SERVICE_NAME,
    }),
  );
});
