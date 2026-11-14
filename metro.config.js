const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
// Old interrupted installs and generated archives are not application sources.
// Anchor exclusions to the root so src/features/cycle remains discoverable.
const excluded = [".external-deps-link", ".incomplete-node-modules", ".incomplete-node-modules-2", ".incomplete-node-modules-3", "cycle", "artifacts", "dist", "dist-android", "dist-ios"];
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  ...excluded.map((directory) => new RegExp(escape(path.join(__dirname, directory)) + "([/\\\\]|$)")),
];
module.exports = config;
