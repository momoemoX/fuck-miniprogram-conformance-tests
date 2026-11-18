Component({
  properties: { amount: Number },
  methods: {
    result() { return this.selectComponent('#formatter').display(); },
    ownsFormatter() { return this.selectComponent('#formatter').selectOwnerComponent() === this; }
  }
});
