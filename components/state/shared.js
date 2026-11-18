module.exports = Behavior({
  data: { ingredient: "rye" },
  methods: {
    recipe() {
      return this.data.ingredient + "/" + this.properties.flavor;
    },
  },
});
