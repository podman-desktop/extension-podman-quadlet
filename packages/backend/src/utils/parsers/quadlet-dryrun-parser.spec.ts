/**
 * @author axel7083
 */

import { test, expect } from 'vitest';
import { QuadletDryRunParser } from './quadlet-dryrun-parser';

const MULTIPLE_QUADLETS_EXAMPLE = `
---nginx.service---
# demo-quadlet.container
[X-Container]
ContainerName=demo-quadlet
Image=nginx
PodmanArgs=--cgroups=enabled
PublishPort=8080:80

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
ExecStart=/usr/bin/podman run --name=demo-quadlet --cidfile=%t/%N.cid --replace --rm --cgroups=split --sdnotify=conmon -d --publish 8080:80 --cgroups=enabled nginx

[Install]
WantedBy=default.target

[Unit]
Wants=network-online.target
After=network-online.target
SourcePath=/home/user/.config/containers/systemd/nginx.container
RequiresMountsFor=%t/containers

---nginx2.service---
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

const DRYRUN_STDERR: string = `
quadlet-generator[13914]: Loading source unit file /home/user/.config/containers/systemd/nginx.container
quadlet-generator[13914]: Loading source unit file /home/user/.config/containers/systemd/nginx.image
quadlet-generator[13914]: converting "nginx.image": unsupported key 'Annotation' in group 'Image' in /home/user/.config/containers/systemd/nginx.image
converting "nginx2.image": unsupported key 'jhfhfhf' in group 'Image' in /home/user/.config/containers/systemd/nginx2.image
`;

const TEMPLATE_QUADLET: string = `
---sleep@.service---
[Unit]
Wants=podman-user-wait-network-online.service
After=podman-user-wait-network-online.service
Description=A templated sleepy container
SourcePath=/home/user/.config/containers/systemd/sleep@.container
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

const TEMPLATE_AND_INSTANCE: string = `
---sleep@.service---
[Unit]
Wants=podman-user-wait-network-online.service
After=podman-user-wait-network-online.service
Description=A templated sleepy container
SourcePath=/home/user/.config/containers/systemd/sleep@.container
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

---sleep@10.service---
[Unit]
Wants=podman-user-wait-network-online.service
After=podman-user-wait-network-online.service
Description=A templated sleepy container
SourcePath=/home/user/.config/containers/systemd/sleep@10.container
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

test('expect result to contain two quadlets', async () => {
  const parser = new QuadletDryRunParser({
    stdout: MULTIPLE_QUADLETS_EXAMPLE,
    stderr: '',
    command: '',
  });
  const result = parser.parse();
  expect(result).toHaveLength(2);
});

test('expect each path to be properly set', async () => {
  const parser = new QuadletDryRunParser({
    stdout: MULTIPLE_QUADLETS_EXAMPLE,
    stderr: '',
    command: '',
  });
  const result = parser.parse();
  expect(result[0].path).toBe('/home/user/.config/containers/systemd/nginx.container');
  expect(result[1].path).toBe('/home/user/.config/containers/systemd/nginx2.container');
});

test('should parse stderr properly and properly set state', async () => {
  const parser = new QuadletDryRunParser({
    stdout: '',
    stderr: DRYRUN_STDERR,
    command: '',
  });
  const result = parser.parse();
  expect(result).toHaveLength(2);

  const [container, image] = result;

  expect(container.path).toBe('/home/user/.config/containers/systemd/nginx.container');
  expect(container.state).toBe('error');
  expect(container.content).toBeUndefined();

  expect(image.path).toBe('/home/user/.config/containers/systemd/nginx.image');
  expect(image.state).toBe('error');
  expect(image.content).toBeUndefined();
});

test('overlapping stderr should be overwritten by stdout', async () => {
  const parser = new QuadletDryRunParser({
    stdout: MULTIPLE_QUADLETS_EXAMPLE,
    stderr: DRYRUN_STDERR,
    command: '',
  });
  const result = parser.parse();
  expect(result).toHaveLength(3);

  const [containerNginx, containerNginx2, imageNginx] = result;

  expect(containerNginx.state).toBe('unknown');
  expect(containerNginx2.state).toBe('unknown');

  expect(imageNginx.state).toBe('error');
});

test('expect template quadlet to be recognised', async () => {
  const parser = new QuadletDryRunParser({
    stdout: TEMPLATE_QUADLET,
    stderr: '',
    command: '',
  });

  const result = parser.parse();
  expect(result).toHaveLength(1);

  const [foo] = result;
  expect(foo.isTemplate).toBeTruthy();
});

test('expect template and instance quadlet to be recognised', async () => {
  const parser = new QuadletDryRunParser({
    stdout: TEMPLATE_AND_INSTANCE,
    stderr: '',
    command: '',
  });

  const result = parser.parse();
  expect(result).toHaveLength(2);

  const [template, instance] = result;
  expect(template.isTemplate).toBeTruthy();
  expect(instance.isTemplate).toBeFalsy();
});
