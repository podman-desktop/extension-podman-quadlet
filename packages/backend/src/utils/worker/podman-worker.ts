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
import type {
  CancellationToken,
  Logger,
  RunResult,
  Disposable,
  ProviderContainerConnection,
  RunError,
} from '@podman-desktop/api';
import type { AsyncInit } from '../async-init';
import { isRunError } from '../run-error';
import { QuadletBinaryResolver } from '../resolvers/quadlet-binary-resolver';
import { PodmanVersionResolver } from '../resolvers/podman-version-resolver';
import type { SemVer } from 'semver';

export abstract class PodmanWorker implements Disposable, AsyncInit {
  protected quadletBinaryResolver: QuadletBinaryResolver;
  protected podmanVersionResolver: PodmanVersionResolver;

  protected constructor(protected connection: ProviderContainerConnection) {
    this.quadletBinaryResolver = new QuadletBinaryResolver(this);
    this.podmanVersionResolver = new PodmanVersionResolver(this);
  }

  /**
   * Return the content of the file at path
   * @param path
   */
  abstract read(path: string): Promise<string>;

  /**
   * Remove a file at a given path
   * @remarks does not support recursive
   * @param path
   */
  abstract rm(path: string): Promise<void>;

  /**
   * Write content to the path given
   * @remarks mkdir -r the parent directory when called
   * @param path
   * @param content
   */
  abstract write(path: string, content: string): Promise<void>;

  /**
   * Resolves the absolute real path of the given file or directory.
   *
   * @param path The string representation of the file or directory path to resolve.
   * @return A Promise that resolves to the absolute real path as a string.
   */
  abstract realPath(path: string): Promise<string>;

  /**
   * execute the given command to the
   * @param command
   * @param options
   */
  abstract exec(
    command: string,
    options?: {
      args?: string[];
      logger?: Logger;
      token?: CancellationToken;
      env?: Record<string, string>;
    },
  ): Promise<RunResult>;

  /**
   * systemctl has a weird specificity to change the return code depending on the status.
   * | value   | Description in LSB                             | Use in systemd                     |
   * | :------ | :--------------------------------------------  | :--------------------------------- |
   * | 0       | program is running or service is OK            | unit is active                     |
   * | 1       | program is dead and /var/run pid file exists   | unit not failed (used by is-failed)|
   * | 2       | program is dead and /var/lock lock file exists | unused                             |
   * | 3       | program is not running                         | unit is not active                 |
   * | 4       | program or service status is unknown           | no such unit                       |
   *
   * ref {@link https://www.freedesktop.org/software/systemd/man/latest/systemctl.html#Exit%20status}
   *
   * @privateRemarks We do not expose {@link executeWrapper} for security purpose, so we must expose the systemctl exec
   *
   * @dangerous
   * @param options
   */
  async systemctlExec(options: {
    args: string[];
    logger?: Logger;
    token?: CancellationToken;
    env?: Record<string, string>;
  }): Promise<RunResult | RunError> {
    return this.exec('systemctl', options).catch((err: unknown) => {
      // check err is an RunError
      if (isRunError(err)) return err;
      throw err;
    });
  }

  /**
   * Execute the `quadlet` command on the podman connection
   * @param options the options for the exec logic
   */
  async quadletExec(options: {
    args: string[];
    logger?: Logger;
    token?: CancellationToken;
    env?: Record<string, string>;
  }): Promise<RunResult | RunError> {
    const binary = await this.quadletBinaryResolver.resolve(options);

    return this.exec(binary, options).catch((err: unknown) => {
      // check err is an RunError
      if (isRunError(err)) return err;
      throw err;
    });
  }

  /**
   * Execute the `journalctl` command on the podman connection
   * @param options the options for the exec logic
   */
  async journalctlExec(options: {
    args: string[];
    logger?: Logger;
    token?: CancellationToken;
    env?: Record<string, string>;
  }): Promise<RunResult> {
    return this.exec('journalctl', options);
  }

  /**
   * Execute the `podman` command on the podman connection
   * @param options the options for the exec logic
   */
  async podmanExec(options: {
    args: string[];
    logger?: Logger;
    token?: CancellationToken;
    env?: Record<string, string>;
  }): Promise<RunResult> {
    return this.exec('podman', options);
  }

  async getPodmanVersion(options?: {
    logger?: Logger;
    token?: CancellationToken;
    env?: Record<string, string>;
  }): Promise<SemVer> {
    return this.podmanVersionResolver.resolve(options);
  }

  /**
   * Dispose any pending resources / connections
   */
  abstract dispose(): void;

  /**
   * Async init the worker
   */
  abstract init(): Promise<void>;
}
