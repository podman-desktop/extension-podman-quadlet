import type { Locator, Page } from '@playwright/test';
import { expect as playExpect } from '@podman-desktop/tests-playwright';

export class SvelteSelect {
  readonly select: Locator;
  readonly input: Locator;
  readonly list: Locator;

  constructor(
    protected page: Page,
    label: string,
  ) {
    this.input = page.getByLabel(label, { exact: true });
    this.select = this.input.locator('..').locator('..');
    this.list = this.select.locator('.svelte-select-list');
  }

  protected async isOpen(): Promise<boolean> {
    const list = this.select.locator('.svelte-select-list');
    return (await list.all()).length > 0;
  }

  protected async open(): Promise<void> {
    const isOpen = await this.isOpen();
    if (isOpen) return;
    await this.select.click();

    return playExpect
      .poll(async () => await this.isOpen(), {
        timeout: 2_000,
      })
      .toBeTruthy();
  }

  async getOptions(): Promise<string[]> {
    await this.open();

    // get all item
    const options = await this.select.locator('.list-item').all();
    const output: string[] = [];
    for (const option of options) {
      const text = await option.textContent();
      if (text) {
        output.push(text.trim());
      }
    }

    return output;
  }

  async set(option: string): Promise<void> {
    // select container engine
    await this.input.fill(option);
    await this.page.keyboard.press('Enter');
  }
}
