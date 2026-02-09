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
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { PodApiImpl } from './pod-api-impl';
import type { PodService } from '../services/pod-service';
import type {
  SimplePodInfo,
  ProviderContainerConnectionIdentifierInfo,
} from '@podman-desktop/quadlet-extension-core-api';

const POD_SERVICE_MOCK: PodService = {
  all: vi.fn(),
} as unknown as PodService;

beforeEach(() => {
  vi.resetAllMocks();
});

describe('PodApiImpl#all', () => {
  test('expect result to be properly propagated from PodService', async () => {
    const provider: ProviderContainerConnectionIdentifierInfo = {
      providerId: 'providerId',
      name: 'connectionName',
    };
    const pods: SimplePodInfo[] = [
      {
        id: 'podId',
        name: 'podName',
        status: 'Running',
        containers: [],
        connection: provider,
      },
    ];
    vi.mocked(POD_SERVICE_MOCK.all).mockResolvedValue(pods);
    const api = new PodApiImpl({
      pods: POD_SERVICE_MOCK,
    });
    const result = await api.all(provider);
    expect(result).toStrictEqual(pods);
    expect(POD_SERVICE_MOCK.all).toHaveBeenCalledWith(provider);
  });

  test('expect error to be propagated', async () => {
    vi.mocked(POD_SERVICE_MOCK.all).mockRejectedValue(new Error('Something went wrong'));
    const api = new PodApiImpl({
      pods: POD_SERVICE_MOCK,
    });

    const provider: ProviderContainerConnectionIdentifierInfo = {
      providerId: 'providerId',
      name: 'connectionName',
    };

    await expect(() => {
      return api.all(provider);
    }).rejects.toThrowError('Something went wrong');
  });
});
