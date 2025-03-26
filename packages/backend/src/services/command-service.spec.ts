/**********************************************************************
 * Copyright (C) 2025 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import { beforeEach, vi, test, expect, assert, describe } from 'vitest';
import {
  COMPOSE_LABEL_CONFIG_FILES,
  COMPOSE_LABEL_WORKING_DIR,
  PODLET_COMPOSE_CMD,
  PODLET_GENERATE_CONTAINER_CMD,
} from '../utils/constants';
import { CommandService } from './command-service';
import type { commands as commandsApi, Disposable, ProviderContainerConnection } from '@podman-desktop/api';
import type { RoutingService } from './routing-service';
import type { ContainerService } from './container-service';
import type { ProviderService } from './provider-service';
import type { ComposeInfoUI } from '../models/compose-info-ui';
import { stat } from 'node:fs/promises';
import type { BigIntStats, Stats } from 'node:fs';
import { join } from 'node:path';
import type { ContainerInfoUI } from '../models/container-info-ui';
import type { ProviderContainerConnectionDetailedInfo } from '/@shared/src/models/provider-container-connection-detailed-info';

const COMMAND_API_MOCK: typeof commandsApi = {
  registerCommand: vi.fn(),
} as unknown as typeof commandsApi;
const ROUTING_MOCK: RoutingService = {
  openQuadletCompose: vi.fn(),
  openQuadletCreateContainer: vi.fn(),
} as unknown as RoutingService;
const CONTAINER_SERVICE_MOCK: ContainerService = {
  getRunningProviderContainerConnectionByEngineId: vi.fn(),
} as unknown as ContainerService;
const PROVIDER_SERVICE_MOCK: ProviderService = {
  toProviderContainerConnectionDetailedInfo: vi.fn(),
} as unknown as ProviderService;

const PROVIDER_MOCK: ProviderContainerConnection = {} as unknown as ProviderContainerConnection;
const PROVIDER_INFO_MOCK: ProviderContainerConnectionDetailedInfo =
  {} as unknown as ProviderContainerConnectionDetailedInfo;

const DISPOSABLE_MOCK: Disposable = {
  dispose: vi.fn(),
};

vi.mock(import('node:fs/promises'));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(COMMAND_API_MOCK.registerCommand).mockReturnValue(DISPOSABLE_MOCK);
  vi.mocked(CONTAINER_SERVICE_MOCK.getRunningProviderContainerConnectionByEngineId).mockResolvedValue(PROVIDER_MOCK);
  vi.mocked(PROVIDER_SERVICE_MOCK.toProviderContainerConnectionDetailedInfo).mockReturnValue(PROVIDER_INFO_MOCK);
});

function getCommandService(): CommandService {
  return new CommandService({
    commandsApi: COMMAND_API_MOCK,
    routing: ROUTING_MOCK,
    containers: CONTAINER_SERVICE_MOCK,
    providers: PROVIDER_SERVICE_MOCK,
  });
}

async function getComposeHandler(): Promise<(raw: ComposeInfoUI) => Promise<void>> {
  const commands = getCommandService();
  await commands.init();
  // extract the PODLET_COMPOSE_CMD handler
  const handler = vi
    .mocked(COMMAND_API_MOCK.registerCommand)
    .mock.calls.find(([command]) => command === PODLET_COMPOSE_CMD)?.[1];
  assert(handler, `handler for command ${PODLET_COMPOSE_CMD} should be defined`);
  return handler;
}

async function getContainerGenerateHandler(): Promise<(container: ContainerInfoUI) => Promise<void>> {
  const commands = getCommandService();
  await commands.init();
  // extract the PODLET_GENERATE_CONTAINER_CMD handler
  const handler = vi
    .mocked(COMMAND_API_MOCK.registerCommand)
    .mock.calls.find(([command]) => command === PODLET_GENERATE_CONTAINER_CMD)?.[1];
  assert(handler, `handler for command ${PODLET_GENERATE_CONTAINER_CMD} should be defined`);
  return handler;
}

test.each<string>([PODLET_COMPOSE_CMD, PODLET_GENERATE_CONTAINER_CMD])(
  'CommandService#init should register command %s',
  async (command: string) => {
    const commands = getCommandService();
    await commands.init();

    expect(COMMAND_API_MOCK.registerCommand).toHaveBeenCalledWith(command, expect.any(Function));
  },
);

test('disposing the command service should dispose resources', async () => {
  const commands = getCommandService();
  await commands.init();

  commands.dispose();
  // we have two commands registered
  expect(DISPOSABLE_MOCK.dispose).toHaveBeenCalledTimes(2);
});

describe(`${PODLET_COMPOSE_CMD} command`, () => {
  beforeEach(() => {
    vi.mocked(stat).mockResolvedValue({
      isFile: () => true,
    } as unknown as Stats | BigIntStats);
  });

  test(`no containers should throw an error`, async () => {
    const handler = await getComposeHandler();
    await expect(() => {
      return handler({
        containers: [],
      } as unknown as ComposeInfoUI);
    }).rejects.toThrowError('cannot generate quadlet without containers in the compose project');
  });

  test(`non-file config file will throw an error`, async () => {
    vi.mocked(stat).mockResolvedValue({
      isFile: () => false,
    } as unknown as Stats | BigIntStats);

    const handler = await getComposeHandler();
    await expect(() => {
      return handler({
        containers: [
          {
            labels: {
              [COMPOSE_LABEL_WORKING_DIR]: 'working-dir',
              [COMPOSE_LABEL_CONFIG_FILES]: 'config.compose',
            },
          },
        ],
      } as unknown as ComposeInfoUI);
    }).rejects.toThrowError(`invalid compose configuration file: ${join('working-dir', 'config.compose')}`);
  });

  test.each([COMPOSE_LABEL_WORKING_DIR, COMPOSE_LABEL_CONFIG_FILES])(
    `missing label should throw an error`,
    async (label: string) => {
      const handler = await getComposeHandler();
      await expect(() => {
        return handler({
          containers: [
            {
              labels: {
                [COMPOSE_LABEL_WORKING_DIR]: 'working-dir',
                [COMPOSE_LABEL_CONFIG_FILES]: 'config.compose',
                [label]: undefined, // overwrite missing label
              },
            },
          ],
        } as unknown as ComposeInfoUI);
      }).rejects.toThrowError(
        'Missing labels com.docker.compose.project.config_files and com.docker.compose.project.config_files in compose containers',
      );
    },
  );

  test('should call RoutingService#openQuadletCompose with appropriate arguments', async () => {
    const handler = await getComposeHandler();
    await handler({
      containers: [
        {
          labels: {
            [COMPOSE_LABEL_WORKING_DIR]: 'working-dir',
            [COMPOSE_LABEL_CONFIG_FILES]: 'config.compose',
          },
        },
      ],
    } as unknown as ComposeInfoUI);

    expect(ROUTING_MOCK.openQuadletCompose).toHaveBeenCalledWith(join('working-dir', 'config.compose'));
  });
});

test(`${PODLET_GENERATE_CONTAINER_CMD} command`, async () => {
  const handler = await getContainerGenerateHandler();
  await handler({
    id: 'container-id',
    engineId: 'dummy-engine-id',
  } as unknown as ContainerInfoUI);

  expect(CONTAINER_SERVICE_MOCK.getRunningProviderContainerConnectionByEngineId).toHaveBeenCalledWith(
    'dummy-engine-id',
  );
  expect(PROVIDER_SERVICE_MOCK.toProviderContainerConnectionDetailedInfo).toHaveBeenCalledWith(PROVIDER_MOCK);

  expect(ROUTING_MOCK.openQuadletCreateContainer).toHaveBeenCalledWith(PROVIDER_INFO_MOCK, 'container-id');
});
