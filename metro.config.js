const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// import.meta를 웹 번들러에서 처리할 수 있도록 설정
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
};

module.exports = config;
