/**********************************************************************
 * Copyright (C) 2026 Red Hat, Inc.
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
import { expect, test, vi, beforeEach } from 'vitest';
import { VolumeApiImpl } from './volume-api-impl';
import type { VolumeService } from '../services/volume-service';
import type {
  ProviderContainerConnectionIdentifierInfo,
  SimpleVolumeInfo,
} from '@podman-desktop/quadlet-extension-core-api';

const VOLUME_SERVICE_MOCK: VolumeService = {
  all: vi.fn(),
} as unknown as VolumeService;

const CONTAINER_CONNECTION_MOCK: ProviderContainerConnectionIdentifierInfo = {
  providerId: 'my-provider',
  name: 'my-connection',
};

const VOLUMES_MOCK: SimpleVolumeInfo[] = [
  {
    name: 'volume1',
    driver: 'local',
    mountpoint: '/path1',
    connection: CONTAINER_CONNECTION_MOCK,
  },
];

beforeEach(() => {
  vi.resetAllMocks();
});

test('expect all to be properly propagated from VolumeService', async () => {
  vi.mocked(VOLUME_SERVICE_MOCK.all).mockResolvedValue(VOLUMES_MOCK);
  const volumeApi = new VolumeApiImpl({
    volumes: VOLUME_SERVICE_MOCK,
  });
  const result = await volumeApi.all(CONTAINER_CONNECTION_MOCK);
  expect(result).toStrictEqual(VOLUMES_MOCK);
  expect(VOLUME_SERVICE_MOCK.all).toHaveBeenCalledWith(CONTAINER_CONNECTION_MOCK);
});

test('expect error to be propagated', async () => {
  vi.mocked(VOLUME_SERVICE_MOCK.all).mockRejectedValue(new Error('Something went wrong'));
  const volumeApi = new VolumeApiImpl({
    volumes: VOLUME_SERVICE_MOCK,
  });

  await expect(() => {
    return volumeApi.all({
      providerId: 'my-provider',
      name: 'my-connection',
    });
  }).rejects.toThrowError('Something went wrong');
});
