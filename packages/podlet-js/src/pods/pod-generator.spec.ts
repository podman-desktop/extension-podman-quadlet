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
import { readdir, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect, describe } from 'vitest';
import { PodGenerator } from './pod-generator';

const assetsDir = join(__dirname, './tests');

describe('generate', async () => {
  const folders = await readdir(assetsDir);

  test.each(folders)('should generate correct output for %s', async folder => {
    const folderPath = join(assetsDir, folder);
    const imagePath = join(folderPath, 'pod-inspect.json');
    const expectedPath = join(folderPath, 'expect.ini');
    const optionsPath = join(folderPath, 'options.json');

    await Promise.all(
      [imagePath, expectedPath, optionsPath].map(async file => {
        await access(file);
      }),
    );

    const [image, expected, options] = await Promise.all([
      readFile(imagePath, 'utf-8'),
      readFile(expectedPath, 'utf-8'),
      readFile(optionsPath, 'utf-8'),
    ]);

    const result = new PodGenerator({
      pod: JSON.parse(image),
    }).generate(JSON.parse(options));
    expect(result.trim()).toBe(expected.trim());
  });
});
