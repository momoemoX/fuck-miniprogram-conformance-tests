async function moduleContract(check) {
  await check(
    "module.cache-identity",
    true,
    () => require("../fixtures/modules/shared") === require("../fixtures/modules/shared"),
  );
  await check(
    "module.explicit-extension",
    true,
    () => require("../fixtures/modules/shared") === require("../fixtures/modules/shared.js"),
  );
  await check(
    "module.relative-parent",
    true,
    () => require("../fixtures/modules/shared") === require("../fixtures/modules/nested/reader"),
  );
  await check("module.shared-mutation", 37, () => {
    const direct = require("../fixtures/modules/shared");
    const nested = require("../fixtures/modules/nested/reader");
    const previous = direct.read();
    try {
      direct.write(37);
      return nested.read();
    } finally {
      direct.write(previous);
    }
  });
  await check("module.reverse-shared-mutation", 19, () => {
    const direct = require("../fixtures/modules/shared");
    const nested = require("../fixtures/modules/nested/reader");
    const previous = direct.read();
    try {
      nested.write(19);
      return direct.read();
    } finally {
      direct.write(previous);
    }
  });
  await check("module.replaced-exports", { value: "replacement" }, () =>
    require("../fixtures/modules/aliases"),
  );
  await check("module.function-export", "peel/seed", () =>
    require("../fixtures/modules/function")("peel", "seed"),
  );
  await check(
    "module.function-property",
    "callable",
    () => require("../fixtures/modules/function").kind,
  );
  await check("module.constructor-identity", true, () => {
    const Constructor = require("../fixtures/modules/constructor");
    return new Constructor() instanceof require("../fixtures/modules/constructor");
  });
  await check("module.constructor-instance-state", [1, 2, 1], () => {
    const Constructor = require("../fixtures/modules/constructor");
    const first = new Constructor(),
      second = new Constructor();
    return [first.next(), first.next(), second.next()];
  });
  await check(
    "module.explicit-directory-index",
    "directory-index",
    () => require("../fixtures/modules/folder/index.js").location,
  );
  await check("module.directory-shorthand-rejected", true, () => {
    try {
      require("../fixtures/modules/folder");
      return false;
    } catch (error) {
      return error instanceof Error;
    }
  });
  await check("module.cycle-partial-exports", ["right", "undefined"], () => {
    const left = require("../fixtures/modules/cycle/left");
    return [left.peer, typeof left.seenByPeer];
  });
  await check("module.cycle-reference", false, () => {
    const left = require("../fixtures/modules/cycle/left");
    return require("../fixtures/modules/cycle/right").left === left;
  });
  await check("module.failure-first", "suite-module-failure", () => {
    try {
      require("../fixtures/modules/failing");
      return "no-error";
    } catch (error) {
      return error.message;
    }
  });
  await check("module.failure-repeat", ["suite-module-failure", "suite-module-failure"], () => {
    const errors = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        require("../fixtures/modules/failing");
        errors.push("no-error");
      } catch (error) {
        errors.push(error.message);
      }
    }
    return errors;
  });
}
module.exports = { moduleContract };
