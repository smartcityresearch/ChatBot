// Mock for Chart.js
module.exports = class Chart {
  constructor() {
    this.type = '';
    this.data = {};
    this.options = {};
    this.destroyed = false;
  }
  destroy() {
    this.destroyed = true;
    return true;
  }
  update() {}
};
