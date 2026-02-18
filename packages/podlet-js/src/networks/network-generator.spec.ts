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
import { readdir, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect, describe } from 'vitest';
import { NetworkGenerator } from './network-generator';

const assetsDir = join(__dirname, './tests');

describe('generate', async () => {
  const folders = await readdir(assetsDir);

  test.each(folders)('should generate correct output for %s', async folder => {
    const folderPath = join(assetsDir, folder);
    const networkPath = join(folderPath, 'network-inspect.json');
    const expectedPath = join(folderPath, 'expect.ini');

    await Promise.all(
      [networkPath, expectedPath].map(async file => {
        await access(file);
      }),
    );

    const [network, expected] = await Promise.all([readFile(networkPath, 'utf-8'), readFile(expectedPath, 'utf-8')]);

    const result = new NetworkGenerator({
      network: JSON.parse(network),
    }).generate();
    expect(result.trim()).toBe(expected.trim());
  });
});
