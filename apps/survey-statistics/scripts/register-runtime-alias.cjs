const path = require("node:path");
const tsconfigPaths = require("tsconfig-paths");

// TypeScript 6 no longer needs baseUrl for compile-time paths. The emitted
// CommonJS files still contain @/* imports, so register their runtime mapping
// explicitly against the compiled dist directory.
tsconfigPaths.register({
  baseUrl: path.resolve(__dirname, "../dist"),
  paths: { "@/*": ["*"] },
});
