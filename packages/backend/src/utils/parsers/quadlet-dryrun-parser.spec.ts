/**
 * @author axel7083
 */

import { test, expect } from 'vitest';
import { QuadletDryRunParser } from './quadlet-dryrun-parser';
import TEMPLATE_AND_INSTANCE from './tests/quadlet-stdout-template-and-instance.txt?raw';
import MULTIPLE_QUADLETS_EXAMPLE from './tests/quadlet-stdout-multiple-quadlets.txt?raw';
import DRYRUN_STDERR from './tests/quadlet-stderr.txt?raw';
import TEMPLATE_QUADLET from './tests/quadlet-stdout-container-template.txt?raw';

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
