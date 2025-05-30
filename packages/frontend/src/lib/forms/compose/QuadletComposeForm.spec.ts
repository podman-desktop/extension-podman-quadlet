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
import { fireEvent, render, type RenderResult } from '@testing-library/svelte';

import { expect, test, describe, vi, beforeEach } from 'vitest';
import QuadletComposeForm from '/@/lib/forms/compose/QuadletComposeForm.svelte';
import type { Component, ComponentProps } from 'svelte';
import { podletAPI, quadletAPI } from '/@/api/client';
import type { ProviderContainerConnectionDetailedInfo } from '/@shared/src/models/provider-container-connection-detailed-info';
import * as connectionStore from '/@store/connections';
import { readable } from 'svelte/store';

// mock clients
vi.mock('/@/api/client', () => ({
  providerAPI: {
    all: vi.fn(),
  },
  podletAPI: {
    generate: vi.fn(),
    compose: vi.fn(),
  },
  quadletAPI: {
    writeIntoMachine: vi.fn(),
  },
}));

// mock stores
vi.mock(import('/@store/connections'));
// do not render monaco editor
vi.mock(import('/@/lib/monaco-editor/QuadletEditor.svelte'));

const FILEPATH_MOCK = '/path/to/file.compose';
const COMPOSE_OUTPUT_MOCK = 'compose-output-mock';

// ui object
const WSL_PROVIDER_DETAILED_INFO: ProviderContainerConnectionDetailedInfo = {
  providerId: 'podman',
  name: 'podman-machine',
  vmType: 'WSL',
  status: 'started',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(connectionStore).providerConnectionsInfo = readable([WSL_PROVIDER_DETAILED_INFO]);
  vi.mocked(podletAPI.compose).mockResolvedValue(COMPOSE_OUTPUT_MOCK);
});

describe('step select', () => {
  test('file provided as parameter should be displayed', async () => {
    const { getByRole } = render(QuadletComposeForm, {
      filepath: FILEPATH_MOCK,
      loading: false,
    });

    const input = getByRole('textbox', { name: 'Compose file' });
    expect(input).toHaveValue(FILEPATH_MOCK);
  });
});

describe('Step Edit YAML', () => {
  let renderResult: RenderResult<Component<ComponentProps<typeof QuadletComposeForm>>>;

  beforeEach(async () => {
    renderResult = render(QuadletComposeForm, {
      filepath: FILEPATH_MOCK,
      loading: false,
    });

    const generateBtn = renderResult.getByRole('button', { name: 'Generate' });
    expect(generateBtn).toBeEnabled();

    generateBtn.click();

    await vi.waitFor(() => {
      const step = renderResult.getByLabelText('Step Edit YAML');
      expect(step).toHaveAttribute('aria-selected', 'true');
    });
  });

  test('expect kube filename input to be visible', () => {
    const input = renderResult.getByRole('textbox', { name: 'Kube filename' });
    expect(input).toBeDefined();
  });

  test('expect previous button to return to select step', async () => {
    const previousBtn = renderResult.getByRole('button', { name: 'Previous' });
    expect(previousBtn).toBeEnabled();

    previousBtn.click();

    await vi.waitFor(() => {
      const step = renderResult.getByLabelText('Step Select');
      expect(step).toHaveAttribute('aria-selected', 'true');
    });
  });

  test('typing a filename should enable next button', async () => {
    const nextBtn = renderResult.getByRole('button', { name: 'Next' });
    expect(nextBtn).toBeDisabled();

    const input = renderResult.getByRole('textbox', { name: 'Kube filename' });
    await fireEvent.input(input, { target: { value: 'hello.yaml' } });

    await vi.waitFor(() => {
      expect(nextBtn).toBeEnabled();
    });
  });
});

describe('Step Edit Quadlet', async () => {
  let renderResult: RenderResult<Component<ComponentProps<typeof QuadletComposeForm>>>;

  beforeEach(async () => {
    renderResult = render(QuadletComposeForm, {
      filepath: FILEPATH_MOCK,
      loading: false,
      providerId: WSL_PROVIDER_DETAILED_INFO.providerId,
      connection: WSL_PROVIDER_DETAILED_INFO.name,
    });

    const generateBtn = renderResult.getByRole('button', { name: 'Generate' });
    expect(generateBtn).toBeEnabled();

    // Go to step 2
    generateBtn.click();

    const input: HTMLElement = await vi.waitFor<HTMLElement>(() => {
      return renderResult.getByRole('textbox', { name: 'Kube filename' });
    });

    await fireEvent.input(input, { target: { value: 'hello.yaml' } });

    const nextBtn: HTMLElement = await vi.waitFor<HTMLElement>(() => {
      const btn = renderResult.getByRole('button', { name: 'Next' });
      expect(btn).toBeEnabled();
      return btn;
    });
    // Go to step 3
    nextBtn.click();

    await vi.waitFor(() => {
      const step = renderResult.getByLabelText('Step Edit Quadlet');
      expect(step).toHaveAttribute('aria-selected', 'true');
    });
  });

  test('expect quadlet filename input to be visible', () => {
    const input = renderResult.getByRole('textbox', { name: 'Quadlet filename' });
    expect(input).toBeDefined();
  });

  test('expect previous button to return to select step', async () => {
    const previousBtn = renderResult.getByRole('button', { name: 'Previous' });
    expect(previousBtn).toBeEnabled();

    previousBtn.click();

    await vi.waitFor(() => {
      const step = renderResult.getByLabelText('Step Edit YAML');
      expect(step).toHaveAttribute('aria-selected', 'true');
    });
  });

  test('typing a filename should enable next button', async () => {
    const loadIntoMachineBtn = renderResult.getByRole('button', { name: 'Load into machine' });
    expect(loadIntoMachineBtn).toBeDisabled();

    const input = renderResult.getByRole('textbox', { name: 'Quadlet filename' });
    await fireEvent.input(input, { target: { value: 'hello.kube' } });

    await vi.waitFor(() => {
      expect(loadIntoMachineBtn).toBeEnabled();
    });
  });

  test('typing a filename should enable next button', async () => {
    const loadIntoMachineBtn = renderResult.getByRole('button', { name: 'Load into machine' });

    const input = renderResult.getByRole('textbox', { name: 'Quadlet filename' });
    await fireEvent.input(input, { target: { value: 'hello.kube' } });

    await vi.waitFor(() => {
      expect(loadIntoMachineBtn).toBeEnabled();
    });

    loadIntoMachineBtn.click();

    await vi.waitFor(() => {
      expect(quadletAPI.writeIntoMachine).toHaveBeenCalledWith({
        connection: WSL_PROVIDER_DETAILED_INFO,
        files: [
          {
            content: COMPOSE_OUTPUT_MOCK,
            filename: 'hello.yaml',
          },
          {
            content: '\n[Unit]\nDescription=A kubernetes yaml based service\n\n[Kube]\nYaml=hello.yaml\n',
            filename: 'hello.kube',
          },
        ],
      });
    });

    // should be in Completed step
    await vi.waitFor(() => {
      const step = renderResult.getByLabelText('Step Completed');
      expect(step).toHaveAttribute('aria-selected', 'true');
    });
  });
});
