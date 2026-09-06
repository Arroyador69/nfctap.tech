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

function withQuotedConstantsScript(config) {
  return withDangerousMod(config, [
    "ios",
    async (mod) => {
      const podfile = path.join(mod.modRequest.platformProjectRoot, "Podfile");
      if (!fs.existsSync(podfile)) return mod;
      let src = fs.readFileSync(podfile, "utf8");
      if (src.includes("Generate app.config")) return mod;
      if (!src.includes("react_native_post_install")) return mod;
      src = src.replace(/(:ccache_enabled =>[^\n]+\n\s*\))\n/, `$1${HOOK}\n`);
      fs.writeFileSync(podfile, src);
      return mod;
    },
  ]);
}

module.exports = withQuotedConstantsScript;
