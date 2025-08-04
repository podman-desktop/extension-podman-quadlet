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

import { fireEvent, render } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';
import RadioButtons from '/@/lib/buttons/RadioButtons.svelte';

const OPTIONS = Array.from({ length: 10 }, (_, index) => ({
  id: `id-${index}`,
  label: `label ${index}`,
}));

test('must contain a radio button per options', () => {
  const { getAllByRole } = render(RadioButtons, {
    options: OPTIONS,
    label: 'Example',
    value: OPTIONS[0].id,
    onChange: vi.fn(),
  });

  const radios = getAllByRole('radio');
  expect(radios).toHaveLength(OPTIONS.length);
});

test('click on a radio should call onChange prop', async () => {
  const onChangeMock = vi.fn();
  const { getByRole } = render(RadioButtons, {
    options: OPTIONS,
    label: 'Example',
    value: OPTIONS[0].id,
    onChange: onChangeMock,
  });

  const radio = getByRole('radio', { name: OPTIONS[5].label });
  expect(radio).toBeDefined();
  await fireEvent.click(radio);

  expect(onChangeMock).toHaveBeenCalledWith(OPTIONS[5].id);
});

test('disable radio buttons should have proper styling', async () => {
  const { getByRole, getAllByRole } = render(RadioButtons, {
    options: OPTIONS,
    label: 'Example',
    value: OPTIONS[0].id,
    onChange: vi.fn(),
    disabled: true,
  });

  const group = getByRole('radiogroup', { name: 'Example' });
  expect(group).toHaveClass('border-[var(--pd-button-disabled)]');

  const buttons = getAllByRole('radio');
  expect(buttons).toHaveLength(OPTIONS.length);
  for (const button of buttons) {
    expect(button).toHaveClass('bg-[var(--pd-button-disabled)]');
    expect(button).toHaveClass('text-[var(--pd-button-disabled-text)]');
  }
});
