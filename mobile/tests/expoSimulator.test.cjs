const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { applyPatch, patchSource, targets } = require('../scripts/patchExpoSimulator.cjs');

const expoRequire = createRequire(require.resolve('expo/package.json'));
const root = path.join(path.dirname(expoRequire.resolve('@expo/cli/package.json')), 'build/src');
class CommandError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), {
    exports,
    require: name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === 'path') return path;
      if (name === 'debug') return () => () => {};
      // Never fall back to real AppleScript or OS commands in these tests.
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports;
}

function prerequisite({ appId = null, bundle = null, simctlFails = false } = {}) {
  const calls = [];
  const loaded = load(targets[0], {
    '@expo/osascript': { execAsync: async script => {
      calls.push(script);
      if (appId && script === `id of app "${appId[0]}"`) return appId[1];
      throw new Error('App unregistered');
    } },
    '@expo/spawn-async': async (command, args) => {
      calls.push([command, args]);
      if (command === 'xcode-select') return { stdout: '/Applications/Xcode.app/Contents/Developer\n' };
      if (command === 'defaults' && bundle && args[1].includes(`/${bundle[0]}.app/`)) return { stdout: bundle[1] };
      if (command === 'xcrun' && !simctlFails) return { stdout: '' };
      throw new Error('Unavailable');
    },
    '../../../log': { warn() {} },
    '../Prerequisite': { Prerequisite: class {}, PrerequisiteCommandError: CommandError },
  });
  return { instance: loaded.SimulatorAppPrerequisite.instance, calls };
}

test('prerequisite accepts traditional Simulator and Xcode 27 Device Hub IDs', async () => {
  for (const appId of [
    ['Simulator', 'com.apple.iphonesimulator'],
    ['Simulator', 'com.apple.CoreSimulator.SimulatorTrampoline'],
    ['DeviceHub', 'com.apple.dt.Devices'],
  ]) {
    const { instance, calls } = prerequisite({ appId });
    await instance.assertImplementation();
    assert.ok(calls.some(call => Array.isArray(call) && call[0] === 'xcrun'));
  }
});

test('unregistered apps resolve from old and new Xcode plist locations', async () => {
  for (const bundle of [['Simulator', 'com.apple.iphonesimulator'], ['DeviceHub', 'com.apple.dt.Devices']]) {
    const { instance, calls } = prerequisite({ bundle });
    await instance.assertImplementation();
    const read = calls.find(call => Array.isArray(call) && call[0] === 'defaults' && call[1][1].includes(`/${bundle[0]}.app/`));
    const parent = bundle[0] === 'DeviceHub' ? '/Applications/Xcode.app/Contents/Applications' : '/Applications/Xcode.app/Contents/Developer/Applications';
    assert.equal(read[1][1], `${parent}/${bundle[0]}.app/Contents/Info.plist`);
  }
});

test('missing apps, unknown bundle IDs, and broken simctl still fail clearly', async () => {
  await assert.rejects(prerequisite().instance.assertImplementation(), { code: 'SIMULATOR_APP' });
  await assert.rejects(prerequisite({ appId: ['DeviceHub', 'unexpected.id'] }).instance.assertImplementation(), { code: 'SIMULATOR_APP' });
  await assert.rejects(prerequisite({ appId: ['DeviceHub', 'com.apple.dt.Devices'], simctlFails: true }).instance.assertImplementation(), { code: 'SIMCTL' });
});

function launcher({ running = false, oldAppFails = false, allOpenFail = false } = {}) {
  const calls = [];
  let opened = running;
  const { ensureSimulatorAppRunningAsync } = load(targets[1], {
    '@expo/osascript': { execAsync: async script => {
      assert.match(script, /name is "Simulator" or name is "DeviceHub"/);
      return opened ? '1' : '0';
    } },
    '@expo/spawn-async': async (command, args) => {
      assert.equal(command, 'open');
      calls.push(args);
      if (allOpenFail || (oldAppFails && args[1] === 'Simulator')) throw new Error('App missing');
      opened = true;
    },
    '../../../log': { log() {} },
    '../../../utils/delay': { waitForActionAsync: async ({ action }) => action() },
    '../../../utils/errors': { CommandError },
  });
  return { run: ensureSimulatorAppRunningAsync, calls };
}

test('already-running Device Hub does not trigger an extra launch', async () => {
  const { run, calls } = launcher({ running: true });
  await run({ udid: 'phone' });
  assert.deepEqual(calls, []);
});

test('launcher preserves Simulator and targets the Device Hub phone on fallback', async () => {
  const old = launcher();
  await old.run({ udid: 'phone' });
  assert.equal(JSON.stringify(old.calls), JSON.stringify([['-a', 'Simulator', '--args', '-CurrentDeviceUDID', 'phone']]));
  const next = launcher({ oldAppFails: true });
  await next.run({ udid: 'phone' });
  assert.equal(next.calls[1][0], 'devices://device/open?id=phone');
  const withoutDevice = launcher({ oldAppFails: true });
  await withoutDevice.run({});
  assert.equal(JSON.stringify(withoutDevice.calls[1]), JSON.stringify(['-a', 'DeviceHub']));
  await assert.rejects(launcher({ allOpenFail: true }).run({}), { code: 'SIMULATOR_TIMEOUT' });
});

test('window activation checks both app names after ensuring the selected simulator', async () => {
  const events = [];
  const noop = {};
  const { AppleDeviceManager } = load(targets[2], {
    './assertSystemRequirements': noop, './getBestSimulator': noop, './promptAppleDevice': noop,
    './simctl': noop, '../../../utils/delay': noop, '../../../utils/plist': noop,
    '../../../utils/url': noop, '../ExpoGoInstaller': noop,
    '../../../utils/errors': { CommandError },
    '../DeviceManager': { DeviceManager: class {} },
    './ensureSimulatorAppRunning': { ensureSimulatorAppRunningAsync: async device => events.push(device.udid) },
    '@expo/osascript': { execAsync: async script => events.push(script) },
  });
  const manager = new AppleDeviceManager();
  manager.device = { udid: 'phone' };
  await manager.activateWindowAsync();
  assert.equal(events[0], 'phone');
  assert.match(events[1], /else if application "DeviceHub" is running then\ntell application "DeviceHub" to activate/);
});

test('dependency patch is idempotent and rejects unexpected CLI shapes', () => {
  const before = targets.map(file => fs.readFileSync(path.join(root, file), 'utf8'));
  applyPatch();
  applyPatch();
  targets.forEach((file, index) => assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), before[index]));
  assert.throws(() => patchSource(targets[0], 'changed source'), /shape changed/);
});
