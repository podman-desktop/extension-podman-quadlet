import type { ExtensionsPage } from '@podman-desktop/tests-playwright';
import {
  expect as playExpect,
  test,
  RunnerOptions,
  waitForPodmanMachineStartup,
  deleteContainer,
} from '@podman-desktop/tests-playwright';
import { PdQuadletDetailsPage } from './model/pd-quadlet-details-page';
import { PODMAN_QUADLET_PAGE_BODY_LABEL } from './utils/webviewHandler';
import { GENERATE_TESTS } from './constants';
import { QuadletGeneratePage } from './model/quadlet-generate-page';

const PODMAN_QUADLET_EXTENSION_OCI_IMAGE =
  process.env.EXTENSION_OCI_IMAGE ?? 'ghcr.io/podman-desktop/pd-extension-quadlet:latest';
const PODMAN_QUADLET_EXTENSION_PREINSTALLED: boolean = process.env.EXTENSION_PREINSTALLED === 'true';
const PODMAN_QUADLET_CATALOG_EXTENSION_LABEL: string = 'podman-desktop.quadlet';
const PODMAN_QUADLET_CATALOG_EXTENSION_NAME: string = 'Podman Quadlet';
const PODMAN_QUADLET_CATALOG_STATUS_ACTIVE: string = 'ACTIVE';

const ALPINE_IMAGE_REPO = 'docker.io/library/alpine';
const ALPINE_IMAGE_TAG = 'latest';
const ALPINE_IMAGE = `${ALPINE_IMAGE_REPO}:${ALPINE_IMAGE_TAG}`;

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

test.afterAll(async ({ runner, page }) => {
  test.setTimeout(200_000);

  // delete all containers
  for (const container of GENERATE_TESTS.map(scenario => scenario.name)) {
    await deleteContainer(page, container);
  }

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

  test.describe.serial('Generate quadlets', () => {
    test.beforeAll('Pull Images', async ({ navigationBar }) => {
      // let's pull ALPINE_IMAGE image
      const imagesPage = await navigationBar.openImages();
      await playExpect(imagesPage.heading).toBeVisible();

      const pullImagePage = await imagesPage.openPullImage();
      const updatedImages = await pullImagePage.pullImage(ALPINE_IMAGE);

      const exists = await updatedImages.waitForImageExists(ALPINE_IMAGE_REPO);
      playExpect(exists, `${ALPINE_IMAGE} image not present in the list of images\`).toBeTruthy();`);
    });

    for (const scenario of GENERATE_TESTS) {
      test(`quadlet generate testing ${scenario.name}`, async ({ navigationBar, page, runner }) => {
        // 1. go to images page
        const imagesPage = await navigationBar.openImages();
        await playExpect(imagesPage.heading).toBeVisible();

        // 2. open image imageDetails
        const imageDetails = await imagesPage.openImageDetails(ALPINE_IMAGE_REPO);
        const runImage = await imageDetails.openRunImage();

        if (scenario.options.entrypoint) {
          await runImage.containerEntryPointInput.fill(scenario.options.entrypoint);
        }

        // 3. run container
        const containers = await test.step('starting container', async () => {
          // little trick bellow is needed
          // TODO: remove after a release including (https://github.com/podman-desktop/podman-desktop/pull/11159)
          await runImage.activateTab('Advanced');
          const checkbox = runImage.getPage().getByRole('checkbox', {
            name: 'Use interactive',
          });
          await checkbox.uncheck();

          const containers = await runImage.startContainer(scenario.containerName, {
            attachTerminal: false,
          });
          await playExpect(containers.header).toBeVisible();

          return containers;
        });

        await playExpect
          .poll(async () => await containers.containerExists(scenario.containerName), { timeout: 15_000 })
          .toBeTruthy();

        const containerDetails = await containers.openContainersDetails(scenario.containerName);

        // Get the contribution action (Generate Quadlet)
        const generateBtn = containerDetails.controlActions.getByRole('button', { name: 'Generate Quadlet' });
        await generateBtn.click();

        // wait for page to be open
        await page.waitForTimeout(2_000);

        const webView = page.getByRole('document', { name: PODMAN_QUADLET_PAGE_BODY_LABEL });
        await playExpect(webView).toBeVisible();

        const [mainPage, webViewPage] = runner.getElectronApp().windows();

        const generateForm = new QuadletGeneratePage(mainPage, webViewPage);
        await generateForm.waitForLoad();

        // wait for loading to be finished
        await playExpect
          .poll(async () => await generateForm.isLoading(), {
            timeout: 5_000,
          })
          .toBeFalsy();

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
          .poll<string>(
            async (): Promise<string> => {
              const monacoEditor = generateForm.webview.locator('.monaco-editor').nth(0);
              // get all lines
              const content = await monacoEditor.locator('.view-line').allTextContents();
              // join lines with new line separator
              return content.join('\n').trim();
            },
            {
              timeout: 5_000,
            },
          )
          .toStrictEqual(scenario.quadlet);
      });
    }
  });
});
