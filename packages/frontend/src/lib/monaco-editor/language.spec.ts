/**********************************************************************
 * Copyright (C) 2026 Red Hat, Inc.
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

import { expect, test } from 'vitest';
import { getLanguageFromPath } from '/@/lib/monaco-editor/language';

test.each<{ path: string; expected: string }>([
  // extensions matching a monaco language id
  { path: '/home/user/.config/containers/systemd/foo.yaml', expected: 'yaml' },
  { path: '/home/user/.config/containers/systemd/seccomp.json', expected: 'json' },
  { path: '/home/user/.config/containers/systemd/foo.ini', expected: 'ini' },
  // extensions not matching a monaco language id
  { path: '/home/user/.config/containers/systemd/foo.yml', expected: 'yaml' },
  { path: '/home/user/.config/containers/systemd/foo.env', expected: 'ini' },
  { path: '/home/user/.config/containers/systemd/containers.conf', expected: 'ini' },
  // extension should be case-insensitive
  { path: '/home/user/.config/containers/systemd/FOO.YML', expected: 'yaml' },
  { path: '/home/user/.config/containers/systemd/foo.ENV', expected: 'ini' },
  // dotenv files
  { path: '/home/user/.config/containers/systemd/.env', expected: 'ini' },
  { path: '/home/user/.config/containers/systemd/.env.local', expected: 'ini' },
  // only the file name should be considered
  { path: '/home/user/foo.yaml/bar', expected: 'plaintext' },
  { path: 'foo.yaml', expected: 'yaml' },
  // files without extension
  { path: '/etc/sysconfig/foo', expected: 'plaintext' },
  { path: '/home/user/.config/containers/systemd/.containerignore', expected: 'plaintext' },
])('expect language of $path to be $expected', ({ path, expected }) => {
  expect(getLanguageFromPath(path)).toStrictEqual(expected);
});
