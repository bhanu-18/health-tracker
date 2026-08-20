const { withXcodeProject } = require('@expo/config-plugins');

/**
 * Persists the iOS signing team across prebuilds.
 *
 * `ios/` is generated output, not source -- it is gitignored and `expo prebuild`
 * recreates it from scratch whenever a native dependency changes. That wipes the
 * DEVELOPMENT_TEAM you set by hand in Xcode, and the next device build fails
 * with a signing error that looks unrelated to whatever you actually changed.
 *
 * Reading the team from the environment keeps a personal identifier out of the
 * repository (which is public) and gives CI somewhere to inject its own value
 * later. Without APPLE_TEAM_ID set this plugin does nothing at all, so builds
 * that do not need signing -- simulator, CI -- are unaffected.
 */
const withSigningTeam = (config) =>
  withXcodeProject(config, (config) => {
    const teamId = process.env.APPLE_TEAM_ID;
    if (!teamId) return config;

    const project = config.modResults;
    const buildConfigs = project.pbxXCBuildConfigurationSection();

    for (const key of Object.keys(buildConfigs)) {
      const entry = buildConfigs[key];
      // Comment entries are string values in this section; skip them.
      if (typeof entry !== 'object' || !entry.buildSettings) continue;

      // Only touch the app target. Pods have their own configurations and must
      // keep automatic signing, or the build fails on unrelated targets.
      if (entry.buildSettings.PRODUCT_BUNDLE_IDENTIFIER == null) continue;

      entry.buildSettings.DEVELOPMENT_TEAM = `"${teamId}"`;
      entry.buildSettings.CODE_SIGN_STYLE = 'Automatic';
    }

    return config;
  });

module.exports = withSigningTeam;
