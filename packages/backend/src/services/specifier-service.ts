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
import type { CancellationToken, Disposable, Logger, ProviderContainerConnection } from '@podman-desktop/api';
import { sep, join } from 'node:path/posix';
import { Specifiers } from '../utils/resolvers/specifiers/specifiers';
import type { PodmanService } from './podman-service';

interface Dependencies {
  podman: PodmanService;
}

export class SpecifierService implements Disposable {
  #cache: Map<string, string> = new Map<string, string>();

  constructor(protected readonly dependencies: Dependencies) {}

  dispose(): void {
    this.#cache.clear();
  }

  protected getCacheKey(connection: ProviderContainerConnection, specifier: string): string {
    return `${connection.providerId}:${connection.connection.name}:${specifier}`;
  }

  public async expand(
    connection: ProviderContainerConnection,
    path: string,
    options?: { token?: CancellationToken; logger?: Logger },
  ): Promise<string> {
    // if the path does not start with `%` we ignore
    if (!path.startsWith('%')) return path;

    const [specifier, ...rest] = path.split(sep);
    if (specifier?.length !== 2) return path;

    if (!(specifier in Specifiers)) {
      throw new Error(`specifier ${specifier} is not yet supported`);
    }

    const key = this.getCacheKey(connection, specifier);
    const cached = this.#cache.get(key);
    if (cached) {
      return join(cached, ...rest);
    }

    const worker = await this.dependencies.podman.getWorker(connection);

    const instance = new Specifiers[specifier](worker);
    const value = await instance.resolve(options);

    this.#cache.set(key, value);

    return join(value, ...rest);
  }
}
