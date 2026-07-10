import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import { devProxy } from './dev-proxy.mjs';

export default defineConfig({
  integrations: [tailwind(), devProxy()],
  output: 'static',
});
