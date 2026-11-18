Component({
  data: {
    phase: 0,
    entries: [
      { code: "a", label: "pear" },
      { code: "b", label: "plum" },
    ],
    groups: [
      { name: "north", items: [2, 3] },
      { name: "south", items: [5] },
    ],
    dictionary: { left: 4, right: 9 },
    title: "outer",
    payload: { title: "inner", count: 2 },
    templateName: "badge",
    number: 4,
    flag: false,
    empty: "",
    word: "alpha",
    optional: {},
    sample: { items: [1, 2], name: "seed" },
    copySample: { items: [1, 2], name: "seed" },
  },
});
