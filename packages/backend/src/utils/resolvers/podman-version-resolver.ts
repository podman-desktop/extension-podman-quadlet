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
import { SemVer } from 'semver';
import type { Resolver } from './resolver';
import type { CancellationToken, Logger } from '@podman-desktop/api';
import type { PodmanWorker } from '../worker/podman-worker';

export const VERSION_FALLBACK = new SemVer('0.0.1');

export class PodmanVersionResolver implements Resolver<SemVer> {
  private cached: SemVer | undefined;

  constructor(private executor: PodmanWorker) {}

  async resolve(options?: { token?: CancellationToken; logger?: Logger }): Promise<SemVer> {
    if (this.cached) return this.cached;

    try {
      const result = await this.executor.podmanExec({
        args: ['--version'],
        ...options,
      });
      const parts = result.stdout.trim().split(' ');
      this.cached = new SemVer(parts[parts.length - 1]);
      return this.cached;
    } catch (err: unknown) {
      console.error('something went wrong while getting the podman version', err);
      return VERSION_FALLBACK;
    }
  }
}
