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

import { render, fireEvent } from '@testing-library/svelte';
import { beforeEach, describe, test, vi, expect, assert } from 'vitest';
import FileEditor from '/@/lib/monaco-editor/FileEditor.svelte';
import type { ProviderContainerConnectionIdentifierInfo, QuadletApi } from '@podman-desktop/quadlet-extension-core-api';
import { quadletAPI } from '/@/api/client';
import MonacoEditor from '/@/lib/monaco-editor/MonacoEditor.svelte';

// mock monaco editor
vi.mock(import('/@/lib/monaco-editor/MonacoEditor.svelte'));
// mock clients
vi.mock(import('/@/api/client'), () => ({
  quadletAPI: {
    readIntoMachine: vi.fn(),
    writeIntoMachine: vi.fn(),
    existsIntoMachine: vi.fn(),
  } as unknown as QuadletApi,
}));

const MOCK_YAML: string = `
foo=bar
`;

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(quadletAPI.readIntoMachine).mockResolvedValue(MOCK_YAML);
  vi.mocked(quadletAPI.existsIntoMachine).mockResolvedValue(true);
});

const PODMAN_MACHINE_DEFAULT: ProviderContainerConnectionIdentifierInfo = {
  name: 'podman-machine-default',
  providerId: 'podman',
};

test('ensure reload button is visible', async () => {
  const { getByTitle } = render(FileEditor, {
    connection: PODMAN_MACHINE_DEFAULT,
    path: '/mnt/foo/bar.yaml',
    loading: false,
  });

  const reloadBtn = getByTitle('Reload file');
  expect(reloadBtn).toBeInTheDocument();
  // onmount pull the yaml so need to wait for completion
  await vi.waitFor(() => {
    expect(reloadBtn).toBeEnabled();
  });
});

test('ensure kube path is visible', async () => {
  const { getByLabelText } = render(FileEditor, {
    connection: PODMAN_MACHINE_DEFAULT,
    path: '/mnt/foo/bar.yaml',
    loading: false,
  });

  const kubeSpan = getByLabelText('file path');
  expect(kubeSpan).toBeInTheDocument();
  expect(kubeSpan).toHaveTextContent('/mnt/foo/bar.yaml');
});

test('ensure reload button is disabled when loading true', async () => {
  const { getByTitle } = render(FileEditor, {
    connection: PODMAN_MACHINE_DEFAULT,
    path: '/mnt/foo/bar.yaml',
    loading: false,
  });

  const reloadBtn = getByTitle('Reload file');
  expect(reloadBtn).toBeInTheDocument();
  expect(reloadBtn).toBeDisabled();
});

test('expect reload button to call quadletAPI#getKubeYAML', async () => {
  const { getByTitle } = render(FileEditor, {
    connection: PODMAN_MACHINE_DEFAULT,
    path: '/mnt/foo/bar.yaml',
    loading: false,
  });

  const reloadBtn = getByTitle('Reload file');
  vi.mocked(quadletAPI.readIntoMachine).mockReset();
  await fireEvent.click(reloadBtn);

  await vi.waitFor(() => {
    expect(quadletAPI.readIntoMachine).toHaveBeenCalledOnce();
  });
});

test('expect result from quadletAPI#getKubeYAML to be displayed in monaco editor', async () => {
  render(FileEditor, {
    connection: PODMAN_MACHINE_DEFAULT,
    path: '/mnt/foo/bar.yaml',
    loading: false,
  });

  await vi.waitFor(() => {
    expect(quadletAPI.readIntoMachine).toHaveBeenCalled();
  });

  await vi.waitFor(() => {
    expect(MonacoEditor).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        content: MOCK_YAML,
      }),
    );
  });
});

test('expect error from quadletAPI#getKubeYAML to be displayed', async () => {
  vi.mocked(quadletAPI.readIntoMachine).mockRejectedValue(new Error('Dummy foo error'));

  const { getByRole } = render(FileEditor, {
    connection: PODMAN_MACHINE_DEFAULT,
    path: '/mnt/foo/bar.yaml',
    loading: false,
  });

  await vi.waitFor(() => {
    expect(quadletAPI.readIntoMachine).toHaveBeenCalled();
  });

  await vi.waitFor(() => {
    const alert = getByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong: Error: Dummy foo error');
  });
});

test('expect save button to be disabled by default', async () => {
  const { getByRole } = render(FileEditor, {
    connection: PODMAN_MACHINE_DEFAULT,
    path: '/mnt/foo/bar.yaml',
    loading: false,
  });

  await vi.waitFor(() => {
    const saveBtn = getByRole('button', { name: 'Save' });
    expect(saveBtn).toBeDisabled();
  });
});

test('expect save button to be enabled when content is updated', async () => {
  const { getByRole } = render(FileEditor, {
    connection: PODMAN_MACHINE_DEFAULT,
    path: '/mnt/foo/bar.yaml',
    loading: false,
  });

  const saveBtn = await vi.waitFor(() => {
    return getByRole('button', { name: 'Save' });
  });

  // before editing, should be disabled
  expect(saveBtn).toBeDisabled();

  const onchange: (content: string) => void = await vi.waitFor(() => {
    expect(MonacoEditor).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        content: MOCK_YAML,
        onChange: expect.any(Function),
      }),
    );
    const props = vi.mocked(MonacoEditor).mock.calls[0]?.[1];
    assert(props.onChange);
    return props.onChange;
  });

  onchange('potatoes');

  // after editing, should be enabled
  await vi.waitFor(() => {
    expect(saveBtn).toBeEnabled();
  });

  // click on save
  saveBtn.click();

  await vi.waitFor(() => {
    expect(quadletAPI.writeIntoMachine).toHaveBeenCalledExactlyOnceWith({
      connection: PODMAN_MACHINE_DEFAULT,
      files: [
        {
          filename: '/mnt/foo/bar.yaml',
          content: 'potatoes',
        },
      ],
      skipSystemdDaemonReload: true,
    });
  });
});

