/**
 * @author axel7083
 */
import { LoggerApi } from '/@shared/src/apis/logger-api';
import type { LoggerService } from '../services/logger-service';

interface Dependencies {
  loggerService: LoggerService;
}

export class LoggerApiImpl extends LoggerApi {
  constructor(protected dependencies: Dependencies) {
    super();
  }

  override async getLogs(loggerId: string): Promise<string> {
    return this.dependencies.loggerService.getLogs(loggerId);
  }
}
