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
import { beforeEach, test, vi, expect, assert } from 'vitest';
import KubeYamlEditor from '/@/lib/monaco-editor/KubeYamlEditor.svelte';
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import { quadletAPI } from '/@/api/client';
import MonacoEditor from '/@/lib/monaco-editor/MonacoEditor.svelte';
import type { QuadletApi } from '/@shared/src/apis/quadlet-api';

// mock monaco editor
vi.mock(import('/@/lib/monaco-editor/MonacoEditor.svelte'));
// mock clients
vi.mock(import('/@/api/client'), () => ({
  quadletAPI: {
    getKubeYAML: vi.fn(),
    writeIntoMachine: vi.fn(),
  } as unknown as QuadletApi,
}));

const MOCK_YAML: { content: string; path: string } = {
  content: `
foo=bar
`,
  path: '/foo/bar/example.yaml',
};

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(quadletAPI.getKubeYAML).mockResolvedValue(MOCK_YAML);
});

const PODMAN_MACHINE_DEFAULT: ProviderContainerConnectionIdentifierInfo = {
  name: 'podman-machine-default',
  providerId: 'podman',
};

const KUBE_QUADLET: QuadletInfo & { type: QuadletType.KUBE } = {
  type: QuadletType.KUBE,
  id: `foo.bar`,
  path: `/mnt/foo/bar.kube`,
  service: undefined,
  state: 'active',
  connection: PODMAN_MACHINE_DEFAULT,
  requires: [],
  files: [],
};

test('ensure reload button is visible', async () => {
  const { getByTitle } = render(KubeYamlEditor, {
    quadlet: KUBE_QUADLET,
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
  const { getByLabelText } = render(KubeYamlEditor, {
    quadlet: KUBE_QUADLET,
    loading: false,
  });

  const kubeSpan = getByLabelText('kube path');
  expect(kubeSpan).toBeInTheDocument();
  expect(kubeSpan).toHaveTextContent(KUBE_QUADLET.path);
});

test('ensure reload button is disabled when loading true', async () => {
  const { getByTitle } = render(KubeYamlEditor, {
    quadlet: KUBE_QUADLET,
    loading: true,
  });

  const reloadBtn = getByTitle('Reload file');
  expect(reloadBtn).toBeInTheDocument();
  expect(reloadBtn).toBeDisabled();
});

test('expect reload button to call quadletAPI#getKubeYAML', async () => {
  const { getByTitle } = render(KubeYamlEditor, {
    quadlet: KUBE_QUADLET,
    loading: false,
  });

  const reloadBtn = getByTitle('Reload file');
  vi.mocked(quadletAPI.getKubeYAML).mockReset();
  await fireEvent.click(reloadBtn);

  await vi.waitFor(() => {
    expect(quadletAPI.getKubeYAML).toHaveBeenCalledOnce();
  });
});

test('expect result from quadletAPI#getKubeYAML to be displayed in monaco editor', async () => {
  render(KubeYamlEditor, {
    quadlet: KUBE_QUADLET,
    loading: false,
  });

  await vi.waitFor(() => {
    expect(quadletAPI.getKubeYAML).toHaveBeenCalled();
  });

  await vi.waitFor(() => {
    expect(MonacoEditor).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        content: MOCK_YAML.content,
      }),
    );
  });
});

test('expect error from quadletAPI#getKubeYAML to be displayed', async () => {
  vi.mocked(quadletAPI.getKubeYAML).mockRejectedValue(new Error('Dummy foo error'));

  const { getByRole } = render(KubeYamlEditor, {
    quadlet: KUBE_QUADLET,
    loading: false,
  });

  await vi.waitFor(() => {
    expect(quadletAPI.getKubeYAML).toHaveBeenCalled();
  });

  await vi.waitFor(() => {
    const alert = getByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong: Error: Dummy foo error');
  });
});

test('expect save button to be disabled by default', async () => {
  const { getByRole } = render(KubeYamlEditor, {
    quadlet: KUBE_QUADLET,
    loading: false,
  });

  await vi.waitFor(() => {
    const saveBtn = getByRole('button', { name: 'Save' });
    expect(saveBtn).toBeDisabled();
  });
});

test('expect save button to be enabled when content is updated', async () => {
  const { getByRole } = render(KubeYamlEditor, {
    quadlet: KUBE_QUADLET,
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
        content: MOCK_YAML.content,
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
    expect(quadletAPI.writeIntoMachine).toHaveBeenCalledOnce();
    expect(quadletAPI.writeIntoMachine).toHaveBeenCalledWith({
      connection: PODMAN_MACHINE_DEFAULT,
      files: [
        {
          filename: MOCK_YAML.path,
          content: 'potatoes',
        },
      ],
      skipSystemdDaemonReload: true,
    });
  });
});
