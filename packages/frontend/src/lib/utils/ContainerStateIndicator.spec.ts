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

import '@testing-library/jest-dom/vitest';
import { expect, test } from 'vitest';
import { render } from '@testing-library/svelte';
import ContainerStateIndicator from './ContainerStateIndicator.svelte';

test('Should use running color if state is running', async () => {
  const { container } = render(ContainerStateIndicator, {
    state: 'running',
  });

  const indicator = container.firstElementChild;
  expect(indicator).toBeDefined();
  expect(indicator).toHaveStyle('background-color: var(--pd-status-running)');
});

test('Should use stopped color if state is not running', async () => {
  const { container } = render(ContainerStateIndicator, {
    state: 'stopped',
  });

  const indicator = container.firstElementChild;
  expect(indicator).toBeDefined();
  expect(indicator).toHaveStyle('background-color: var(--pd-status-stopped)');
});
