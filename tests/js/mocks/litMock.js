export const LitElement = class {
  constructor() {
    this.shadowRoot = {
      innerHTML: '',
      getElementById: jest.fn(),
      querySelector: jest.fn(),
    };
  }
  attachShadow() {
    return this.shadowRoot;
  }
  addEventListener() {}
  removeEventListener() {}
};

export const html = (strings, ...values) => strings.join('');
export const css = (strings, ...values) => strings.join('');
