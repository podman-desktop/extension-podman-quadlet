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
import type { DialogService } from '../services/dialog-service';
import { DialogApi } from '@quadlet/core-api';
import type { InputBoxOptions } from '@quadlet/core-api';

interface Dependencies {
  dialog: DialogService;
}

export class DialogApiImpl extends DialogApi {
  constructor(protected dependencies: Dependencies) {
    super();
  }

  override showWarningMessage(message: string, ...items: string[]): Promise<string | undefined> {
    return this.dependencies.dialog.showWarningMessage(message, ...items);
  }

  override showInformationMessage(message: string, ...items: string[]): Promise<string | undefined> {
    return this.dependencies.dialog.showInformationMessage(message, ...items);
  }

  override showInputBox(options: InputBoxOptions): Promise<string | undefined> {
    return this.dependencies.dialog.showInputBox(options);
  }
}
