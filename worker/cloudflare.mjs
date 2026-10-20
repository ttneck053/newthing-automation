import { createHandler } from './server.mjs';
import { cleanFigmaRelay } from './figma-relay.mjs';

const handler = createHandler();
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/api/')) {
      // Public free hosting uses each person's registered GPT key.
      return handler(request, { ...env, OPENAI_API_KEY: undefined });
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(_controller, env) {
    if (env.FIGMA_DB) await cleanFigmaRelay(env.FIGMA_DB);
  }
};
