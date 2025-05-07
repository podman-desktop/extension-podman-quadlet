import { QuadletBasePage } from './quadlet-base-page';
import type { Locator, Page } from '@playwright/test';
import { expect as playExpect } from '@playwright/test';
import { SvelteSelect } from '../utils/svelte-select';

export class QuadletCreate extends QuadletBasePage {
  readonly tabs: Locator;
  readonly containerEngineSelect: SvelteSelect;
  readonly loadIntoMachineBtn: Locator;

  constructor(page: Page, webview: Page) {
    super(page, webview, 'Create');

    this.tabs = this.webview.getByRole('tab');
    this.containerEngineSelect = new SvelteSelect(this.webview, 'Select Container Engine');
    this.loadIntoMachineBtn = this.webview.getByRole('button', { name: 'Load Into Machine' });
  }

  waitForLoad(): Promise<void> {
    return playExpect(this.heading).toBeVisible();
  }
}
