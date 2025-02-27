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
import type { ContainerQuadlet } from '../../models/container-quadlet';
import { ContainerQuadletBuilder } from './container-quadlet-builder';

/**
 * Detect if user used `--mount` option
 */
export class Mount extends ContainerQuadletBuilder {
  /**
   * Takes {@link HostConfig.Tmpfs} entry as argument
   * @param tmpfs
   * @protected
   */
  protected tmpfsToMount(tmpfs: [string, string]): string {
    // Get the options used (E.g. rw,rprivate,nosuid,nodev,tmpcopyup)
    const options = tmpfs[1].split(',');

    const filteredOptions = options.reduce((accumulator, current) => {
      switch (current) {
        // ignore default value
        case 'rw':
        case 'rprivate':
        case 'nosuid':
        case 'nodev':
        case 'tmpcopyup':
          return accumulator;
      }
      // add any other option
      accumulator.push(current);

      return accumulator;
    }, [] as Array<string>);

    let suffix: string = '';
    if (filteredOptions.length > 0) {
      suffix = `,${filteredOptions.join(',')}`;
    }

    return `type=tmpfs,destination=${tmpfs[0]}${suffix}`;
  }

  override build(from: ContainerQuadlet): ContainerQuadlet {
    if (!this.container.Mounts) return from;

    const mounts: Array<string> = this.container.Mounts.map(mount => {
      if (!('Type' in mount)) throw new Error(`missing mount in mount ${mount.Source}`);
      switch (mount.Type) {
        case 'bind':
          return `type=${mount.Type},src=${mount.Source},destination=${mount.Destination}${mount.RW ? '' : ':ro'}`;
        case 'volume':
          return `type=${mount.Type},src=${mount.Name},destination=${mount.Destination}${mount.RW ? '' : ':ro'}`;
      }
      throw new Error(`mount type ${mount.Type} not supported`);
    });

    // check for Tmpfs
    if (this.container.HostConfig.Tmpfs) {
      const entries: Array<[string, string]> = Object.entries(this.container.HostConfig.Tmpfs);
      mounts.push(...entries.map(this.tmpfsToMount.bind(this)));
    }

    from.Container.Mount = mounts;

    return from;
  }
}
