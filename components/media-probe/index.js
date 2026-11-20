Component({
  data: {
    videoMounted: false,
    videoSrc: "",
    imageMounted: false,
    imageSrc: "",
  },
  lifetimes: {
    created() {
      this.resetEvents();
    },
  },
  methods: {
    resetEvents() {
      this.videoEvents = [];
      this.videoTimeUpdates = [];
      this.videoErrors = [];
      this.imageEvents = [];
    },
    getVideoContext() {
      return wx.createVideoContext("probe-video", this);
    },
    onVideoPlay() {
      this.videoEvents.push("play");
    },
    onVideoPause() {
      this.videoEvents.push("pause");
    },
    onVideoTimeUpdate(event) {
      const detail = (event && event.detail) || {};
      this.videoTimeUpdates.push({
        currentTime: detail.currentTime,
        duration: detail.duration,
      });
    },
    onVideoEnded() {
      this.videoEvents.push("ended");
    },
    onVideoError(event) {
      this.videoErrors.push((event && event.detail && event.detail.errMsg) || "error");
    },
    onImageLoad(event) {
      const detail = (event && event.detail) || {};
      this.imageEvents.push({
        type: "load",
        width: detail.width,
        height: detail.height,
      });
    },
    onImageError(event) {
      this.imageEvents.push({
        type: "error",
        errMsg: (event && event.detail && event.detail.errMsg) || "error",
      });
    },
  },
});
