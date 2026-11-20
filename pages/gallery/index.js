// Shows one gallery cell, selected by the `cell` query, for visual reference capture.
// `font` overrides the stage's font family when references are recorded.
Page({
  data: { cell: "", font: "" },
  onLoad(query) {
    this.setData({ cell: query.cell || "", font: decodeURIComponent(query.font || "") });
  },
});
