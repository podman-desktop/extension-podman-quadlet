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

import { Parser } from './iparser';
import { QuadletType } from '@podman-desktop/quadlet-extension-core-api';
import { basename } from 'node:path/posix';

export class QuadletExtensionParser extends Parser<string, QuadletType> {
  constructor(path: string) {
    super(path);
  }

  override parse(): QuadletType {
    const extension = basename(this.content).split('.').pop();
    if (!extension) throw new Error(`path provided do not contain any file extension: ${this.content}`);

    const type: QuadletType | undefined = Object.values(QuadletType).find(type => extension === type.toLowerCase());
    if (!type) throw new Error(`cannot find quadlet type from path: ${this.content}`);

    return type;
  }
}
