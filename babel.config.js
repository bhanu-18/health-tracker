module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      /**
       * Inlines .sql files as strings at build time.
       *
       * metro.config.js tells Metro it may *resolve* a .sql import; this tells
       * Babel what to *do* with it. Without this plugin Babel parses the file as
       * JavaScript and fails on the first line of SQL ("Missing semicolon" at
       * CREATE TABLE), because a resolvable module is still expected to be code.
       *
       * Both halves are required: Drizzle imports migrations as modules since
       * React Native has no filesystem to read them from at runtime.
       */
      ['inline-import', { extensions: ['.sql'] }],
    ],
  };
};
