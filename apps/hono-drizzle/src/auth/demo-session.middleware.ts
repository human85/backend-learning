import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../app-env.js';

const DEMO_SESSION_TOKEN = 'learning-session';

export const requireDemoSession = createMiddleware<AppEnv>(
  async (context, next) => {
    const authorization = context.req.header('Authorization');

    if (authorization !== `Bearer ${DEMO_SESSION_TOKEN}`) {
      return context.json({ message: 'Authentication required' }, 401);
    }

    context.set('userId', 1);
    await next();
  },
);
