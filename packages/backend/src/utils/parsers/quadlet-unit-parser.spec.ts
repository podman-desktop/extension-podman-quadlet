/**
 * @author axel7083
 */

import { test, expect, assert, describe } from 'vitest';
import { QuadletUnitParser } from './quadlet-unit-parser';
import { QuadletType, isTemplateQuadlet, isServiceQuadlet } from '@podman-desktop/quadlet-extension-core-api';
import type { FileReference } from '@podman-desktop/quadlet-extension-core-api';

const PARTIAL_CONTAINER_QUADLET_MOCK = `
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

const CONTAINER_QUADLET_EXAMPLE = `
# demo-quadlet.container
[X-Container]
ContainerName=demo-quadlet-2
Image=nginx
PodmanArgs=--cgroups=enabled
PublishPort=8081:80
EnvironmentFile=/mnt/foo/.env

${PARTIAL_CONTAINER_QUADLET_MOCK}
`;

const CONTAINER_QUADLET_MULTIPLE_ENVIRONMENT_FILE_EXAMPLE = `
# demo-quadlet.container
[X-Container]
ContainerName=demo-quadlet-2
Image=nginx
PodmanArgs=--cgroups=enabled
PublishPort=8081:80
EnvironmentFile=/mnt/foo/.env
EnvironmentFile=/mnt/foo/.env2

${PARTIAL_CONTAINER_QUADLET_MOCK}
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

const STARTABLE_TEMPLATE_QUADLET_MOCK = `
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

const PARTIAL_KUBE_QUADLET_MOCK = `
[Unit]
Wants=podman-user-wait-network-online.service
After=podman-user-wait-network-online.service
SourcePath=/home/user/.config/containers/systemd/boycott/play.kube
RequiresMountsFor=%t/containers

[Service]
KillMode=mixed
Environment=PODMAN_SYSTEMD_UNIT=%n
Type=notify
NotifyAccess=all
SyslogIdentifier=%N
ExecStart=/usr/bin/podman kube play --replace --service-container=true --build /home/USER/.config/containers/systemd/boycott/play.yaml
ExecStopPost=/usr/bin/podman kube down /home/USER/.config/containers/systemd/boycott/play.yaml
`;

const SINGLE_YAML_KUBE_QUADLET_EXAMPLE = `
[X-Kube]
Yaml=/mnt/foo/bar.yaml

${PARTIAL_KUBE_QUADLET_MOCK}
`;

const MULTIPLE_YAMLS_KUBE_QUADLET_EXAMPLE = `
[X-Kube]
Yaml=/mnt/foo/ping.yaml
Yaml=/mnt/foo/pong.yaml

${PARTIAL_KUBE_QUADLET_MOCK}
`;

const RELATIVE_YAML_KUBE_QUADLET_EXAMPLE = `
[X-Kube]
Yaml=./ping.yaml

${PARTIAL_KUBE_QUADLET_MOCK}
`;

const ARTIFACT_QUADLET_EXAMPLE = `
[X-Artifact]
Artifact=foo/bar:0.11.1

[Unit]
Wants=podman-user-wait-network-online.service
After=podman-user-wait-network-online.service
SourcePath=/home/axel7083/.config/containers/systemd/demo.artifact
RequiresMountsFor=%t/containers

[Service]
ExecStart=/usr/bin/podman artifact pull foo/bar:0.11.1
SyslogIdentifier=%N
Type=oneshot
RemainAfterExit=yes
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

test('expect startable template quadlet to have proper service name', () => {
  const parser = new QuadletUnitParser('sleep-quadlet@.service', STARTABLE_TEMPLATE_QUADLET_MOCK);
  const result = parser.parse();

  assert(isTemplateQuadlet(result));
  assert(isServiceQuadlet(result));

  // the service name should be `<template>@<argument>.service`
  expect(result.service).toBe('sleep-quadlet@100.service');
  expect(result.template).toBe('sleep-quadlet');
  expect(result.defaultInstance).toBe('100');
});

test('expect artifact quadlet type to be detected', () => {
  const parser = new QuadletUnitParser('sleep-quadlet@.service', ARTIFACT_QUADLET_EXAMPLE);
  const result = parser.parse();

  expect(result.type).toBe(QuadletType.ARTIFACT);
});

describe('files', () => {
  interface TestCase {
    name: string;
    service: string;
    expected: Array<FileReference>;
  }

  test.each<TestCase>([
    {
      name: 'single YAML from kube quadlet should be detected',
      expected: [
        {
          name: 'bar.yaml',
          path: '/mnt/foo/bar.yaml',
        },
      ],
      service: SINGLE_YAML_KUBE_QUADLET_EXAMPLE,
    },
    {
      name: 'multiple YAMLs from kube quadlet should be detected',
      expected: [
        {
          name: 'ping.yaml',
          path: '/mnt/foo/ping.yaml',
        },
        {
          name: 'pong.yaml',
          path: '/mnt/foo/pong.yaml',
        },
      ],
      service: MULTIPLE_YAMLS_KUBE_QUADLET_EXAMPLE,
    },
    {
      name: 'EnvironmentFile should be detected as a resource',
      expected: [
        {
          name: '.env',
          path: '/mnt/foo/.env',
        },
      ],
      service: CONTAINER_QUADLET_EXAMPLE,
    },
    {
      name: 'multiple EnvironmentFile should be detected as resources',
      expected: [
        {
          name: '.env',
          path: '/mnt/foo/.env',
        },
        {
          name: '.env2',
          path: '/mnt/foo/.env2',
        },
      ],
      service: CONTAINER_QUADLET_MULTIPLE_ENVIRONMENT_FILE_EXAMPLE,
    },
    {
      name: 'relative path should be resolved',
      expected: [
        {
          name: 'ping.yaml',
          path: '/home/user/.config/containers/systemd/boycott/ping.yaml',
        },
      ],
      service: RELATIVE_YAML_KUBE_QUADLET_EXAMPLE,
    },
  ])('$name', ({ service, expected }) => {
    const parser = new QuadletUnitParser('dummy.service', service);
    const result = parser.parse();

    expect(result.files).toStrictEqual(expected);
  });
});
