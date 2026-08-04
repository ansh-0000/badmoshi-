const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch only workspace source a mobile bundle may import. Watching the
// entire repository makes Metro crawl portable Postgres, nested worktrees and
// restored dependency trees before it can even answer /status on Windows.
// Add a package here when the app begins importing it; do not broaden this to
// the workspace root.
config.watchFolders = [
  path.resolve(workspaceRoot, 'lib', 'api-client-react'),
];

// 2. Let Metro resolve packages in both local and workspace root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      return middleware(req, res, next);
    };
  }
};

module.exports = config;
