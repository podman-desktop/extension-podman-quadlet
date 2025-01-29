import type { ExtensionsPage } from '@podman-desktop/tests-playwright';
import {
  ensureCliInstalled,
  expect as playExpect,
  test,
  RunnerOptions,
  waitForPodmanMachineStartup,
} from '@podman-desktop/tests-playwright';
import { PdQuadletDetailsPage } from './model/pd-quadlet-details-page';
import { QuadletListPage } from './model/quadlet-list-page';
import { handleWebview } from './utils/webviewHandler';

const PODMAN_QUADLET_EXTENSION_OCI_IMAGE =
  process.env.EXTENSION_OCI_IMAGE ?? 'ghcr.io/podman-desktop/pd-extension-quadlet:latest';
const PODMAN_QUADLET_EXTENSION_PREINSTALLED: boolean = process.env.EXTENSION_PREINSTALLED === 'true';
const PODMAN_QUADLET_CATALOG_EXTENSION_LABEL: string = 'podman-desktop.quadlet';
const PODMAN_QUADLET_CATALOG_EXTENSION_NAME: string = 'Podman Quadlet';
const PODMAN_QUADLET_CATALOG_STATUS_ACTIVE: string = 'ACTIVE';

const QUAY_HELLO_IMAGE_REPO = 'quay.io/podman/hello';
const QUAY_HELLO_IMAGE_TAG = 'latest';
const QUAY_HELLO_IMAGE = `${QUAY_HELLO_IMAGE_REPO}:${QUAY_HELLO_IMAGE_TAG}`;

test.use({
  runnerOptions: new RunnerOptions({
    customFolder: 'pd-extension-quadlet-tests',
    /**
     * For performance reasons, disable extensions which are not necessary for the e2e
     */
    customSettings: {
      'extensions.disabled': [
        'podman-desktop.compose',
        'podman-desktop.docker',
        'podman-desktop.kind',
        'podman-desktop.kube-context',
        'podman-desktop.kubectl-cli',
        'podman-desktop.lima',
        'podman-desktop.minikube',
        'podman-desktop.registries',
      ],
    },
  }),
});

test.beforeAll(async ({ runner, welcomePage, page }) => {
  // 80s timeout
  test.setTimeout(80_000);

  runner.setVideoAndTraceName('podman-quadlet-e2e');
  await welcomePage.handleWelcomePage(true);
  await waitForPodmanMachineStartup(page, 80_000); // default is 30s let's increase that to 80s
});

test.afterAll(async ({ runner }) => {
  test.setTimeout(200_000);
  await runner.close();
});

