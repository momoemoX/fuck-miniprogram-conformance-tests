const { call } = require("./support");

async function device(check) {
  await check("device.location-range", true, async () => {
    const result = await call(wx, "getLocation", { type: "wgs84" });
    return (
      Number.isFinite(result.latitude) &&
      Math.abs(result.latitude) <= 90 &&
      Number.isFinite(result.longitude) &&
      Math.abs(result.longitude) <= 180
    );
  });
  await check("device.accelerometer-sample", true, async () => {
    await call(wx, "startAccelerometer", { interval: "normal" });
    let listener;
    let timer;
    try {
      return await new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error("No sensor sample within five seconds")), 5000);
        listener = (sample) => resolve([sample.x, sample.y, sample.z].every(Number.isFinite));
        wx.onAccelerometerChange(listener);
      });
    } finally {
      clearTimeout(timer);
      if (listener) wx.offAccelerometerChange(listener);
      await call(wx, "stopAccelerometer");
    }
  });
  await check("device.battery-range", true, async () => {
    const result = await call(wx, "getBatteryInfo");
    return (
      Number.isFinite(result.level) &&
      result.level >= 0 &&
      result.level <= 100 &&
      typeof result.isCharging === "boolean"
    );
  });
}
module.exports = { device };
