// Mock browser globals
global.window = {
  addEventListener: jest.fn()
};

global.document = {
  addEventListener: jest.fn(),
  createElement: jest.fn(() => ({
    setAttribute: jest.fn(),
    style: {}
  })),
  createElementNS: jest.fn(() => ({
    setAttribute: jest.fn(),
    style: {}
  })),
  getElementById: jest.fn(() => ({
    addEventListener: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(() => true)
    },
    style: {}
  })),
  querySelector: jest.fn(() => ({
    value: '',
    focus: jest.fn()
  })),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
};

// Mock Chart.js
global.Chart = class Chart {
  constructor() {
    this.destroyed = false;
  }
  destroy() {
    this.destroyed = true;
  }
};

// Mock custom elements for web components
global.customElements = {
  define: jest.fn()
};

// Mock HTMLElement for extending web components
global.HTMLElement = class HTMLElement {
  constructor() {
    this.shadowRoot = {
      innerHTML: '',
      getElementById: jest.fn(() => ({
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          contains: jest.fn()
        },
        style: {},
        addEventListener: jest.fn(),
        scrollTop: 0,
        scrollHeight: 100
      })),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      appendChild: jest.fn()
    };
  }
  attachShadow() {
    return this.shadowRoot;
  }
  addEventListener() {}
  removeEventListener() {}
};
