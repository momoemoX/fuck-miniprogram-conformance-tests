const { delay, uniqueKey, update, waitUntil } = require("./support");

const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

// Builds a standard 16-bit signed PCM mono WAV ArrayBuffer (digital silence).
function buildSilentWav(durationSec, sampleRate = 16000) {
  const numSamples = Math.max(1, Math.round(durationSec * sampleRate));
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeAscii = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };
  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);
  return buffer;
}

async function withAudioFixture(durationSec, exercise) {
  const fs = wx.getFileSystemManager();
  const filePath = wx.env.USER_DATA_PATH + "/" + uniqueKey() + ".wav";
  fs.writeFileSync(filePath, buildSilentWav(durationSec));
  const audio = wx.createInnerAudioContext();
  audio.volume = 0;
  try {
    return await exercise(audio, filePath);
  } finally {
    try {
      audio.destroy();
    } catch {
      /* Cleanup best effort */
    }
    try {
      fs.unlinkSync(filePath);
    } catch {
      /* Cleanup best effort */
    }
  }
}

async function mediaBoundaries(page, check) {
  await check(
    "audio.play-pause-resume",
    [true, ["play", "pause", "play"], false, true, true, true, false, true],
    () =>
      withAudioFixture(1.5, async (audio, filePath) => {
        const events = [];
        const errors = [];
        const initialPaused = audio.paused;
        audio.onPlay(() => events.push("play"));
        audio.onPause(() => events.push("pause"));
        audio.onError((err) => errors.push(err && err.errMsg ? err.errMsg : String(err)));
        audio.src = filePath;

        audio.play();
        await waitUntil(() => events.length >= 1, { timeout: 5000 });
        const playingPaused = audio.paused;
        await waitUntil(() => typeof audio.duration === "number" && audio.duration > 0, {
          timeout: 3000,
        });
        const hasDuration =
          typeof audio.duration === "number" && audio.duration >= 1.0 && audio.duration <= 2.5;

        audio.pause();
        await waitUntil(() => events.length >= 2, { timeout: 5000 });
        const pausedState = audio.paused;
        const pausedTime = audio.currentTime;
        // Negative window: currentTime must stay frozen while paused.
        await delay(150);
        const stayedPaused =
          audio.paused === true && Math.abs(audio.currentTime - pausedTime) < 0.15;

        audio.play();
        await waitUntil(() => events.length >= 3, { timeout: 5000 });
        const resumedPaused = audio.paused;

        return [
          initialPaused,
          events.slice(0, 3),
          playingPaused,
          hasDuration,
          pausedState,
          stayedPaused,
          resumedPaused,
          errors.length === 0,
        ];
      }),
  );

  await check("audio.seek-and-timeupdate", [true, true, true, true], () =>
    withAudioFixture(2.0, async (audio, filePath) => {
      const timeUpdates = [];
      const errors = [];
      let played = false;
      let seeked = false;
      audio.onPlay(() => {
        played = true;
      });
      audio.onSeeked(() => {
        seeked = true;
      });
      audio.onTimeUpdate(() => {
        timeUpdates.push(audio.currentTime);
      });
      audio.onError((err) => errors.push(err && err.errMsg ? err.errMsg : String(err)));
      audio.src = filePath;

      audio.play();
      await waitUntil(() => played, { timeout: 5000 });
      audio.seek(1.0);
      await waitUntil(
        () => seeked && timeUpdates.some((t) => typeof t === "number" && t >= 0.75),
        { timeout: 6000 },
      );

      return [
        seeked,
        timeUpdates.length > 0,
        timeUpdates.some((t) => typeof t === "number" && t >= 0.75 && t <= 2.2),
        errors.length === 0,
      ];
    }),
  );

  await check("audio.play-to-ended", [["play", "ended"], true, true], () =>
    withAudioFixture(0.4, async (audio, filePath) => {
      const events = [];
      const errors = [];
      audio.loop = false;
      audio.onPlay(() => events.push("play"));
      audio.onEnded(() => events.push("ended"));
      audio.onError((err) => errors.push(err && err.errMsg ? err.errMsg : String(err)));
      audio.src = filePath;

      audio.play();
      await waitUntil(() => events.indexOf("ended") !== -1, { timeout: 6000 });
      return [events, audio.paused, errors.length === 0];
    }),
  );

  await check("audio.stop-resets-state", [["play", "stop"], true, true], () =>
    withAudioFixture(1.5, async (audio, filePath) => {
      const events = [];
      const errors = [];
      audio.onPlay(() => events.push("play"));
      audio.onStop(() => events.push("stop"));
      audio.onEnded(() => events.push("ended"));
      audio.onError((err) => errors.push(err && err.errMsg ? err.errMsg : String(err)));
      audio.src = filePath;

      audio.play();
      await waitUntil(() => events.indexOf("play") !== -1, { timeout: 5000 });
      audio.stop();
      await waitUntil(() => events.indexOf("stop") !== -1, { timeout: 5000 });
      // Negative window: stop() must not emit a subsequent ended event.
      await delay(200);
      return [events, audio.paused, errors.length === 0];
    }),
  );

  async function isolatedMedia(id, expected, exercise) {
    await check(id, expected, async () => {
      try {
        await update(page, { mediaMounted: true });
        const probe = page.selectComponent("#media-probe");
        probe.resetEvents();
        return await exercise(probe);
      } finally {
        await update(page, { mediaMounted: false });
      }
    });
  }

  await check("buffer-url.create-unique-and-revoke", [true, true, true, true], () => {
    const buffer = new Uint8Array([10, 20, 30, 40]).buffer;
    const typed = new Uint8Array([10, 20, 30, 40]);
    const url1 = wx.createBufferURL(buffer);
    const url2 = wx.createBufferURL(typed);
    let revokedOk = true;
    try {
      wx.revokeBufferURL(url1);
      wx.revokeBufferURL(url2);
      // Double-revoking an already-revoked URL must remain a safe no-op.
      wx.revokeBufferURL(url1);
    } catch {
      revokedOk = false;
    }
    return [
      typeof url1 === "string" && url1.length > 0,
      typeof url2 === "string" && url2.length > 0,
      url1 !== url2,
      revokedOk,
    ];
  });

  // Uses two distinct buffer URLs: urlValid proves an active buffer URL decodes into
  // <image>, while urlRevoked is revoked before first load so Chromium's decoded-image
  // memory cache cannot mask revocation.
  await isolatedMedia(
    "buffer-url.image-load-and-revoke",
    [["load", 1, 1], "error"],
    async (probe) => {
      const pngBuffer = wx.base64ToArrayBuffer(PNG_1X1_BASE64);
      const urlValid = wx.createBufferURL(pngBuffer);
      const urlRevoked = wx.createBufferURL(pngBuffer);
      wx.revokeBufferURL(urlRevoked);
      try {
        await update(probe, { imageMounted: true, imageSrc: urlValid });
        const loaded = await waitUntil(() => probe.imageEvents[0], { timeout: 5000 });
        const beforeRevoke = loaded
          ? [loaded.type, loaded.width || 0, loaded.height || 0]
          : ["timeout", 0, 0];

        await update(probe, { imageMounted: false, imageSrc: "" });
        probe.imageEvents = [];

        await update(probe, { imageMounted: true, imageSrc: urlRevoked });
        const after = await waitUntil(() => probe.imageEvents[0], { timeout: 5000 });
        return [beforeRevoke, after ? after.type : "timeout"];
      } finally {
        try {
          wx.revokeBufferURL(urlValid);
        } catch {
          /* Cleanup best effort */
        }
      }
    },
  );
}

