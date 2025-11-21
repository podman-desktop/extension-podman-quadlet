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
import { ContainerGenerator } from './container-generator';

const assetsDir = join(__dirname, './tests');

describe('generate', async () => {
  const folders = await readdir(assetsDir);

  test.each(folders)('should generate correct output for %s', async folder => {
    const folderPath = join(assetsDir, folder);
    const containerPath = join(folderPath, 'container-inspect.json');
    const imagePath = join(folderPath, 'image-inspect.json');
    const expectedPath = join(folderPath, 'expect.ini');
    const optionsPath = join(folderPath, 'options.json');

    await Promise.all(
      [containerPath, imagePath, expectedPath, optionsPath].map(async file => {
        await access(file);
      }),
    );

    const [container, image, expected, options] = await Promise.all([
      readFile(containerPath, 'utf-8'),
      readFile(imagePath, 'utf-8'),
      readFile(expectedPath, 'utf-8'),
      readFile(optionsPath, 'utf-8'),
    ]);

    const result = new ContainerGenerator({
      container: JSON.parse(container),
      image: JSON.parse(image),
      options: JSON.parse(options),
    }).generate();
    expect(result.trim()).toBe(expected.trim());
  });
});
