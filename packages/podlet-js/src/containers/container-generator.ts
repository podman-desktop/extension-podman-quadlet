import type { ContainerInspectInfo, ImageInspectInfo } from '@podman-desktop/api';
import { stringify } from 'js-ini';
import type { ContainerQuadletBuilder } from './builders/container-quadlet-builder';
import type { ContainerQuadlet } from '../models/container-quadlet';
import { AddHost } from './builders/add-host';
import { Annotation } from './builders/annotation';
import { PublishPort } from './builders/publish-port';
import { Image } from './builders/image';
import { Name } from './builders/name';
import { Entrypoint } from './builders/entrypoint';
import { Environment } from './builders/environment';
import { Exec } from './builders/exec';
import { ReadOnly } from './builders/read-only';
import { Mount } from './builders/mount';
import { Generator } from '../utils/generator';

interface Dependencies {
  container: ContainerInspectInfo;
  image: ImageInspectInfo;
}

export class ContainerGenerator extends Generator<Dependencies> {
  override generate(): string {
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
      Mount,
    ];

    const containerQuadlet: ContainerQuadlet = builders.reduce(
      (accumulator, current) => {
        return new current(this.dependencies).build(accumulator);
      },
      {
        Container: {},
      } as ContainerQuadlet,
    );

    return stringify(this.format(containerQuadlet));
  }
}
