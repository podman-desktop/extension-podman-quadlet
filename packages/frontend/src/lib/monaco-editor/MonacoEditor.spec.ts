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

import { render } from '@testing-library/svelte';
import { beforeEach, test, vi, expect, describe } from 'vitest';
import MonacoEditor from '/@/lib/monaco-editor/MonacoEditor.svelte';
import { editor } from 'monaco-editor/esm/vs/editor/editor.api';

// mock all monaco core component
vi.mock('monaco-editor');
vi.mock('monaco-editor/esm/vs/editor/editor.api');
vi.mock('monaco-editor/esm/vs/basic-languages/ini/ini.contribution');
vi.mock('monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution');

const EDITOR_MOCK: editor.IStandaloneCodeEditor = {
  dispose: vi.fn(),
  getModel: vi.fn(),
  onDidChangeModelContent: vi.fn(),
} as unknown as editor.IStandaloneCodeEditor;

const BG_BLACK_COLOR = '#000000';

beforeEach(() => {
  vi.resetAllMocks();

  const APP = document.createElement('div');
  APP.setAttribute('id', 'app');
  APP.setAttribute('style', `--pd-terminal-background: ${BG_BLACK_COLOR};`); // Set your desired value

  document.body.appendChild(APP);
  vi.mocked(editor.create).mockReturnValue(EDITOR_MOCK);
});

test('defineTheme should use value of var(--pd-terminal-background)', async () => {
  render(MonacoEditor, {
    content: '[Foo]\nhello=world',
    language: 'ini',
  });

  await vi.waitFor(() => {
    expect(editor.defineTheme).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        colors: expect.objectContaining({
          'editor.background': BG_BLACK_COLOR,
        }),
      }),
    );
  });
});

describe('monaco component should propagate props', () => {
  test('content', async () => {
    render(MonacoEditor, {
      content: '[Foo]\nhello=world',
      language: 'ini',
    });

    await vi.waitFor(() => {
      expect(editor.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          value: '[Foo]\nhello=world',
        }),
      );
    });
  });

  test('language', async () => {
    render(MonacoEditor, {
      content: '[Foo]\nhello=world',
      language: 'ini',
    });

    await vi.waitFor(() => {
      expect(editor.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          language: 'ini',
        }),
      );
    });
  });

  test('readOnly', async () => {
    render(MonacoEditor, {
      content: '[Foo]\nhello=world',
      language: 'ini',
      readOnly: true,
    });

    await vi.waitFor(() => {
      expect(editor.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          readOnly: true,
        }),
      );
    });
  });

  test('noMinimap', async () => {
    render(MonacoEditor, {
      content: '[Foo]\nhello=world',
      language: 'ini',
      noMinimap: true,
    });

    await vi.waitFor(() => {
      expect(editor.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          minimap: {
            enabled: false,
          },
        }),
      );
    });
  });
});
