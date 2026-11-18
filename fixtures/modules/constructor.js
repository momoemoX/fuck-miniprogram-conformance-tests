function Counter() {
  this.value = 0;
}
Counter.prototype.next = function () {
  this.value++;
  return this.value;
};
module.exports = Counter;
