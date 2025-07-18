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

interface Options {
  // filename to parse and validate
  filename: string;
  // the expected extension to found in the filename
  extension: string;
}

export enum ServiceType {
  SIMPLE,
  TEMPLATE,
  TEMPLATE_INSTANCE,
}

/**
 * https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html#Service%20Templates
 */
export class QuadletServiceTypeParser extends Parser<Options, ServiceType> {
  constructor(content: Options) {
    super(content);
  }

  override parse(): ServiceType {
    // split the filename using the last `.`
    const separatorIndex = this.content.filename.lastIndexOf('.');
    if (separatorIndex === -1) throw new Error(`service ${this.content.filename} does not have an extension`);

    // split the name from the extension
    const [name, extension] = [
      this.content.filename.slice(0, separatorIndex),
      this.content.filename.slice(separatorIndex + 1),
    ];
    // validate the extension name
    if (extension !== this.content.extension)
      throw new Error(`extension of the file ${this.content.filename} is not ${this.content.extension}`);

    if (name.endsWith('@')) {
      return ServiceType.TEMPLATE;
    } else if (name.includes('@')) {
      return ServiceType.TEMPLATE_INSTANCE;
    } else {
      return ServiceType.SIMPLE;
    }
  }
}
