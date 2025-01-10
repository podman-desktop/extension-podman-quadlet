/**
 * @author axel7083
 */
import type { PodmanService } from './podman-service';
import type { TelemetryLogger } from '@podman-desktop/api';

export interface SystemdServiceDependencies {
  podman: PodmanService;
  telemetry: TelemetryLogger;
}

export abstract class SystemdHelper {
  protected constructor(protected dependencies: SystemdServiceDependencies) {}

  protected get podman(): PodmanService {
    return this.dependencies.podman;
  }

  protected get logUsage(): (eventName: string, data?: Record<string, unknown>) => void {
    return this.dependencies.telemetry.logUsage.bind(this.dependencies.telemetry.logUsage);
  }
}
