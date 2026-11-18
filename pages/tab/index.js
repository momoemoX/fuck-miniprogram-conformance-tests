Page({
  data: { visits: 0 },
  onShow() {
    this.setData({ visits: this.data.visits + 1 });
    const journey = getApp().tabJourney;
    if (journey) journey(this.data.visits);
  }
});
