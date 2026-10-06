// Mock browser globals
global.window = {
  addEventListener: jest.fn(),
  customElements: { define: jest.fn() }
};

global.document = {
  addEventListener: jest.fn(),
  createElement: jest.fn(() => ({
    setAttribute: jest.fn(),
    style: {},
    appendChild: jest.fn(),
    innerHTML: ''
  })),
  getElementById: jest.fn(() => ({
    classList: { 
      add: jest.fn(), 
      remove: jest.fn(),
      contains: jest.fn()
    },
    addEventListener: jest.fn(),
    scrollTop: 0,
    scrollHeight: 100
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

// Mock for Chart
global.Chart = class {
  constructor() {
    this.destroyed = false;
  }
  destroy() {
    this.destroyed = true;
    return true;
  }
  update() {}
};

// Mock fetch API
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    status: 200,
    headers: {
      get: jest.fn().mockReturnValue('application/json')
    },
    json: () => Promise.resolve({
      response: "Test response"
    })
  })
);

// Mock customElements
global.customElements = { define: jest.fn() };

// Mock HTMLElement for web components
global.HTMLElement = class {
  constructor() {
    this.shadowRoot = {
      getElementById: jest.fn(),
      querySelector: jest.fn()
    };
  }
  attachShadow() { return this.shadowRoot; }
};
