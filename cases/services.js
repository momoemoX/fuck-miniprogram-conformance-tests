const { call } = require("./support");

async function services(appId, check) {
  await check(
    "service.account-identity",
    true,
    () => wx.getAccountInfoSync().miniProgram.appId === appId,
  );
  await check("service.login-code", true, async () => {
    const { code } = await call(wx, "login", { timeout: 8000 });
    return typeof code === "string" && code.length > 0;
  });
  await check("service.settings", true, async () => {
    const { authSetting } = await call(wx, "getSetting");
    return !!authSetting && Object.values(authSetting).every((value) => typeof value === "boolean");
  });
}
module.exports = { services };
