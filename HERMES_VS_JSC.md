# Hermes vs JSC Setup

## Current Status: Using Modern Hermes (RN 0.82 Default)

✅ **Hermes build is working and ready for benchmarking**

React Native 0.82 ships with modern Hermes (version 0.82.1) as the default JavaScript engine, providing improved performance and startup times over previous versions.

**Note on Hermes V1**: Hermes V1 (~5-15% faster) is available experimentally in RN 0.82 but requires building React Native from source (2-4 hour setup). For benchmarking purposes, standard Hermes 0.82.1 provides excellent performance.

## JSC Support is Blocked

There's a regression in React Native 0.82 that breaks JSC support:
https://github.com/facebook/react-native/commit/69826e1f11737e973149a4d90981ad57238e6ca1

**Issue:** `@rnx-kit/react-native-host` unconditionally includes Hermes headers even when `USE_HERMES=0`

## To Switch Engines (When Supported)

### Use Hermes (Current/Default):
```bash
cd apps/benchmarking-test-app/ios
rm -rf Pods Podfile.lock
pod install  # Uses Hermes by default
```

### Use JSC (When regression is fixed):
```bash
export USE_HERMES=0
export USE_THIRD_PARTY_JSC=1
cd apps/benchmarking-test-app/ios
rm -rf Pods Podfile.lock
pod install
```

See `JSC_SETUP_NOTES.md` for detailed JSC setup instructions.

## What's Patched

All patches are in `patches/react-native+0.82.1.patch`:
- JSC flags spacing fix in `jsengine.rb`
- Conditional Hermes pods in `utils.rb`  
- GCC_PREPROCESSOR_DEFINITIONS for proper flag propagation
- Uses `use_hermes()` instead of hardcoded true

These patches are required for JSC support once the regression is fixed.