test.describe.serial(`Podman Quadlet extension installation and verification`, { tag: '@smoke' }, () => {
  test.describe.serial(`Podman Quadlet extension installation`, () => {
    let extensionsPage: ExtensionsPage;

    test(`Open Settings -> Extensions page`, async ({ navigationBar }) => {
      const dashboardPage = await navigationBar.openDashboard();
      await playExpect(dashboardPage.mainPage).toBeVisible();
      extensionsPage = await navigationBar.openExtensions();
      await playExpect(extensionsPage.header).toBeVisible();
    });

    test(`Install Podman Quadlet extension`, async () => {
      test.skip(PODMAN_QUADLET_EXTENSION_PREINSTALLED, 'Podman Quadlet extension is preinstalled');
      await extensionsPage.installExtensionFromOCIImage(PODMAN_QUADLET_EXTENSION_OCI_IMAGE);
    });

    test('Extension (card) is installed, present and active', async ({ navigationBar }) => {
      const extensions = await navigationBar.openExtensions();
      await playExpect
        .poll(async () => await extensions.extensionIsInstalled(PODMAN_QUADLET_CATALOG_EXTENSION_LABEL), {
          timeout: 30000,
        })
        .toBeTruthy();
      const extensionCard = await extensions.getInstalledExtension(
        PODMAN_QUADLET_CATALOG_EXTENSION_NAME,
        PODMAN_QUADLET_CATALOG_EXTENSION_LABEL,
      );
      await playExpect(extensionCard.status).toHaveText(PODMAN_QUADLET_CATALOG_STATUS_ACTIVE);
    });

    test(`Extension's details show correct status, no error`, async ({ page, navigationBar }) => {
      const extensions = await navigationBar.openExtensions();
      const extensionCard = await extensions.getInstalledExtension('quadlet', PODMAN_QUADLET_CATALOG_EXTENSION_LABEL);
      await extensionCard.openExtensionDetails(PODMAN_QUADLET_CATALOG_EXTENSION_NAME);
      const details = new PdQuadletDetailsPage(page);
      await playExpect(details.heading).toBeVisible();
      await playExpect(details.status).toHaveText(PODMAN_QUADLET_CATALOG_STATUS_ACTIVE);
      const errorTab = details.tabs.getByRole('button', { name: 'Error' });
      // we would like to propagate the error's stack trace into test failure message
      let stackTrace = '';
      if ((await errorTab.count()) > 0) {
        await details.activateTab('Error');
        stackTrace = await details.errorStackTrace.innerText();
      }
      await playExpect(errorTab, `Error Tab was present with stackTrace: ${stackTrace}`).not.toBeVisible();
    });
  });

  test('Install Podlet CLI', async ({ navigationBar, page }) => {
    const settingsBar = await navigationBar.openSettings();
    await settingsBar.cliToolsTab.click();
    await ensureCliInstalled(page, 'Podlet');
  });

  test.describe.serial('Generate quadlets', () => {
    let quadletListPage: QuadletListPage;

    test.beforeAll('Pull Images & Start Hello Container', async ({ navigationBar }) => {
      // let's pull QUAY_HELLO_IMAGE image
      const imagesPage = await navigationBar.openImages();
      await playExpect(imagesPage.heading).toBeVisible();

      const pullImagePage = await imagesPage.openPullImage();
      const updatedImages = await pullImagePage.pullImage(QUAY_HELLO_IMAGE);

      const exists = await updatedImages.waitForImageExists(QUAY_HELLO_IMAGE_REPO);
      playExpect(exists, `${QUAY_HELLO_IMAGE} image not present in the list of images\`).toBeTruthy();`);
    });

    test.beforeEach('Open Podman Quadlet webview', async ({ runner, page, navigationBar }) => {
      // open the webview
      const [pdPage, webview] = await handleWebview(runner, page, navigationBar);
      quadletListPage = new QuadletListPage(pdPage, webview);
      // warning: might be a problem if we are already on the webview
      await quadletListPage.waitForLoad();
    });

    test(`generate ${QUAY_HELLO_IMAGE} image quadlet`, async () => {
      test.setTimeout(150_000);

      const generateForm = await quadletListPage.navigateToGenerateForm();
      await generateForm.waitForLoad();

      await playExpect(generateForm.cancelButton).toBeEnabled();
      await playExpect(generateForm.generateButton).toBeDisabled(); // default should be disabled

      // open the select dropdown
      const podmanProviders = await generateForm.containerEngineSelect.getOptions();
      playExpect(podmanProviders.length).toBeGreaterThan(0);

      const sorted = podmanProviders.find(provider => provider.toLowerCase().includes('podman'));
      if (!sorted) throw new Error('cannot found podman provider');

      // Value can be `podman-machine-default (WSL)`
      const machine = sorted.split(' ')[0];
      console.log(`Trying to use provider ${machine}`);
      await generateForm.containerEngineSelect.set(machine);

      // wait for loading to be finished
      await playExpect
        .poll(async () => await generateForm.isLoading(), {
          timeout: 5_000,
        })
        .toBeFalsy();

      // select the image
      const options = await generateForm.quadletType.getOptions();
      playExpect(options).toContain('image');
      await generateForm.quadletType.select('image');

      // wait for loading to be finished
      await playExpect
        .poll(async () => await generateForm.isLoading(), {
          timeout: 5_000,
        })
        .toBeFalsy();

      // select hello world image
      const images = await generateForm.imageSelect.getOptions();
      playExpect(images.length).toBeGreaterThan(0);
      playExpect(images).toContain(QUAY_HELLO_IMAGE);
      await generateForm.imageSelect.set(QUAY_HELLO_IMAGE);

      // wait for generateButton to be enabled
      await playExpect
        .poll(async () => await generateForm.generateButton.isEnabled(), {
          timeout: 5_000,
        })
        .toBeTruthy();

      // generate
      await generateForm.generateButton.click();

      // wait for loading (generate) to be finished
      await playExpect
        .poll(async () => await generateForm.isLoading(), {
          timeout: 15_000,
        })
        .toBeFalsy();

      // wait for content to be available
      await playExpect
        .poll(
          async (): Promise<boolean> => {
            const monacoEditor = generateForm.webview.locator('.monaco-editor').nth(0);
            const content = await monacoEditor.textContent();
            return content?.includes('[Image]Arch=amd64Image=quay.io/podman/hello:latestOS=linux') ?? false;
          },
          {
            timeout: 5_000,
          },
        )
        .toBeTruthy();

      // wait for saveIntoMachine button to be enabled
      await playExpect
        .poll(async () => await generateForm.saveIntoMachine.isEnabled(), {
          timeout: 5_000,
        })
        .toBeTruthy();

      // start save into machine
      await generateForm.saveIntoMachine.click();

      // wait for complete button to appear
      await playExpect
        .poll(async () => await generateForm.gotoPageButton.isEnabled(), {
          timeout: 15_000,
        })
        .toBeTruthy();
    });
  });
});
