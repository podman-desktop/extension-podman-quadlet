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
import type { Resolver } from '/@/utils/resolvers/resolver';
import type { CancellationToken, Logger } from '@podman-desktop/api';
import type { PodmanWorker } from '/@/utils/worker/podman-worker';

/**
 * If we cannot determine the engine's privilege level, default to rootless: this matches
 * the extension's pre-existing (rootless-only) behaviour, and avoids attempting admin-scope
 * operations against a connection we are not sure can support them.
 */
export const ROOTLESS_FALLBACK = true;

export class RootlessResolver implements Resolver<boolean> {
  private cached: boolean | undefined;

  constructor(private executor: PodmanWorker) {}

  async resolve(options?: { token?: CancellationToken; logger?: Logger }): Promise<boolean> {
    if (this.cached !== undefined) return this.cached;

    try {
      const result = await this.executor.podmanExec({
        args: ['info', '--format', '{{.Host.Security.Rootless}}'],
        ...options,
      });
      this.cached = result.stdout.trim() === 'true';
      return this.cached;
    } catch (err: unknown) {
      console.error('something went wrong while getting the rootless status', err);
      return ROOTLESS_FALLBACK;
    }
  }
}
