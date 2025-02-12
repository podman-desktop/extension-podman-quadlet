import type { ContainerInspectInfo, ImageInspectInfo } from '@podman-desktop/api';
import { stringify } from 'js-ini';
import type { ContainerQuadletBuilder } from './builders/container-quadlet-builder';
import type { ContainerQuadlet } from './models/container-quadlet';
import { AddHost } from './builders/add-host';
import { Annotation } from './builders/annotation';
import { PublishPort } from './builders/publish-port';
import type { IIniObject } from 'js-ini/src/interfaces/ini-object';
import { Image } from './builders/image';
import { Name } from './builders/name';
import { Entrypoint } from './builders/entrypoint';
import { Environment } from './builders/environment';
import { Exec } from './builders/exec';
import { ReadOnly } from './builders/read-only';

interface Dependencies {
  container: ContainerInspectInfo;
  image: ImageInspectInfo;
}

export class Generate {
  constructor(private dependencies: Dependencies) {}

  protected format(containerQuadlet: ContainerQuadlet): IIniObject {
    return Object.fromEntries(
      Object.entries(containerQuadlet).map(([key, value]) => {
        return [
          key,
          Object.entries(value).reduce((accumulator, [item, content]) => {
            if(Array.isArray(content)) {
              accumulator.push(...content.map((v) => `${item}=${v}`));
            } else {
              accumulator.push(`${item}=${content}`);
            }
            return accumulator;
          }, [] as string[]),
        ];
      }),
    );
  }

  generate(): string {
    // all builders to use
    const builders: Array<new (dep: Dependencies) => ContainerQuadletBuilder> = [
      AddHost,
      Annotation,
      PublishPort,
      Image,
      Name,
      Entrypoint,
      Exec,
      Environment,
      ReadOnly,
    ];

    const containerQuadlet: ContainerQuadlet = builders.reduce((accumulator, current) => {
      return new current(this.dependencies).build(accumulator);
    }, {
      Container: {},
    } as ContainerQuadlet);

    return stringify(this.format(containerQuadlet));
  }
}
