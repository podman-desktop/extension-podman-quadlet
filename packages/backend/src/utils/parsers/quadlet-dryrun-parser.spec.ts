/**********************************************************************
 * Copyright (C) 2025-2026 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import { test, expect, assert } from 'vitest';
import { QuadletDryRunParser } from './quadlet-dryrun-parser';
import TEMPLATE_AND_INSTANCE from './tests/quadlet-stdout-template-and-instance.txt?raw';
import MULTIPLE_QUADLETS_EXAMPLE from './tests/quadlet-stdout-multiple-quadlets.txt?raw';
import DRYRUN_STDERR from './tests/quadlet-stderr.txt?raw';
import TEMPLATE_QUADLET from './tests/quadlet-stdout-container-template.txt?raw';
import { isTemplateQuadlet, isServiceQuadlet, isTemplateInstanceQuadlet } from '@quadlet/core-api';

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
  expect(isServiceQuadlet(container)).toBeFalsy();

  expect(image.path).toBe('/home/user/.config/containers/systemd/nginx.image');
  expect(image.state).toBe('error');

  assert(!isServiceQuadlet(image));
  assert(!isTemplateQuadlet(image));
  assert(!isTemplateInstanceQuadlet(image));

  expect(image.stderr).toEqual(
    [
      `quadlet-generator[13914]: Loading source unit file /home/user/.config/containers/systemd/nginx.image`,
      `quadlet-generator[13914]: converting "nginx.image": unsupported key 'Annotation' in group 'Image' in /home/user/.config/containers/systemd/nginx.image`,
    ].join('\n'),
  );
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
  expect(isTemplateQuadlet(foo)).toBeTruthy();
  expect(isTemplateInstanceQuadlet(foo)).toBeFalsy();
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
  expect(isTemplateQuadlet(template)).toBeTruthy();
  expect(isTemplateInstanceQuadlet(template)).toBeFalsy();

  // an instance is not a template
  expect(isTemplateQuadlet(instance)).toBeFalsy();
  expect(isTemplateInstanceQuadlet(instance)).toBeTruthy();
});
