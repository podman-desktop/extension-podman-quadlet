import { QuadletBasePage } from './quadlet-base-page';
import type { Locator, Page } from '@playwright/test';
import { expect as playExpect } from '@playwright/test';


export class QuadletTemplatePage extends QuadletBasePage {
  readonly list: Locator;
  readonly cards: Locator;

  constructor(page: Page, webview: Page) {
    super(page, webview, 'Quadlet Templates');

    this.list = this.webview.getByRole('list', { name: 'templates'});
    this.cards = this.list.getByRole('listitem');
  }

  async getTemplates(): Promise<Array<Locator>> {
    return this.cards.all();
  }

  waitForLoad(): Promise<void> {
    return playExpect(this.heading).toBeVisible();
  }
}
