/**********************************************************************
 * Copyright (C) 2025 Red Hat, Inc.
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
import { test, expect, describe } from 'vitest';
import { readdir, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { Compose } from './compose';

const assetsDir = join(__dirname, './tests');

describe('compose', async () => {
  const folders = await readdir(assetsDir);

  test.each(folders)('should generate correct output for %s', async folder => {
    const folderPath = join(assetsDir, folder);
    const composeYaml = join(folderPath, 'compose.yaml');
    const expectYaml = join(folderPath, 'expect.yaml');

    await Promise.all(
      [composeYaml, expectYaml].map(async file => {
        await access(file);
      }),
    );

    const [composeRaw, expectRaw] = await Promise.all([readFile(composeYaml, 'utf-8'), readFile(expectYaml, 'utf-8')]);

    const compose = Compose.fromString(composeRaw);
    expect(compose.toKubePlay()).toStrictEqual(expectRaw);
  });
});
