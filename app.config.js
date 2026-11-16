module.exports = ({ config }) => {
  const base = process.env.EXPO_PUBLIC_BASE_PATH ?? "";
  if (base !== "" && base !== "/cyclemoon") throw new Error("Unsupported deployment base path");
  return { ...config, experiments: { ...config.experiments, baseUrl: base } };
};
