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

import { fireEvent, within, render } from '@testing-library/svelte';
import { beforeEach, expect, test, describe, vi } from 'vitest';
import Select from '/@/lib/select/Select.svelte';

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

export class SvelteSelectHelper {
  #input: HTMLInputElement;

  constructor(
    protected container: HTMLElement,
    protected label: string,
  ) {
    const element = within(container).getByLabelText(label, { exact: true });
    expect(element).toBeInstanceOf(HTMLInputElement);
    this.#input = element as HTMLInputElement;
  }

  open(): Promise<boolean> {
    return fireEvent.pointerUp(this.#input);
  }

  isOpen(): boolean {
    return !!this.container.querySelector('div[class~="svelte-select-list"]');
  }

  value(): string | undefined {
    return this.container.querySelector('div[class~="selected-item"]')?.textContent;
  }

  async getOptions(): Promise<string[]> {
    if (!this.isOpen()) {
      await this.open();
    }

    const items = this.container.querySelectorAll('div[class~="list-item"]');
    return Array.from(items)
      .map(item => item.textContent?.trim())
      .filter((text): text is string => typeof text === 'string');
  }
}

describe('SvelteSelectHelper#value', () => {
  test('ensure value is the right one', async () => {
    const { container } = render(Select, {
      label: 'Svelte Select Helper',
      value: { label: 'hello', value: 'hello' },
      items: [
        { label: 'hello', value: 'hello' },
        { label: 'world', value: 'world' },
      ],
    });

    const select = new SvelteSelectHelper(container, 'Svelte Select Helper');
    expect(select.value()).toBe('hello');
  });

  test('expect undefined when no value is selected', async () => {
    const { container } = render(Select, {
      label: 'Svelte Select Helper',
      items: [
        { label: 'hello', value: 'hello' },
        { label: 'world', value: 'world' },
      ],
    });

    const select = new SvelteSelectHelper(container, 'Svelte Select Helper');
    expect(select.value()).toBeUndefined();
  });
});

test('ensure SvelteSelectHelper return expected options', async () => {
  const { container } = render(Select, {
    label: 'Svelte Select Helper',
    items: [
      { label: 'hello', value: 'hello' },
      { label: 'world', value: 'world' },
    ],
  });

  const select = new SvelteSelectHelper(container, 'Svelte Select Helper');
  const options: string[] = await select.getOptions();
  expect(options).toStrictEqual(['hello', 'world']);
});
