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
import '@testing-library/jest-dom/vitest';

import { beforeEach, test, vi, expect } from 'vitest';
import { MonacoManager } from '/@/lib/monaco-editor/monaco';

const BG_BLACK_COLOR = '#000000';

// mock all monaco core component
vi.mock('monaco-editor', () => ({
  editor: {
    defineTheme: vi.fn(),
  },
}));
vi.mock('monaco-editor/esm/vs/editor/editor.api');
vi.mock('monaco-editor/esm/vs/basic-languages/ini/ini.contribution');
vi.mock('monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution');

beforeEach(() => {
  vi.resetAllMocks();

  const APP = document.createElement('div');
  APP.setAttribute('id', 'app');
  APP.setAttribute('style', `--pd-terminal-background: ${BG_BLACK_COLOR};`); // Set your desired value

  document.body.appendChild(APP);
});

test('importing monaco should register theme', async () => {
  const monaco = await MonacoManager.getMonaco();

  expect(monaco.editor.defineTheme).toHaveBeenCalledWith(
    // theme registered should match theme name
    MonacoManager.getThemeName(),
    expect.objectContaining({
      colors: expect.objectContaining({
        'editor.background': BG_BLACK_COLOR,
      }),
    }),
  );
});