test('empty file should be displayed in monaco editor', async () => {
  vi.mocked(quadletAPI.readIntoMachine).mockResolvedValue('');

  render(FileEditor, {
    connection: PODMAN_MACHINE_DEFAULT,
    path: '/mnt/foo/bar.env',
    loading: false,
  });

  await vi.waitFor(() => {
    expect(MonacoEditor).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        content: '',
      }),
    );
  });
});

test('successful read should not check if the file exists', async () => {
  render(FileEditor, {
    connection: PODMAN_MACHINE_DEFAULT,
    path: '/mnt/foo/bar.yaml',
    loading: false,
  });

  await vi.waitFor(() => {
    expect(MonacoEditor).toHaveBeenCalled();
  });

  expect(quadletAPI.existsIntoMachine).not.toHaveBeenCalled();
});

describe('missing file', () => {
  beforeEach(() => {
    vi.mocked(quadletAPI.readIntoMachine).mockRejectedValue(new Error('ENOENT: no such file or directory'));
    vi.mocked(quadletAPI.existsIntoMachine).mockResolvedValue(false);
  });

  test('error from quadletAPI#readIntoMachine should check if the file exists', async () => {
    render(FileEditor, {
      connection: PODMAN_MACHINE_DEFAULT,
      path: '/mnt/foo/bar.env',
      loading: false,
    });

    await vi.waitFor(() => {
      expect(quadletAPI.existsIntoMachine).toHaveBeenCalledExactlyOnceWith({
        connection: PODMAN_MACHINE_DEFAULT,
        path: '/mnt/foo/bar.env',
      });
    });
  });

  test('missing file should display a create button instead of the error', async () => {
    const { getByTitle, getByText, queryByRole } = render(FileEditor, {
      connection: PODMAN_MACHINE_DEFAULT,
      path: '/mnt/foo/bar.env',
      loading: false,
    });

    await vi.waitFor(() => {
      expect(getByTitle('Create file')).toBeEnabled();
    });

    expect(getByText('File not found')).toBeInTheDocument();
    expect(queryByRole('alert')).toBeNull();
    expect(MonacoEditor).not.toHaveBeenCalled();
  });

  test('existing file should display the error from quadletAPI#readIntoMachine', async () => {
    vi.mocked(quadletAPI.readIntoMachine).mockRejectedValue(new Error('Dummy foo error'));
    vi.mocked(quadletAPI.existsIntoMachine).mockResolvedValue(true);

    const { getByRole, queryByTitle } = render(FileEditor, {
      connection: PODMAN_MACHINE_DEFAULT,
      path: '/mnt/foo/bar.env',
      loading: false,
    });

    await vi.waitFor(() => {
      expect(getByRole('alert')).toHaveTextContent('Something went wrong: Error: Dummy foo error');
    });
    expect(queryByTitle('Create file')).toBeNull();
  });

  test('error from quadletAPI#existsIntoMachine should display the error from quadletAPI#readIntoMachine', async () => {
    vi.mocked(quadletAPI.readIntoMachine).mockRejectedValue(new Error('Dummy foo error'));
    vi.mocked(quadletAPI.existsIntoMachine).mockRejectedValue(new Error('Dummy bar error'));

    const { getByRole, queryByTitle } = render(FileEditor, {
      connection: PODMAN_MACHINE_DEFAULT,
      path: '/mnt/foo/bar.env',
      loading: false,
    });

    await vi.waitFor(() => {
      expect(getByRole('alert')).toHaveTextContent('Something went wrong: Error: Dummy foo error');
    });
    expect(queryByTitle('Create file')).toBeNull();
  });

  test('create button should write an empty file and reload it', async () => {
    const { getByTitle, queryByTitle } = render(FileEditor, {
      connection: PODMAN_MACHINE_DEFAULT,
      path: '/mnt/foo/bar.env',
      loading: false,
    });

    const createBtn = await vi.waitFor(() => {
      const button = getByTitle('Create file');
      expect(button).toBeEnabled();
      return button;
    });

    // the file now exists
    vi.mocked(quadletAPI.readIntoMachine).mockResolvedValue('');

    await fireEvent.click(createBtn);

    await vi.waitFor(() => {
      expect(quadletAPI.writeIntoMachine).toHaveBeenCalledExactlyOnceWith({
        connection: PODMAN_MACHINE_DEFAULT,
        files: [
          {
            filename: '/mnt/foo/bar.env',
            content: '',
          },
        ],
        skipSystemdDaemonReload: true,
      });
    });

    await vi.waitFor(() => {
      expect(MonacoEditor).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          content: '',
        }),
      );
    });

    expect(quadletAPI.readIntoMachine).toHaveBeenCalledTimes(2);
    expect(queryByTitle('Create file')).toBeNull();
  });

  test('error from quadletAPI#writeIntoMachine should be displayed', async () => {
    vi.mocked(quadletAPI.writeIntoMachine).mockRejectedValue(new Error('Dummy write error'));

    const { getByRole, getByTitle } = render(FileEditor, {
      connection: PODMAN_MACHINE_DEFAULT,
      path: '/mnt/foo/bar.env',
      loading: false,
    });

    const createBtn = await vi.waitFor(() => {
      const button = getByTitle('Create file');
      expect(button).toBeEnabled();
      return button;
    });

    await fireEvent.click(createBtn);

    await vi.waitFor(() => {
      expect(getByRole('alert')).toHaveTextContent('Something went wrong: Error: Dummy write error');
    });

    // user should be able to try again
    expect(getByTitle('Create file')).toBeEnabled();
  });
});
