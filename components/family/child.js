Component({
  properties: { name: String },
  relations: { './parent': {type:'parent'} },
  methods: { family() { return this.getRelationNodes('./parent'); } }
});
