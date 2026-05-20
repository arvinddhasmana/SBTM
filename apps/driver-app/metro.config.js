// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro resolve modules from the app's node_modules first, then the
//    workspace root. Hierarchical lookup MUST stay enabled so pnpm's nested
//    .pnpm/<pkg>/node_modules paths resolve correctly.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force a single copy of React and friends. In pnpm monorepos other workspace
//    packages may pull in a newer React (e.g. admin-dashboard uses 19.2.x via
//    react-router / react-leaflet), which causes Metro to bundle two Reacts and
//    crashes the app at runtime with "Cannot read property 'useState' of null".
//    Intercept the bare module specifier and resolve it from the driver-app's
//    own node_modules so every importer sees the same module instance.
//    (Sub-path imports like "react-native/Libraries/..." are left alone so
//    Metro's platform-specific resolver and haste map continue to work.)
const singletonNames = ['react', 'react-dom', 'react-native', 'react-native-web'];
const singletonRequire = require('module').createRequire(
  path.join(projectRoot, 'noop.js'),
);

// Web stubs for native-only modules that cannot bundle on web platform
const webStubs = {
  'react-native-maps': path.resolve(projectRoot, 'src/stubs/react-native-maps.web.js'),
};

// Prefer CJS over ESM so packages using import.meta (Vite-style) don't crash Metro.
// The 'react-native' condition maps to CJS builds in packages that ship both.
config.resolver.unstable_conditionNames = ['react-native', 'browser', 'require', 'default'];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (singletonNames.includes(moduleName)) {
    return {
      type: 'sourceFile',
      filePath: singletonRequire.resolve(moduleName),
    };
  }
  if (platform === 'web' && webStubs[moduleName]) {
    return {
      type: 'sourceFile',
      filePath: webStubs[moduleName],
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
