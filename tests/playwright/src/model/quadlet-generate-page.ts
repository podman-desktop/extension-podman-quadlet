import type { Locator, Page } from '@playwright/test';
import { expect as playExpect } from '@playwright/test';
import { QuadletBasePage } from './quadlet-base-page';
import { SvelteSelect } from '../utils/svelte-select';

export class QuadletGeneratePage extends QuadletBasePage {
  readonly generateButton: Locator;
  readonly cancelButton: Locator;
  readonly containerEngineSelect: SvelteSelect;
  readonly containerSelect: SvelteSelect;

  constructor(page: Page, webview: Page) {
    super(page, webview, 'Generate Quadlet');

    this.generateButton = this.webview.getByRole('button', { name: 'Generate' });
    this.cancelButton = this.webview.getByRole('button', { name: 'cancel' });

    this.containerEngineSelect = new SvelteSelect(this.webview, 'Select Container Engine');
    this.containerSelect = new SvelteSelect(this.webview, 'Select Container');
  }

  async isLoading(): Promise<boolean> {
    const locator = this.webview.getByRole('progressbar');
    return (await locator.all()).length > 0;
  }

  waitForLoad(): Promise<void> {
    return playExpect(this.heading).toBeVisible();
  }
}
