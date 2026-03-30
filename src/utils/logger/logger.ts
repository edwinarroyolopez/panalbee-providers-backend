import { base } from './base';

type LogLevel = 'info' | 'warn' | 'debug' | 'error' | 'fatal';

export class Logger {
  private logger;

  constructor(public scope: string) {
    this.logger = base.child({ scope });
  }

  private wrap(
    level: LogLevel,
    message: string,
    payload?: Record<string, unknown>,
  ) {
    this.logger[level](payload ?? {}, message);
  }

  // in case the scope is too broad, spawn a child logger to narrow it
  child(scope: string): Logger {
    return new Logger(`${this.scope}:${scope}`);
  }

  info(message: string, payload?: Record<string, unknown>) {
    return this.wrap('info', message, payload);
  }

  debug(message: string, payload?: Record<string, unknown>) {
    return this.wrap('debug', message, payload);
  }

  warn(message: string, payload?: Record<string, unknown>) {
    return this.wrap('warn', message, payload);
  }

  error(message: string, payload?: Record<string, unknown>) {
    return this.wrap('error', message, payload);
  }

  fatal(message: string, payload?: Record<string, unknown>) {
    return this.wrap('fatal', message, payload);
  }
}

export default Logger;
