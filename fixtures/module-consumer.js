const state = require('./module-state');
module.exports = function readCounter() { return state.counter; };
