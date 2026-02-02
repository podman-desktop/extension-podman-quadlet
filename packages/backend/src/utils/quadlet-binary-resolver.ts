/**********************************************************************
 * Copyright (C) 2025-2026 Red Hat, Inc.
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

import type { CancellationToken, Logger } from '@podman-desktop/api';
import { isAbsolute, join } from 'node:path/posix';
import type { PodmanWorker } from './worker/podman-worker';

export const PODMAN_SYSTEMD_GENERATOR = 'podman-system-generator';
export const BINARY_FALLBACK = '/usr/libexec/podman/quadlet';

export class QuadletBinaryResolver {
  private cachedPath: string | undefined;

  constructor(private executor: PodmanWorker) {}

  async resolve(options?: { token?: CancellationToken; logger?: Logger }): Promise<string> {
    if (this.cachedPath) return this.cachedPath;

    options?.logger?.log('getting quadlet binary using systemd-path');

    try {
      const result = await this.executor.exec('systemd-path', {
        args: ['systemd-system-generator'],
        token: options?.token,
      });

      const systemdGeneratorDirectory = result.stdout.trim();
      if (!isAbsolute(systemdGeneratorDirectory))
        throw new Error(`systemd-system-generator directory is not absolute, received "${systemdGeneratorDirectory}".`);

      const symlink = join(systemdGeneratorDirectory, PODMAN_SYSTEMD_GENERATOR);
      /**
       * https://github.com/podman-desktop/extension-podman-quadlet/issues/1199
       * On Linux when using flatpak we cannot use the {@link import('node:fs/promise').realpath} because the
       * /usr/lib/systemd/system-generators is not accessible leading to the error
       * `ENOENT: no such file or directory, realpath /usr/lib/systemd/system-generators/podman-system-generator`
       */
      const realpathResult = await this.executor.exec('realpath', {
        args: [symlink],
        token: options?.token,
      });
      const path = realpathResult.stdout.trim();
      this.cachedPath = path;
      return path;
    } catch (err: unknown) {
      options?.logger?.error('something went wrong while getting the quadlet binary', err);
      return BINARY_FALLBACK;
    }
  }
}
