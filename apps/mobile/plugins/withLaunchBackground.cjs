const { withMod } = require('expo/config-plugins');

/** SDK 54 removes the image but resets its storyboard background to system white.
 * Keep an image-free native first frame that matches the animated introduction.
 * Register BEFORE expo-splash-screen: its provider must be registered last,
 * and this action then runs after Expo's image-removal action.
 */
module.exports = function withLaunchBackground(config) {
  return withMod(config, {
    platform: 'ios',
    mod: 'splashScreenStoryboard',
    action(config) {
      const view = config.modResults.document.scenes[0].scene[0].objects[0].viewController[0].view[0];
      view.color = [{ $: { key: 'backgroundColor', red: '0.2862745098', green: '0.1764705882', blue: '0.2823529412', alpha: '1', colorSpace: 'custom', customColorSpace: 'sRGB' } }];
      // Expo's image-removal path leaves center constraints targeting the removed view.
      delete view.constraints;
      for (const resource of config.modResults.document.resources ?? []) delete resource.image;
      return config;
    },
  });
};
