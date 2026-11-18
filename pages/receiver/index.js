Page({
  onReady() {
    const probe = getApp().channelProbe;
    if (!probe) return;

    try {
      probe.receiverReady(this.getOpenerEventChannel());
    } catch (error) {
      probe.failed(error);
    }
  }
});
