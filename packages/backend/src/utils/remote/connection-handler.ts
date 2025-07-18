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
import type { Disposable } from '@podman-desktop/api';

export abstract class ConnectionHandler implements Disposable {
  #reconnectTimeout: NodeJS.Timeout | undefined;
  #disposed: boolean = false;

  dispose(): void {
    // abort any reconnect tentative
    if (this.#reconnectTimeout) {
      clearTimeout(this.#reconnectTimeout);
      this.#reconnectTimeout = undefined;
    }
    this.#disposed = true;
  }

  abstract connect(): Promise<boolean>;

  protected handleReconnect(): void {
    if (this.#disposed) return;
    // need to reconnect if no timeout is set for now
    if (!this.#reconnectTimeout) {
      this.#reconnectTimeout = setTimeout(() => {
        this.#reconnectTimeout = undefined;
        this.connect().catch(console.error);
      }, 5_000);
    }
  }
}
