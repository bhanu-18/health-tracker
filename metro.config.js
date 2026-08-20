// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Teach Metro to bundle .sql files.
 *
 * Drizzle's generated drizzle/migrations.js imports each migration as a module
 * (`import m0000 from './0000_init.sql'`), because React Native has no
 * filesystem to read them from at runtime. Metro does not resolve .sql out of
 * the box, so without this the app fails to start with
 * "Unable to resolve module ./0000_init.sql".
 *
 * It belongs in sourceExts rather than assetExts: the file is inlined into the
 * bundle as a string to be executed, not shipped as an asset to be fetched.
 */
config.resolver.sourceExts.push('sql');

module.exports = config;
