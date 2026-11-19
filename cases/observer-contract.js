const { update } = require("./support");

// The watched node is absolutely positioned so moving its top between 1500px
// (below the fold) and 10px (in view) toggles its intersection with the viewport.
async function observerContract(page, check) {
  await check("observer.intersection-toggle", [1, 0, 0], async () => {
    const events = [];
    let timer;
    const waitForEvent = (count, ms = 3000) => {
      let poll;
      return new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Intersection event was not delivered")), ms);
        poll = setInterval(() => {
          if (events.length >= count) {
            clearInterval(poll);
            clearTimeout(timer);
            resolve();
          }
        }, 40);
      }).finally(() => clearInterval(poll));
    };

    const observer = page.createIntersectionObserver();
    observer.relativeToViewport().observe("#watched", (result) =>
      events.push(result.intersectionRatio),
    );
    try {
      await update(page, { watchedTop: "10px" });
      await waitForEvent(1);
      const visible = events[events.length - 1];
      await update(page, { watchedTop: "1500px" });
      await waitForEvent(2);
      const hidden = events[events.length - 1];
      observer.disconnect();
      const before = events.length;
      await update(page, { watchedTop: "10px" });
      // Negative window: a disconnected observer must stay silent.
      await new Promise((resolve) => setTimeout(resolve, 500));
      return [Math.round(visible), Math.round(hidden), events.length - before];
    } finally {
      clearTimeout(timer);
      observer.disconnect();
      await update(page, { watchedTop: "1500px" });
    }
  });
}
module.exports = { observerContract };
