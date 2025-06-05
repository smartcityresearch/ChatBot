// Mock the fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    headers: {
      get: jest.fn().mockReturnValue('application/json')
    },
    json: () => Promise.resolve({ data: 'mocked data' }),
  })
);

// Mock for anything that might use ResizeObserver
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Add any other global mocks here as needed
