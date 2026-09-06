#!/bin/bash
# Cita rutas con espacios (p. ej. "impresora 3d"). Lo llama la fase
# "Bundle React Native code and images" de Xcode.
set -e

if [[ -f "$PODS_ROOT/../.xcode.env" ]]; then
  # shellcheck source=/dev/null
  source "$PODS_ROOT/../.xcode.env"
fi
if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
  # shellcheck source=/dev/null
  source "$PODS_ROOT/../.xcode.env.local"
fi

export PROJECT_ROOT="$PROJECT_DIR/.."

if [[ "$CONFIGURATION" = *Debug* ]]; then
  export SKIP_BUNDLING=1
fi
if [[ -z "$ENTRY_FILE" ]]; then
  export ENTRY_FILE="$("$NODE_BINARY" -e "require('expo/scripts/resolveAppEntry')" "$PROJECT_ROOT" ios absolute | tail -n 1)"
fi

if [[ -z "$CLI_PATH" ]]; then
  export CLI_PATH="$("$NODE_BINARY" --print "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })")"
fi
if [[ -z "$BUNDLE_COMMAND" ]]; then
  export BUNDLE_COMMAND="export:embed"
fi

if [[ -f "$PODS_ROOT/../.xcode.env.updates" ]]; then
  # shellcheck source=/dev/null
  source "$PODS_ROOT/../.xcode.env.updates"
fi
if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
  # shellcheck source=/dev/null
  source "$PODS_ROOT/../.xcode.env.local"
fi

REACT_NATIVE_XCODE="$("$NODE_BINARY" --print "require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'")"
/bin/sh "$REACT_NATIVE_XCODE"
