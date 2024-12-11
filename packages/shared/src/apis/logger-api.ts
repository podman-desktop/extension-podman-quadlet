/**
 * @author axel7083
 */

export abstract class LoggerApi {
  static readonly CHANNEL: string = 'logger-api';

  abstract getLogs(loggerId: string): Promise<string>;
}
