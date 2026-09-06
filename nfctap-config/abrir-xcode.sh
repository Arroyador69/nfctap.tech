#!/bin/bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
open "$DIR/ios/NFCTapConfig.xcworkspace"
echo "Abierto. Archive: destino Any iOS Device → Product → Archive."
