Page({
  onLoad(options) {
    this.leg = options.leg;
  },
  onReady() {
    const journey = getApp().replacementJourney;
    if (journey) journey.arrive(this.leg);
  },
  onUnload() {
    const journey = getApp().replacementJourney;
    if (journey) journey.depart(this.leg);
  }
});
