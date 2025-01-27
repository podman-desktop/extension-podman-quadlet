import type { configuration, Disposable } from '@podman-desktop/api';
import { contributes } from '../../package.json';

interface Dependencies {
  configurationApi: typeof configuration;
}

export class ConfigurationService implements Disposable {
  constructor(protected dependencies: Dependencies) {}

  dispose(): void {}

  protected getDefaultQuadletUnitPath(): string {
    return contributes.configuration.properties['quadlet.unit-path'].default;
  }

  getUnitPath(): string {
    return (
      this.dependencies.configurationApi.getConfiguration('quadlet').get<string>('unit-path') ??
      this.getDefaultQuadletUnitPath()
    );
  }
}
