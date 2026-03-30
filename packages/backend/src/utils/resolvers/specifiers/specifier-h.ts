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
import type { CancellationToken, Logger } from '@podman-desktop/api';
import { SpecifierResolver } from './specifier-resolver';
import { isAbsolute } from 'node:path/posix';
import type { Specifiers } from './specifiers';

export class SpecifierH extends SpecifierResolver {
  override get key(): keyof typeof Specifiers {
    return '%h';
  }

  override async resolve(options?: { token?: CancellationToken; logger?: Logger }): Promise<string> {
    const { stdout } = await this.worker.exec('echo', {
      args: ['"$HOME"'],
      token: options?.token,
      logger: options?.logger,
    });
    if (!isAbsolute(stdout)) {
      throw new Error(`cannot determine home directory: ${stdout} is not an absolute path`);
    }
    return stdout.trim();
  }
}
