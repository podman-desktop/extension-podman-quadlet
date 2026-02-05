/**
 * @author axel7083
 */
import { RoutingApi } from '@podman-desktop/quadlet-extension-core-api';
import type { RoutingService } from '../services/routing-service';

interface Dependencies {
  routing: RoutingService;
}

export class RoutingApiImpl extends RoutingApi {
  constructor(protected dependencies: Dependencies) {
    super();
  }

  override async readRoute(): Promise<string | undefined> {
    return this.dependencies.routing.read();
  }
}
