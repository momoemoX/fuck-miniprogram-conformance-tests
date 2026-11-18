Component({
  relations: {
    './child': {
      type:'child',
      linked(child) { this.linkedNames.push(child.properties.name); },
      unlinked(child) { this.removedNames.push(child.properties.name); }
    }
  },
  lifetimes: { created() { this.linkedNames = []; this.removedNames = []; } },
  methods: { names() { return this.getRelationNodes('./child').map(child => child.properties.name); } }
});
