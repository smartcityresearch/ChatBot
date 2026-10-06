module.exports = class Chart {
  constructor() {
    this.destroyed = false;
  }
  destroy() {
    this.destroyed = true;
  }
  update() {}
};
