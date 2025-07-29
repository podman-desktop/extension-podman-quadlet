/**
 * @author axel7083
 */

import { test, expect, assert } from 'vitest';
import { QuadletUnitParser } from './quadlet-unit-parser';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import { isTemplateQuadlet } from '/@shared/src/models/template-quadlet';
import { isServiceQuadlet } from '/@shared/src/models/service-quadlet';

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

const REQUIRES_EXAMPLE = `
# hello.container
[X-Container]
Image=nginx.image
PublishPort=8888:80

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
ExecStart=/usr/bin/podman run --name systemd-%N --cidfile=%t/%N.cid --replace --rm --cgroups=split --sdnotify=conmon -d --publish 8888:80 docker.io/library/nginx:latest

[Unit]
Wants=podman-user-wait-network-online.service
After=podman-user-wait-network-online.service
Requires=hello-world.image
SourcePath=/home/axel7083/.config/containers/systemd/hello.container
Requires=nginx-image.service
After=nginx-image.service
RequiresMountsFor=%t/containers
`;

const DUMMY_SERVICE_NAME = 'dummy.service';

const ENABLABLE_TEMPLATE_QUADLET_MOCK = `
[Unit]
Wants=podman-user-wait-network-online.service
After=podman-user-wait-network-online.service
Description=A templated sleepy container
SourcePath=/home/user/.config/containers/systemd/sleep-quadlet@.container
RequiresMountsFor=%t/containers

[X-Container]
Image=quay.io/fedora/fedora
Exec=sleep %i

[Service]
# Restart service when sleep finishes
Restart=always
Environment=PODMAN_SYSTEMD_UNIT=%n
KillMode=mixed
ExecStop=/usr/bin/podman rm -v -f -i --cidfile=%t/%N.cid
ExecStopPost=-/usr/bin/podman rm -v -f -i --cidfile=%t/%N.cid
Delegate=yes
Type=notify
NotifyAccess=all
SyslogIdentifier=%N
ExecStart=/usr/bin/podman run --name systemd-%p_%i --cidfile=%t/%N.cid --replace --rm --cgroups=split --sdnotify=conmon -d quay.io/fedora/fedora sleep %i

[Install]
WantedBy=multi-user.target
DefaultInstance=100
`;

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

test('expect requires to be properly parsed', async () => {
  const parser = new QuadletUnitParser(DUMMY_SERVICE_NAME, REQUIRES_EXAMPLE);
  const result = parser.parse();

  expect(result.requires).toStrictEqual(['hello-world.image', 'nginx-image.service']);
});

test('expect enablable template quadlet to have proper service name', () => {
  const parser = new QuadletUnitParser('sleep-quadlet@.service', ENABLABLE_TEMPLATE_QUADLET_MOCK);
  const result = parser.parse();

  assert(isTemplateQuadlet(result));
  assert(isServiceQuadlet(result));

  // the service name should be `<template>@<argument>.service`
  expect(result.service).toBe('sleep-quadlet@100.service');
  expect(result.template).toBe('sleep-quadlet');
  expect(result.enablable).toBeTruthy();
});
