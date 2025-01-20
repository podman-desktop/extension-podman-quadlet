import type { Locator, Page } from '@playwright/test';
import { expect as playExpect } from '@playwright/test';
import { QuadletBasePage } from './quadlet-base-page';
import { SvelteSelect } from '../utils/svelte-select';
import { RadioButtonsHandler } from '../utils/radio-buttons-handler';

export class QuadletGeneratePage extends QuadletBasePage {
  // step 1 (options / configure)
  readonly containerEngineSelect: SvelteSelect;

  readonly quadletType: RadioButtonsHandler;

  readonly generateButton: Locator;
  readonly cancelButton: Locator;

  readonly containerSelect: SvelteSelect;
  readonly imageSelect: SvelteSelect;

  // step 2 (edit monaco)
  readonly saveIntoMachine: Locator;

  // step 3 (complete)
  readonly gotoPageButton: Locator;

  constructor(page: Page, webview: Page) {
    super(page, webview, 'Generate Quadlet');
    // step 1
    this.generateButton = this.webview.getByRole('button', { name: 'Generate' });
    this.cancelButton = this.webview.getByRole('button', { name: 'cancel' });

    this.quadletType = new RadioButtonsHandler(this.webview, 'Quadlet type');

    this.containerEngineSelect = new SvelteSelect(this.webview, 'Select Container Engine');
    this.containerSelect = new SvelteSelect(this.webview, 'Select Container');
    this.imageSelect = new SvelteSelect(this.webview, 'Select Image');

    // step 2
    this.saveIntoMachine = this.webview.getByRole('button', { name: 'Load into machine' });

    // step 3
    this.gotoPageButton = this.webview.getByRole('button', { name: 'Go to quadlet list' });
  }

  async isLoading(): Promise<boolean> {
    const locator = this.webview.getByRole('progressbar');
    return (await locator.all()).length > 0;
  }

  waitForLoad(): Promise<void> {
    return playExpect(this.heading).toBeVisible();
  }
}
