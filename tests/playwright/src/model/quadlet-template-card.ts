import type { Locator } from '@playwright/test';

export class QuadletTemplateCard {
  #import: Locator;
  readonly title: Locator;

  constructor(public row: Locator) {
    this.#import = row.getByRole('button', { name: 'import' });
    this.title = row.getByRole('heading');
  }

  importTemplate(): Promise<void> {
    return this.#import.click();
  }
}
