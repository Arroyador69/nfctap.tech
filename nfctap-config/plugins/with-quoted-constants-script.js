const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const HOOK = `
    installer.pods_project.targets.each do |target|
      target.build_phases.each do |phase|
        next unless phase.respond_to?(:name)
        next unless phase.name.to_s.include?("Generate app.config")
        phase.shell_script = '"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"'
      end
    end
`;

const BUNDLE_PHASE_SCRIPT =
  '/bin/sh "${SRCROOT}/../scripts/bundle-rn-ios.sh"\\n';

function quoteBundlePhase(src) {
  if (src.includes("scripts/bundle-rn-ios.sh")) return src;
  return src.replace(
    /(\/\* Bundle React Native code and images \*\/ = \{[\s\S]*?shellPath = \/bin\/sh;\n\t\t\t)shellScript = "[\s\S]*?";/,
    `$1shellScript = "${BUNDLE_PHASE_SCRIPT}";`
  );
}

function withQuotedConstantsScript(config) {
  return withDangerousMod(config, [
    "ios",
    async (mod) => {
      const root = mod.modRequest.platformProjectRoot;

      const podfile = path.join(root, "Podfile");
      if (fs.existsSync(podfile)) {
        let src = fs.readFileSync(podfile, "utf8");
        if (!src.includes("Generate app.config") && src.includes("react_native_post_install")) {
          src = src.replace(/(:ccache_enabled =>[^\n]+\n\s*\))\n/, `$1${HOOK}\n`);
          fs.writeFileSync(podfile, src);
        }
      }

      const projDir = fs
        .readdirSync(root)
        .find((name) => name.endsWith(".xcodeproj"));
      if (projDir) {
        const pbx = path.join(root, projDir, "project.pbxproj");
        if (fs.existsSync(pbx)) {
          const next = quoteBundlePhase(fs.readFileSync(pbx, "utf8"));
          fs.writeFileSync(pbx, next);
        }
      }

      return mod;
    },
  ]);
}

module.exports = withQuotedConstantsScript;
