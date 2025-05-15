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
import type { ComposeSpecification, DefinitionsService, ListOrDict, PropertiesServices } from 'compose-spec-ts';
import { load, dump } from 'js-yaml';
import type { PodContainer, PodContainerPort, PodEnvironment, PodmanPod } from './models/podman-pod';

export const COMPOSE_SPECIFICATION_SUPPORTED: Set<keyof ComposeSpecification> = new Set([
  'services',
  'name',
  'version',
]);

export const SERVICE_SUPPORTED: Set<keyof DefinitionsService> = new Set(['image', 'ports', 'environment']);

export class Compose {
  #spec: ComposeSpecification;

  protected constructor(spec: ComposeSpecification) {
    this.#spec = spec;
  }

  public static fromString(raw: string): Compose {
    return new Compose(load(raw) as ComposeSpecification);
  }

  public getServices(): PropertiesServices {
    return this.#spec.services ?? {};
  }

  protected getEnvironments(environment: ListOrDict): Array<PodEnvironment> {
    if (Array.isArray(environment)) {
      return environment.map(content => {
        const [name, value] = content.split('=');
        return {
          value: value,
          name: name,
        };
      });
    } else {
      return Object.entries(environment).map(([key, value]) => ({
        value: String(value),
        name: key,
      }));
    }
  }

  // todo: move to dedicated file
  private toPodContainer([name, service]: [string, DefinitionsService]): PodContainer {
    Object.keys(service).forEach((key: string) => {
      if (!SERVICE_SUPPORTED.has(key)) throw new Error(`unsupported option ${key} for service ${name}`);
    });

    if (!service.image) throw new Error('missing image');

    const ports: Array<PodContainerPort> | undefined = service.ports?.map(port => {
      if (typeof port === 'number') {
        return {
          containerPort: port,
          hostPort: port,
        };
      } else if (typeof port === 'string') {
        const [containerPort, hostPort] = port.split(':');
        return {
          containerPort: Number(containerPort),
          hostPort: Number(hostPort),
        };
      } else {
        return {
          containerPort: Number(port.target),
          hostPort: Number(port.published),
        };
      }
    });

    return {
      image: service.image,
      name: name,
      ports,
      env: service.environment ? this.getEnvironments(service.environment) : undefined,
    };
  }

  toKubePlay(): string {
    // check for unsupported option at root level
    Object.keys(this.#spec).forEach((key: string) => {
      if (!COMPOSE_SPECIFICATION_SUPPORTED.has(key)) throw new Error(`unsupported option ${key}`);
    });

    const services: PropertiesServices = this.getServices();
    const containers: Array<PodContainer> = Object.entries(services).map(this.toPodContainer.bind(this));

    const pod: PodmanPod = {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: {
        name: this.#spec.name ?? 'compose-podified',
      },
      spec: {
        containers: containers,
      },
    };

    return dump(pod);
  }
}
