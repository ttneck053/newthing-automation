import { createHandler } from '../worker/server.mjs';
// Stay below Vercel's 4.5 MB function response limit, including overhead.
const handler = createHandler(fetch, { imageLimit: 4_000_000 });
export default { fetch: request => handler(request, process.env) };
