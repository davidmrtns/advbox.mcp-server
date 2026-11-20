import { AdvboxService } from './advbox.service.js';

export const advboxService = new AdvboxService({
  baseUrl: process.env.ADVBOX_API_URL,
  token: process.env.ADVBOX_TOKEN,
});

export { AdvboxService };
export type { AdvboxResult, AdvboxServiceOptions } from './advbox.service.js';
