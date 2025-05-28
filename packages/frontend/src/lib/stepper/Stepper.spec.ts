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

import { expect, test, describe, vi, beforeEach } from 'vitest';
import Stepper from '/@/lib/stepper/Stepper.svelte';
import type { Step } from './stepper';

// eslint-disable-next-line sonarjs/slow-regex
const STEP_LABEL_REGEX = /^Step\s+(.+)$/;

const STEPS_MOCK: Array<Step> = [
  {
    label: 'Foo',
    id: 'foo',
  },
  {
    label: 'Bar',
    id: 'bar',
  },
  {
    label: 'Hello',
    id: 'hello',
  },
  {
    label: 'Potatoes',
    id: 'potatoes',
  },
];

beforeEach(() => {
  vi.resetAllMocks();
});

// not related to stepper, but testing the regex used in tests bellow
describe('step regex', () => {
  test.each(['Step oui', 'Step Foo', 'Step Bar', 'Step Foo Bar'])('expect %s to be a valid string', str => {
    expect(STEP_LABEL_REGEX.test(str)).toBeTruthy();
  });

  test.each(['oui', 'stepper', 'stepper-potatoes'])('expect %s to be an invalid string', str => {
    expect(STEP_LABEL_REGEX.test(str)).toBeFalsy();
  });
});

test('expect stepper to render every step', async () => {
  const { queryAllByLabelText } = render(Stepper, {
    value: STEPS_MOCK[0].id,
    steps: STEPS_MOCK,
  });

  const stepper = queryAllByLabelText(STEP_LABEL_REGEX);
  expect(stepper).toHaveLength(STEPS_MOCK.length);
});

test('expect stepper to set aria-select to selected step', async () => {
  const selected = STEPS_MOCK[0];

  const { queryAllByLabelText } = render(Stepper, {
    value: selected.id,
    steps: STEPS_MOCK,
  });

  const stepper = queryAllByLabelText(STEP_LABEL_REGEX);
  expect(stepper).toHaveLength(STEPS_MOCK.length);

  // check all aria-selected that would be true
  const elements = stepper.filter(step => step.getAttribute('aria-selected') === 'true');
  expect(elements).toHaveLength(1);

  // ensure this is the expected label
  expect(elements[0]).toHaveAttribute('aria-label', `Step ${selected.label}`);
});
