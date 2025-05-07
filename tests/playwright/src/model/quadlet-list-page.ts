import type { Locator, Page } from '@playwright/test';
import test, { expect as playExpect } from '@playwright/test';
import { QuadletBasePage } from './quadlet-base-page';
import { QuadletGeneratePage } from './quadlet-generate-page';
import { handleConfirmationDialog } from '@podman-desktop/tests-playwright';
import { QuadletTemplatePage } from './quadlet-template-page';

export class QuadletListPage extends QuadletBasePage {
  readonly generateButton: Locator;
  readonly createButton: Locator;
  readonly table: Locator;
  readonly rows: Locator;

  constructor(page: Page, webview: Page) {
    super(page, webview, 'Podman Quadlets');

    this.generateButton = this.webview.getByRole('button', { name: 'Generate Quadlet' });
    this.createButton = this.webview.getByRole('button', { name: 'Create Quadlet' });
    this.table = this.webview.getByRole('table', { name: 'quadlets' });
    this.rows = this.table.getByRole('row');
  }

  async pageIsEmpty(): Promise<boolean> {
    const emptyHeading = this.webview.getByRole('heading', { name: 'No Quadlets', exact: true });
    return (await emptyHeading.count()) > 0;
  }

  async waitForLoad(): Promise<void> {
    await playExpect(this.heading).toBeVisible();
  }

  async navigateToGenerateForm(): Promise<QuadletGeneratePage> {
    await playExpect(this.generateButton).toBeEnabled();
    await this.generateButton.click();
    return new QuadletGeneratePage(this.page, this.webview);
  }

  async createQuadletFromTemplate(): Promise<QuadletTemplatePage> {
    await playExpect(this.createButton).toBeEnabled();
    await this.createButton.click();

    try {
      await handleConfirmationDialog(this.page, 'Podman Quadlet', true, 'Using Template');
    } catch (error) {
      console.warn(`Warning: Could not reset the app, repository probably clean.\n\t${error}`);
    }
    return new QuadletTemplatePage(this.page, this.webview);
  }

  async getQuadletRow(service: string): Promise<Locator> {
    return test.step(`Get service ${service} row`, async () => {
      await this.waitForLoad();

      const rows = await this.rows.all();
      // start at 1 : skip table header
      for (let i = 1; i < rows.length; i++) {
        const text = await rows[i].getByRole('cell').nth(3).textContent();
        if (text?.trim() === service) return rows[i];
      }
      throw new Error(`cannot found row for service ${service}`);
    });
  }
}
