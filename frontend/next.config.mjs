// next.config.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);   // ← gives you require()

export default {
  reactStrictMode: true,
  webpack (config) {
    // point every import/require('pako') to the v1 copy in node_modules
    config.resolve.alias['pako'] = require.resolve('pako');
    return config;
  },
};
