const config = require("../suite-config");

// Page scripts cannot synthesize touches. Cases that need real touch input queue a
// request here; the automation runner (tools/devtools/run.cjs) polls the queue, performs
// the action on the page-level element with miniprogram-automator and settles the request.
const DRIVER_WAIT = 10000;
let nextId = 0;

function driverEnabled() {
  return Boolean(config.driver);
}

function drive(selector, action, ...args) {
  const app = getApp();
  const queue = app.__driverQueue || (app.__driverQueue = []);
  const pending = app.__driverPending || (app.__driverPending = {});
  if (!app.__driverSettle) {
    app.__driverSettle = (id, error) => {
      if (pending[id]) pending[id](error);
    };
  }
  nextId += 1;
  const id = nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      delete pending[id];
      reject(new Error("Driver did not perform " + action + " on " + selector));
    }, DRIVER_WAIT);
    pending[id] = (error) => {
      clearTimeout(timer);
      delete pending[id];
      if (error) reject(new Error(error));
      else resolve();
    };
    queue.push({ id, selector, action, args });
  });
}

// Touch point in the shape miniprogram-automator forwards to the simulator.
function touchPoint(x, y) {
  return { identifier: 0, pageX: x, pageY: y, clientX: x, clientY: y };
}

module.exports = { driverEnabled, drive, touchPoint };
