import type { Locator, Page } from '@playwright/test';

export class RadioButtonsHandler {
  readonly radioGroup: Locator;

  constructor(
    protected page: Page,
    label: string,
  ) {
    this.radioGroup = page.getByRole('radiogroup', { name: label });
  }

  async getOptions(): Promise<string[]> {
    const radioLocator = this.radioGroup.getByRole('radio');
    const options = await radioLocator.all();
    const output: string[] = [];
    for (const option of options) {
      const text = await option.textContent();
      if (text) {
        output.push(text.trim());
      }
    }

    return output;
  }

  async select(option: string): Promise<void> {
    const button = this.radioGroup.getByRole('radio', { name: option });
    await button.click();
  }
}
