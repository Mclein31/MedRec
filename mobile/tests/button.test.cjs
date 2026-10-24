/* global __dirname */
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const StyleSheet = require('react-native-web/dist/cjs/exports/StyleSheet');

function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = module.paths;
  loaded.require = name => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  loaded._compile(code, filename);
  return loaded.exports;
}

// Use the installed Reanimated prop filter to reproduce what is forwarded to
// Pressable. This catches a style callback being changed into [callback], which
// React Native flattens without evaluating and drops the button's background.
const utils = load('../node_modules/react-native-reanimated/src/createAnimatedComponent/utils.ts');
const { PropsFilter } = load('../node_modules/react-native-reanimated/src/createAnimatedComponent/PropsFilter.tsx', {
  './utils': utils,
  '../animation': { initialUpdaterRun: updater => updater() },
  '../isSharedValue': { isSharedValue: () => false },
  '../WorkletEventHandler': { WorkletEventHandler: class {} },
  './InlinePropManager': { hasInlineStyles: () => false },
});
const { Colors } = load('../constants/theme.ts', { 'react-native': { Platform: { select: options => options.default } } });

function render(props = {}, reducedMotion = false) {
  let presses = 0;
  const { Button } = load('../components/ui/Button.tsx', {
    react: { default: React },
    'react-native': { Pressable: 'Pressable', Text: 'Text', ActivityIndicator: 'ActivityIndicator', StyleSheet },
    'expo-haptics': { impactAsync() {}, notificationAsync() {}, ImpactFeedbackStyle: { Light: 'light' }, NotificationFeedbackType: { Warning: 'warning' } },
    '../../constants/theme': { Colors, Radii: { button: 12, md: 8 }, Typography: { button: { fontSize: 14 } } },
    '../../hooks/useResponsive': { useResponsive: () => ({ buttonHeight: 48, scaleFont: value => value }) },
    'react-native-reanimated': {
      default: { createAnimatedComponent: component => component },
      useSharedValue: value => ({ value }), useReducedMotion: () => reducedMotion,
      withSpring: value => value,
      useAnimatedStyle: updater => ({ viewDescriptors: {}, initial: { value: updater(), updater } }),
    },
  });
  const element = Button({ label: 'Sign in', onPress: () => { presses++; }, ...props });
  const nativeProps = () => new PropsFilter().filterNonAnimatedProps({ props: element.props, _isFirstRender: true });
  return { element, nativeProps, style: () => StyleSheet.flatten(nativeProps().style), presses: () => presses };
}

test('sign-in remains a visible teal touch target after Reanimated filters its styles', () => {
  const button = render();
  assert.equal(button.style().backgroundColor, Colors.teal);
  assert.ok(button.style().minHeight >= 44);
  assert.equal(button.nativeProps().accessibilityLabel, 'Sign in');
  assert.equal(button.nativeProps().disabled, false);
  button.element.props.onPress();
  assert.equal(button.presses(), 1);
});

test('loading and disabled buttons retain their backgrounds and reject taps', () => {
  for (const props of [{ loading: true }, { disabled: true }]) {
    const button = render(props);
    assert.equal(button.style().backgroundColor, Colors.teal);
    assert.equal(button.nativeProps().disabled, true);
    assert.equal(button.style().opacity, 0.55);
    button.element.props.onPress();
    assert.equal(button.presses(), 0);
  }
});

test('press feedback preserves layout and restores opacity with Reduce Motion', () => {
  const button = render({}, true);
  button.element.props.onPressIn();
  assert.equal(button.style().backgroundColor, Colors.teal);
  assert.equal(button.style().opacity, 0.8);
  assert.equal(button.style().transform[0].scale, 1);
  button.element.props.onPressOut();
  assert.equal(button.style().opacity, 1);
});
