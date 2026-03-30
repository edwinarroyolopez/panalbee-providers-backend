import { AsyncLocalStorage } from 'node:async_hooks';
import pino from 'pino';

const EnvironmentMap = {
  prd: 'production',
  local: 'local',
};

const findEnv = () => {
  return (
    EnvironmentMap[process.env.NODE_ENV as keyof typeof EnvironmentMap] ||
    'local'
  );
};

export const base = pino({
  mixin() {
    const store = storage.getStore() ?? {};
    const tracingId = store?.['tracingId'];
    const env = findEnv();

    return {
      tracingId,
      env,
    };
  },
  hooks: {
    logMethod(args: Parameters<pino.LogFn>, method: pino.LogFn) {
      if (typeof args?.[0] !== 'object') {
        return;
      }

      const obj = args[0] as Record<string, unknown>;
      for (const [key, value] of Object.entries(obj)) {
        if (value instanceof Error) {
          obj[key] = pino.stdSerializers.err(value);
        }
      }

      method.apply(this, args as unknown as Parameters<typeof method>);
    },
  },
  redact: {
    paths: ['pid', 'hostname'],
    remove: true,
  },
  level: process.env.LOG_LEVEL || 'info',
  // pino seems to have its own json parser, and we need to recreate the JSON format here
  // adding timestamp manually to mixin doesn't override this key either
  timestamp: () => `,"time:"${new Date().toISOString()}"`,
});

type Context = {
  tracingId?: string;
};

export const storage = new AsyncLocalStorage<Context>();

export const getTracingId = () => {
  const store = storage.getStore();
  return store?.tracingId;
};
