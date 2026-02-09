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

import { Generator } from '../utils/generator';
import type { PodInspectInfo } from '@podman-desktop/api';
import type { PodQuadlet } from '../models/pod-quadlet';
import { stringify } from 'js-ini';
import type { ServiceRestartPolicy } from '../models/service-quadlet';
import { gte, SemVer, lt } from 'semver';
import { FEATURES, POD_SUPPORT } from './compatibility';

interface Dependencies {
  pod: PodInspectInfo;
}

interface Options {
  /**
   * Specify the target podman version
   */
  podman: string;
}

export class PodGenerator extends Generator<Dependencies, Options> {
  private getCorresponding(value: string): ServiceRestartPolicy {
    switch (value) {
      case 'always':
      case 'unless-stopped':
        return 'always';
      case 'no':
      case 'never':
        return 'no';
    }
    throw new Error(`cannot generate systemd restart policy from the pod config: unknown policy ${value}`);
  }

  override generate(options: Options): string {
    const podman = new SemVer(options.podman);

    // ensure minimum podman version
    if (lt(podman, POD_SUPPORT)) {
      throw new Error(
        `Podman version ${podman} does not support Pod quadlets. Minimum supported version is ${POD_SUPPORT}.`,
      );
    }

    const pod: PodQuadlet = {
      Pod: {
        PodName: this.dependencies.pod.Name,
      },
    };

    const podmanArgs: Array<string> = [];

    // Default to stop
    if (this.dependencies.pod.ExitPolicy && this.dependencies.pod.ExitPolicy !== 'stop') {
      pod.Pod.ExitPolicy = this.dependencies.pod.ExitPolicy;
    }

    if (this.dependencies.pod.RestartPolicy && this.dependencies.pod.RestartPolicy !== 'always') {
      pod.Service = {
        ...pod.Service,
        Restart: this.getCorresponding(this.dependencies.pod.RestartPolicy),
      };
    }

    if (this.dependencies.pod.InfraConfig.PortBindings) {
      pod.Pod.PublishPort = Object.entries(this.dependencies.pod.InfraConfig.PortBindings).reduce(
        (accumulator, [key, values]) => {
          // usually under `port/protocol` (E.g. `5000/tcp`)
          const [containerPort] = key.split('/');
          if (!containerPort) return accumulator;

          // if no hostPort / hostIp specified
          if (values.length === 0) {
            accumulator.push(containerPort);
          } else {
            for (const { HostIp, HostPort } of values) {
              if (HostIp && HostIp !== '0.0.0.0' && HostPort) {
                accumulator.push(`${HostIp}:${HostPort}:${containerPort}`);
              } else if (HostPort) {
                accumulator.push(`${HostPort}:${containerPort}`);
              }
            }
          }

          return accumulator;
        },
        [] as Array<string>,
      );
    }

    if (this.dependencies.pod.Labels && gte(podman, FEATURES.Pod.Labels)) {
      pod.Pod.Label = Object.entries(this.dependencies.pod.Labels).map(([key, value]) => `${key}=${value}`);
    }

    if (
      'cpu_period' in this.dependencies.pod &&
      typeof this.dependencies.pod.cpu_period === 'number' &&
      'cpu_quota' in this.dependencies.pod &&
      typeof this.dependencies.pod.cpu_quota === 'number'
    ) {
      podmanArgs.push(`--cpus=${this.dependencies.pod.cpu_quota / this.dependencies.pod.cpu_period}`);
    }

    if (podmanArgs.length !== 0) {
      pod.Pod.PodmanArgs = podmanArgs;
    }

    return stringify(this.format(pod));
  }
}
