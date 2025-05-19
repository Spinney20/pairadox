// scripts/force-icon.cjs
const path   = require("path");
const rcedit = require("rcedit");

exports.default = async ctx => {
  if (ctx.electronPlatformName !== "win32") return;   // doar pe Windows

  // executabilul generat (de ex. release/win-unpacked/PairadoxAI.exe)
  const exePath = path.join(
    ctx.appOutDir,
    `${ctx.packager.appInfo.productFilename}.exe`
  );

  // ico pe care îl injectăm (lângă package.json -> build/icon.ico)
  const icoPath = path.join(__dirname, "..", "build", "icon.ico");

  console.log("🔧  Forcing icon with rcedit:", exePath, "<-", icoPath);

  await rcedit(exePath, { icon: icoPath });
};
