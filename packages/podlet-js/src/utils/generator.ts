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
import type { IIniObject } from 'js-ini/src/interfaces/ini-object';

export abstract class Generator<T, O = void> {
  constructor(protected dependencies: T) {}

  /**
   * The object is under the format `{ Container: { Annotation: Array<string>, ... } }` but js-ini
   * need to have `{ Container: Array<string> }` to convert it to ini.
   *
   * See https://github.com/Sdju/js-ini/pull/37 for future improvement
   *
   * @protected
   * @param obj
   */
  protected format(obj: unknown): IIniObject {
    if (!obj || typeof obj !== 'object') throw new Error(`cannot format object of type ${typeof obj}`);

    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => {
        return [
          key,
          Object.entries(value).reduce((accumulator, [item, content]) => {
            if (Array.isArray(content)) {
              accumulator.push(...content.map(v => `${item}=${v}`));
            } else {
              accumulator.push(`${item}=${content}`);
            }
            return accumulator;
          }, [] as string[]),
        ];
      }),
    );
  }

  abstract generate(options: O): string;
}
