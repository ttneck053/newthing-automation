import { createHandler } from '../worker/server.mjs';
const handler = createHandler();
export default { fetch: request => handler(request, process.env) };
