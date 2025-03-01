/**********************************************************************
 * Copyright (C) 2024 Red Hat, Inc.
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
import type { Webview } from '@podman-desktop/api';
import type { Messages } from '/@shared/src/messages';

export class Publisher<T> {
  constructor(
    private webview: Webview,
    private channel: Messages,
    private getter: () => T,
  ) {}

  notify(): void {
    // side-case: the notify function may be called during the constructor so this may be undefined.
    this?.webview
      .postMessage({
        id: this.channel,
        body: this.getter(),
      })
      .catch((err: unknown) => {
        console.error(`Something went wrong while emitting ${this.channel}: ${String(err)}`);
      });
  }
}
