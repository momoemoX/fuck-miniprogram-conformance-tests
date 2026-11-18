module.exports = { name: "left" };
const right = require("./right");
module.exports.peer = right.name;
module.exports.seenByPeer = right.seen;
