import type { ComposeSpecification, DefinitionsService, PropertiesServices } from 'compose-spec-ts';
import { load, dump } from 'js-yaml';
import { PodContainer, PodContainerPort, PodmanPod } from './models/podman-pod';

export const COMPOSE_SPECIFICATION_SUPPORTED: Set<keyof ComposeSpecification> = new Set([
  'services',
  'name',
  'version',
]);

export const SERVICE_SUPPORTED: Set<keyof DefinitionsService> = new Set([
  'image',
  'ports',
]);

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

  // todo: move to dedicated file
  private toPodContainer([name, service]: [string, DefinitionsService]): PodContainer {
    Object.keys(service).forEach((key: string) => {
      if(!SERVICE_SUPPORTED.has(key)) throw new Error(`unsupported option ${key} for service ${name}`);
    });

    if(!service.image) throw new Error('missing image');

    const ports: Array<PodContainerPort> | undefined = service.ports?.map((port) => {
      if(typeof port === 'number') {
        return {
          containerPort: port,
          hostPort: port,
        };
      } else if(typeof port === 'string') {
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
    };
  }

  toKubePlay(): string {
    // check for unsupported option at root level
    Object.keys(this.#spec).forEach((key: string) => {
      if(!COMPOSE_SPECIFICATION_SUPPORTED.has(key)) throw new Error(`unsupported option ${key}`);
    });

    const services: PropertiesServices = this.getServices();
    const containers: Array<PodContainer> = Object.entries(services).map(this.toPodContainer);

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
