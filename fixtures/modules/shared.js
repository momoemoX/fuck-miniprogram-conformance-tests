let current = 0;
exports.read = () => current;
exports.write = (value) => {
  current = value;
};
