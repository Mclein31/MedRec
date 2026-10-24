/* global __dirname */
// SDK 54 backport of https://github.com/expo/expo/pull/46757 (Xcode 27 Device Hub).
// Remove this workaround when the project's Expo CLI includes Device Hub support.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const marker = '// MedRec: Expo SDK 54 Device Hub compatibility v1';
const patches = {
  'start/doctor/apple/SimulatorAppPrerequisite.js': [
    [/async function getSimulatorAppIdViaAppleScriptAsync\(\) \{[\s\S]*?\n\}/, `async function getSimulatorAppIdViaAppleScriptAsync() {
    for (const app of ['Simulator', 'DeviceHub']) {
        try {
            const id = (await _osascript().execAsync('id of app "' + app + '"')).trim();
            if (id) return id;
        } catch {}
    }
    return null;
}`],
    [/async function getSimulatorAppIdFromBundleAsync\(\) \{[\s\S]*?\n\}/, `async function getSimulatorAppIdFromBundleAsync() {
    try {
        const { stdout: developerDir } = await _spawnasync().default('xcode-select', ['--print-path']);
        if (!developerDir.trim()) return null;
        for (const relativePath of [
            'Applications/Simulator.app/Contents/Info.plist',
            '../Applications/DeviceHub.app/Contents/Info.plist'
        ]) {
            try {
                const infoPlist = _path().default.join(developerDir.trim(), relativePath);
                const { stdout: bundleId } = await _spawnasync().default('defaults', ['read', infoPlist, 'CFBundleIdentifier']);
                if (bundleId.trim()) return bundleId.trim();
            } catch {}
        }
    } catch {}
    return null;
}`],
    ["result !== 'com.apple.iphonesimulator' && result !== 'com.apple.CoreSimulator.SimulatorTrampoline'",
      "result !== 'com.apple.dt.Devices' && result !== 'com.apple.iphonesimulator' && result !== 'com.apple.CoreSimulator.SimulatorTrampoline'"],
    ["Can't determine id of Simulator app; the Simulator is most likely not installed on this machine.",
      "Can't determine id of Device Hub or Simulator app; check your Xcode installation."],
  ],
  'start/platforms/ios/ensureSimulatorAppRunning.js': [
    ['count processes whose name is "Simulator"', 'count processes whose name is "Simulator" or name is "DeviceHub"'],
    [/async function openSimulatorAppAsync\(device\) \{[\s\S]*?\n\}/, `async function openSimulatorAppAsync(device) {
    try {
        const args = ['-a', 'Simulator'];
        if (device.udid) args.push('--args', '-CurrentDeviceUDID', device.udid);
        await _spawnasync().default('open', args);
    } catch {
        const args = device.udid ? ['devices://device/open?id=' + encodeURIComponent(device.udid)] : ['-a', 'DeviceHub'];
        // The caller's polling loop reports a timeout if neither app opens.
        await _spawnasync().default('open', args).catch(() => {});
    }
}`],
  ],
  'start/platforms/ios/AppleDeviceManager.js': [
    ['await _osascript().execAsync(`tell application "Simulator" to activate`);',
      `await _osascript().execAsync([
            'if application "Simulator" is running then',
            'tell application "Simulator" to activate',
            'else if application "DeviceHub" is running then',
            'tell application "DeviceHub" to activate',
            'end if'
        ].join('\\n'));`],
  ],
};

function patchSource(file, source) {
  if (source.includes(marker)) return source;
  if (!patches[file]) throw new Error(`Unknown Expo patch target: ${file}`);
  let result = source;
  for (const [before, after] of patches[file]) {
    const matches = typeof before === 'string' ? result.split(before).length - 1 : (result.match(new RegExp(before.source, 'g')) || []).length;
    if (matches !== 1) throw new Error(`Expo CLI shape changed in ${file}; review the Device Hub backport before continuing.`);
    result = result.replace(before, () => after);
  }
  return `${marker}\n${result}`;
}

function applyPatch() {
  const expoRequire = createRequire(require.resolve('expo/package.json', { paths: [path.join(__dirname, '..')] }));
  const cliPackage = expoRequire.resolve('@expo/cli/package.json');
  const { version } = JSON.parse(fs.readFileSync(cliPackage, 'utf8'));
  if (version !== '54.0.27') throw new Error(`Device Hub backport expects @expo/cli 54.0.27, found ${version}. Review/remove the workaround when upgrading Expo.`);
  const root = path.join(path.dirname(cliPackage), 'build/src');
  // Validate every target before writing any files; unexpected dependency updates fail clearly.
  const updates = Object.keys(patches).map(file => {
    const target = path.join(root, file);
    const before = fs.readFileSync(target, 'utf8');
    return { target, before, after: patchSource(file, before) };
  });
  for (const { target, before, after } of updates) {
    if (before !== after) fs.writeFileSync(target, after);
  }
}

module.exports = { applyPatch, patchSource, targets: Object.keys(patches) };
if (require.main === module) applyPatch();
