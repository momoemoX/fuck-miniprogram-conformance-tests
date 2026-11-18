const baseline = require("../../fixtures/baseline-surface");
const catalog = require("../../fixtures/api-surface");

Page({
  data: { groups: Object.keys(catalog), selected: 0, report: "", details: "" },
  onLoad() {
    this.inspect("Wx");
  },
  choose(event) {
    const selected = Number(event.detail.value);
    this.setData({ selected });
    this.inspect(this.data.groups[selected]);
  },
  inspect(name) {
    const members = catalog[name];
    const target =
      name === "Wx"
        ? wx
        : name === "FileSystemManager" && typeof wx.getFileSystemManager === "function"
          ? wx.getFileSystemManager()
          : null;
    if (!target) {
      this.setData({
        report: name + ": " + members.length + " catalog entries, availability unmeasured",
        details: members.join(", "),
      });
      return;
    }
    const expected = baseline[name] || [];
    const absent = expected.filter((key) => !(key in target));
    const different = expected.filter((key) => {
      if (!(key in target)) return false;
      const kind = name === "Wx" && baseline.wxObjectMembers.includes(key) ? "object" : "function";
      return typeof target[key] !== kind;
    });
    const missing = members.filter((key) => !(key in target));
    this.setData({
      report:
        name +
        ": " +
        (members.length - missing.length) +
        "/" +
        members.length +
        " catalog names present; " +
        (expected.length - absent.length) +
        "/" +
        expected.length +
        " baseline names present; " +
        different.length +
        " type mismatches",
      details:
        "Missing baseline names: " +
        (absent.join(", ") || "none") +
        ". Type mismatches: " +
        (different.join(", ") || "none") +
        ". Missing catalog names: " +
        (missing.join(", ") || "none"),
    });
  },
  onReady() {
    const selected = this.data.groups.indexOf("Wx");
    this.setData({ selected });
  },
});
