# JSC Configuration for React Native 0.82

## Status: BLOCKED by React Native Regression

React Native 0.82 has a regression that breaks all non-Hermes JavaScript VMs.

**Root Cause:** https://github.com/facebook/react-native/commit/69826e1f11737e973149a4d90981ad57238e6ca1#diff-fac30f0fab9794c1f5794fe74c9067d7fc1a2bc47718bbf5346a1ca348f989fcR50

The issue is in `@rnx-kit/react-native-host` which unconditionally includes Hermes headers even when `USE_HERMES=0` is defined, due to module precompilation caching the headers with Hermes enabled.

## What We Fixed (Ready for when regression is resolved)

1. **Patched React Native Core** (`patches/react-native+0.82.1.patch`):
   - Fixed `jsengine.rb` spacing in compiler flags
   - Made Hermes pods conditional in `utils.rb`
   - Fixed `react_native_pods.rb` to use `use_hermes()` instead of hardcoded `true`
   - Added `GCC_PREPROCESSOR_DEFINITIONS` to React-RCTAppDelegate.podspec

2. **Made react-native-release-profiler JSC-compatible**:
   - Wrapped all Hermes code in `#if USE_HERMES` conditionals
   - Now gracefully logs "Profiling not supported with JSC" instead of crashing

## How to Switch to JSC (Once Regression is Fixed)

### 1. Set Environment Variables

```bash
export USE_HERMES=0
export USE_THIRD_PARTY_JSC=1
```

### 2. Clean and Reinstall Pods

```bash
cd apps/benchmarking-test-app/ios
rm -rf Pods Podfile.lock
pod install
```

### 3. Clean Xcode Caches

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData/ModuleCache.noindex
```

### 4. Build

```bash
xcodebuild -workspace benchmarking-test-app.xcworkspace \
  -scheme ReactTestApp \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 11' \
  build
```

## Current Workaround

Use Hermes (the officially supported engine for RN 0.82+):

```bash
# Remove environment variables or set:
export USE_HERMES=1
export USE_THIRD_PARTY_JSC=0

cd apps/benchmarking-test-app/ios
rm -rf Pods Podfile.lock
pod install
```

## Files Modified

- `patches/react-native+0.82.1.patch` - Core React Native JSC support fixes
- `node_modules/react-native-release-profiler/ios/ReleaseProfiler.mm` - Made conditional for JSC
- `node_modules/react-native/Libraries/AppDelegate/React-RCTAppDelegate.podspec` - Added preprocessor definitions

## Dependencies

- `@react-native-community/jsc` (React JSC) - Already in package.json
- All patches are applied via `patch-package` on `npm install`
