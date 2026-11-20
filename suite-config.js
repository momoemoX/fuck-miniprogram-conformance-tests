// Set fixtureUrl/socketUrl to addresses reachable from the runtime to include HTTP and
// WebSocket cases. driver is set by tools/devtools/run.cjs, which performs the touch
// input that driver-profile cases request (see cases/driver.js); without it those cases
// are left out of the run.
module.exports = { fixtureUrl: "", socketUrl: "", testAppId: "", driver: false };
