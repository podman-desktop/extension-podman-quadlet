import { QuadletBasePage } from './quadlet-base-page';
import type { Locator, Page } from '@playwright/test';
import { expect as playExpect } from '@playwright/test';

export class QuadletDetailsPage extends QuadletBasePage {
  readonly actions: Locator;
  readonly start: Locator;
  readonly stop: Locator;
  readonly remove: Locator;
  readonly restart: Locator;

  constructor(page: Page, webview: Page, service: string) {
    super(page, webview, service);

    this.actions = this.webview.getByRole('group', { name: 'Control Actions' });

    // actions button
    this.start = this.actions.getByRole('button', { name: 'Start quadlet' });
    this.stop = this.actions.getByRole('button', { name: 'Stop quadlet' });
    this.remove = this.actions.getByRole('button', { name: 'Remove quadlet' });
    this.restart = this.actions.getByRole('button', { name: 'Restart quadlet' });
  }

  async isActive(): Promise<boolean> {
    const div = this.webview.getByRole('status');
    const title = await div.getAttribute('title');
    return title === 'RUNNING';
  }

  waitForLoad(): Promise<void> {
    return playExpect(this.heading).toBeVisible();
  }
}
