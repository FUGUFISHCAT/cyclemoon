const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      ".installed-deps/**",
      ".external-deps-link/**",
      "dist/**",
      "dist-android/**",
      "dist-ios/**",
      "artifacts/**",
      ".incomplete-node-modules*/**",
      "cycle/**",
    ],
  },
]);