// Video playback requires an HTTP media source in the 3.7.12 simulator (packaged relative
// paths and data URIs fail with MEDIA_ERR_SRC_NOT_SUPPORTED), so these cases run when the
// HTTP fixture is enabled.
async function videoBoundaries(page, base, check) {
  const videoUrl = base.replace(/\/$/, "") + "/video.mp4";
  async function isolatedVideo(id, expected, exercise) {
    await check(id, expected, async () => {
      try {
        await update(page, { mediaMounted: true });
        const probe = page.selectComponent("#media-probe");
        probe.resetEvents();
        return await exercise(probe);
      } finally {
        await update(page, { mediaMounted: false });
      }
    });
  }

  await isolatedVideo(
    "video.context-play-pause",
    [["play", "pause", "play"], true],
    async (probe) => {
      await update(probe, { videoMounted: true, videoSrc: videoUrl });
      const ctx = probe.getVideoContext();
      ctx.play();
      await waitUntil(() => probe.videoEvents.length >= 1, { timeout: 6000 });
      ctx.pause();
      await waitUntil(() => probe.videoEvents.length >= 2, { timeout: 6000 });
      ctx.play();
      await waitUntil(() => probe.videoEvents.length >= 3, { timeout: 6000 });
      ctx.pause();
      return [probe.videoEvents.slice(0, 3), probe.videoErrors.length === 0];
    },
  );

  await isolatedVideo(
    "video.context-seek-timeupdate-ended",
    [true, true, true, true, true],
    async (probe) => {
      await update(probe, { videoMounted: true, videoSrc: videoUrl });
      const ctx = probe.getVideoContext();
      ctx.play();
      await waitUntil(() => probe.videoEvents.indexOf("play") !== -1, { timeout: 6000 });
      ctx.seek(0.6);
      await waitUntil(() => probe.videoEvents.indexOf("ended") !== -1, { timeout: 8000 });

      const playIdx = probe.videoEvents.indexOf("play");
      const endedIdx = probe.videoEvents.indexOf("ended");
      const updates = probe.videoTimeUpdates;
      return [
        playIdx !== -1 && endedIdx > playIdx,
        updates.length > 0,
        updates.some(
          (entry) =>
            Number.isFinite(entry.duration) && entry.duration >= 0.8 && entry.duration <= 2.0,
        ),
        updates.some((entry) => Number.isFinite(entry.currentTime) && entry.currentTime >= 0.45),
        probe.videoErrors.length === 0,
      ];
    },
  );
}

module.exports = { mediaBoundaries, videoBoundaries };
