/**
 * @author axel7083
 */
import { expect, test, vi, beforeEach } from 'vitest';
import type { WebviewPanel, window as windowsApi } from '@podman-desktop/api';
import { Uri } from '@podman-desktop/api';
import { WebviewService } from './webview-service';
import { readFile } from 'node:fs/promises';

vi.mock(import('node:fs/promises'));

const windowMock: typeof windowsApi = {
  createWebviewPanel: vi.fn(),
} as unknown as typeof windowsApi;

function getWebviewService(): WebviewService {
  return new WebviewService({
    window: windowMock,
    extensionUri: {} as unknown as Uri,
  });
}

const webviewPanelMock: WebviewPanel = {
  webview: {
    html: undefined,
  },
  dispose: vi.fn(),
} as unknown as WebviewPanel;

const mockedHTML = '<div>Hello</div>';

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(windowMock.createWebviewPanel).mockReturnValue(webviewPanelMock);
  vi.mocked(Uri.joinPath).mockReturnValue({
    fsPath: '',
  } as unknown as Uri);

  vi.mocked(readFile).mockResolvedValue(mockedHTML);
});

test('non-init service should throw an error trying to access webview', async () => {
  const webview = getWebviewService();

  expect(() => {
    webview.getPanel();
  }).toThrowError('webview panel is not initialized.');
});

test('expect init to define html content', async () => {
  const webview = getWebviewService();
  await webview.init();

  const panel = webview.getPanel();
  expect(panel.webview.html).toBe(mockedHTML);
});

test('expect dispose to dispose webview', async () => {
  const webview = getWebviewService();
  await webview.init();

  webview.dispose();
  expect(webviewPanelMock.dispose).toHaveBeenCalled();
});
