const { call } = require("./support");

async function firstSample(start, stop, subscribe, unsubscribe, project) {
  await call(wx, start, { interval: "normal" });
  let listener, timer;
  try {
    return await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Sensor did not deliver a sample")), 5000);
      listener = (event) => resolve(project(event));
      wx[subscribe](listener);
    });
  } finally {
    clearTimeout(timer);
    if (listener) wx[unsubscribe](listener);
    await call(wx, stop);
  }
}

async function hardware(check) {
  await check("device.compass-heading", true, () =>
    firstSample(
      "startCompass",
      "stopCompass",
      "onCompassChange",
      "offCompassChange",
      (v) => Number.isFinite(v.direction) && v.direction >= 0 && v.direction <= 360,
    ),
  );
  await check("device.gyroscope-vector", true, () =>
    firstSample("startGyroscope", "stopGyroscope", "onGyroscopeChange", "offGyroscopeChange", (v) =>
      [v.x, v.y, v.z].every(Number.isFinite),
    ),
  );
  await check("device.motion-vector", true, () =>
    firstSample(
      "startDeviceMotionListening",
      "stopDeviceMotionListening",
      "onDeviceMotionChange",
      "offDeviceMotionChange",
      (v) => [v.alpha, v.beta, v.gamma].every(Number.isFinite),
    ),
  );
  await check("device.brightness-range", true, async () => {
    const { value } = await call(wx, "getScreenBrightness");
    return Number.isFinite(value) && value >= 0 && value <= 1;
  });
  await check("device.bluetooth-adapter", true, async () => {
    await call(wx, "openBluetoothAdapter");
    try {
      const state = await call(wx, "getBluetoothAdapterState");
      return state.available === true && typeof state.discovering === "boolean";
    } finally {
      await call(wx, "closeBluetoothAdapter");
    }
  });
  await check("device.wifi-association", true, async () => {
    await call(wx, "startWifi");
    try {
      const result = await call(wx, "getConnectedWifi");
      return typeof result.wifi.SSID === "string" && result.wifi.SSID.length > 0;
    } finally {
      await call(wx, "stopWifi");
    }
  });
}
module.exports = { hardware };
