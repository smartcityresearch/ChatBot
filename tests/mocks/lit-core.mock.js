// Mock for LitElement and lit/html
module.exports = {
  LitElement: class {
    static get properties() { return {}; }
    createRenderRoot() { return this; }
    render() { return null; }
    requestUpdate() {}
  },
  html: (strings, ...values) => strings.reduce((acc, str, i) => acc + str + (values[i] || ''), ''),
  css: (strings, ...values) => strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '')
};
