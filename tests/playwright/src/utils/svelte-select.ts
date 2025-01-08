import type { Locator, Page } from '@playwright/test';

export class SvelteSelect {
  readonly select: Locator;
  readonly input: Locator;

  constructor(
    protected page: Page,
    label: string,
  ) {
    this.input = page.getByLabel(label, { exact: true });
    this.select = this.input.locator('..').locator('..');
  }

  async getOptions(): Promise<string[]> {
    await this.select.click();

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
