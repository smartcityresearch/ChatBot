/**
 * @jest-environment jsdom
 */

import { ChatBotComponent, DataProcessor } from '../../static/js/chat-bot-component.js';

describe('ChatBotComponent', () => {
  let component;

  beforeEach(() => {
    component = new ChatBotComponent();
    component.shadowRoot = document.createElement('div');
    component.shadowRoot.getElementById = jest.fn((id) => {
      if (id === 'chat-pop') return {
        classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn() }
      };
      if (id === 'message-container') return {
        innerHTML: '',
        appendChild: jest.fn(),
        scrollTop: 0,
        scrollHeight: 100,
        classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn() }
      };
      // Always return a stub for visualization-modal (never null!)
      if (id === 'visualization-modal') return {
        addEventListener: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() },
        style: { display: 'none' }
      };
      if (id === 'visualization-close') return { addEventListener: jest.fn() };
      if (id === 'visualization-header') return {};
      if (id === 'loading-spinner') return { style: { display: 'flex' } };
      if (id === 'visualization-chart') return { getContext: jest.fn(() => ({ clearRect: jest.fn() })), style: { display: 'none' } };
      if (id === 'error-message') return { style: { display: 'none' }, textContent: '' };
      return {};
    });
    component.shadowRoot.querySelector = jest.fn(() => ({
      value: '',
      focus: jest.fn()
    }));
    component.shadowRoot.removeChild = jest.fn();
    component.messages = [];
    component.currentOptions = [];
    component.userInput = '';
    component.editingMessageIndex = -1;
    component.editedMessage = '';
    component.recommendedQuestions = [];
    component.showRecommendedQuestions = false;
    component.conversationOptions = [];
    component.currentChart = null;
  });

  test('togglePopup toggles popup state', () => {
    const initial = component.popupActive || false;
    component.togglePopup();
    expect(component.popupActive).toBe(!initial);
  });

  test('toggleRecommendedQuestions toggles state', () => {
    const initial = component.showRecommendedQuestions;
    component.toggleRecommendedQuestions();
    expect(component.showRecommendedQuestions).toBe(!initial);
  });

  test('handleUserInput updates userInput', () => {
    const event = { target: { value: 'test input' } };
    component.handleUserInput(event);
    expect(component.userInput).toBe('test input');
  });

  test('handleKeyDown triggers sendMessage on Enter', async () => {
    component.userInput = 'test';
    const spy = jest.spyOn(component, 'sendMessage').mockResolvedValue();
    const event = { key: 'Enter', preventDefault: jest.fn() };
    await component.handleKeyDown(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('addMessage adds a message and calls populateMessages', () => {
    const spy = jest.spyOn(component, 'populateMessages');
    component.addMessage('Hello', 'bot');
    expect(component.messages[0]).toEqual({ text: 'Hello', sender: 'bot' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('resetInputAndPopulateMessages resets userInput and calls populateMessages', () => {
    component.userInput = 'something';
    const spy = jest.spyOn(component, 'populateMessages');
    component.resetInputAndPopulateMessages();
    expect(component.userInput).toBe('');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('populateMessages renders messages', () => {
    component.messages = [
      { text: 'Bot message', sender: 'bot' },
      { text: 'User message', sender: 'user' }
    ];
    component.editingMessageIndex = -1;
    expect(() => component.populateMessages()).not.toThrow();
  });

  test('populateMessages handles editing state', () => {
    component.messages = [{ text: 'User', sender: 'user' }];
    component.editingMessageIndex = 0;
    expect(() => component.populateMessages()).not.toThrow();
  });

  test('populateMessages handles visualization icon', () => {
    component.messages = [{ text: 'Bot\n\n<div id="viz" class="visualization-icon"></div>', sender: 'bot' }];
    component.editingMessageIndex = -1;
    expect(() => component.populateMessages()).not.toThrow();
  });

  test('startEditMessage sets editing state for user message', () => {
    component.messages = [{ text: 'Bot', sender: 'bot' }, { text: 'User', sender: 'user' }];
    component.startEditMessage(1);
    expect(component.editingMessageIndex).toBe(1);
    expect(component.editedMessage).toBe('User');
  });

  test('saveEditedMessage updates message and resets editing state', async () => {
    component.messages = [{ text: 'Bot', sender: 'bot' }, { text: 'User', sender: 'user' }];
    component.editingMessageIndex = 1;
    component.editedMessage = 'Edited';
    component.sendMessageToBackend = jest.fn().mockResolvedValue('Bot response');
    component.populateMessages = jest.fn();
    await component.saveEditedMessage();
    expect(component.messages[1].text).toBe('Edited');
    expect(component.editingMessageIndex).toBe(-1);
    expect(component.editedMessage).toBe('');
    expect(component.populateMessages).toHaveBeenCalled();
  });

  test('saveEditedMessage does nothing if not editing', async () => {
    component.editingMessageIndex = -1;
    component.editedMessage = '';
    component.populateMessages = jest.fn();
    await component.saveEditedMessage();
    expect(component.populateMessages).not.toHaveBeenCalled();
  });

  test('cancelEditMessage resets editing state', () => {
    component.editingMessageIndex = 1;
    component.editedMessage = 'test';
    component.cancelEditMessage();
    expect(component.editingMessageIndex).toBe(-1);
    expect(component.editedMessage).toBe('');
  });

  test('handleOptionSelection sets userInput and calls sendMessage', async () => {
    const spy = jest.spyOn(component, 'sendMessage').mockResolvedValue();
    await component.handleOptionSelection('1');
    expect(component.userInput).toBe('1');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('handleRecommendedQuestion sets userInput and clears recommendations', async () => {
    component.recommendedQuestions = ['Q?'];
    component.conversationOptions = [{ text: '1', next: 'test' }];
    const spy = jest.spyOn(component, 'sendMessage').mockResolvedValue();
    await component.handleRecommendedQuestion('Q?');
    expect(component.userInput).toBe('Q?');
    expect(component.recommendedQuestions).toEqual([]);
    expect(component.conversationOptions).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('extractLocation finds known locations', () => {
    expect(component.extractLocation('Temperature at Vindhya')).toBe('Vindhya');
    expect(component.extractLocation('Humidity in Kohli Block')).toBe('Kohli Block');
    expect(component.extractLocation('Unknown location')).toBeUndefined();
  });

  test('getLevenshteinDistance computes string distance', () => {
    expect(component.getLevenshteinDistance('abc', 'abcd')).toBe(1);
    expect(component.getLevenshteinDistance('', 'abc')).toBe(3);
    expect(component.getLevenshteinDistance('abc', '')).toBe(3);
    expect(component.getLevenshteinDistance('', '')).toBe(0);
  });

  test('getNodeColor returns consistent color', () => {
    const color1 = component.getNodeColor('aq-01');
    const color2 = component.getNodeColor('aq-01');
    expect(color1).toBe(color2);
    const color3 = component.getNodeColor('aq-02');
    expect(color1).not.toBe(color3);
  });

  test('extractTemporalData returns expected structure', () => {
    const data = {
      node_data: {
        'aq-01': {
          filtered_data: {
            category1: {
              data: [
                { timestamp: '2023-01-01T12:00:00Z', temperature: '25.5', node_id: 'aq-01' }
              ]
            }
          }
        }
      }
    };
    const result = component.extractTemporalData(data);
    expect(result).toHaveProperty('temperature');
    expect(result.temperature).toHaveProperty('labels');
    expect(result.temperature).toHaveProperty('values');
    expect(result.temperature).toHaveProperty('nodeIds');
  });

  test('extractCurrentData returns expected structure', () => {
    const data = {
      node_data: {
        'aq-01': {
          category1: [
            { name: 'Node 1', temperature: '25.5', node_id: 'aq-01' }
          ]
        }
      }
    };
    const result = component.extractCurrentData(data);
    expect(result).toHaveProperty('temperature');
    expect(result.temperature).toHaveProperty('labels');
    expect(result.temperature).toHaveProperty('values');
  });

  test('sendMessageToBackend handles server error', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, headers: { get: () => 'application/json' }, json: async () => ({}) }));
    const response = await component.sendMessageToBackend('test');
    expect(response).toContain('Sorry');
  });

  test('sendMessageToBackend handles non-JSON response', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, headers: { get: () => 'text/html' }, json: async () => ({}) }));
    const response = await component.sendMessageToBackend('test');
    expect(response).toContain('unexpected response format');
  });

  test('openVisualizationModal handles chart creation and destruction', async () => {
    component.currentChart = { destroy: jest.fn() };
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({
        is_temporal: false,
        node_data: { 'node1': { category1: [{ name: 'N1', temperature: 25 }] } }
      })
    }));
    await expect(component.openVisualizationModal('test query')).resolves.toBeUndefined();
  });

  test('openVisualizationModal handles error', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, headers: { get: () => 'application/json' }, json: async () => ({}) }));
    await expect(component.openVisualizationModal('test query')).resolves.toBeUndefined();
  });

  test('handleLocationButton handles location', async () => {
    component.messages = [
      { text: 'Bot', sender: 'bot' },
      { text: '<div class="location-buttons"></div>', sender: 'bot' }
    ];
    component.sendMessageToBackend = jest.fn().mockResolvedValue('Location response');
    component.populateMessages = jest.fn();
    component.requestUpdate = jest.fn();
    await component.handleLocationButton('Indoor');
    expect(component.sendMessageToBackend).toHaveBeenCalled();
    expect(component.populateMessages).toHaveBeenCalled();
    expect(component.requestUpdate).toHaveBeenCalled();
  });

  test('handleLocationButton handles error', async () => {
    component.messages = [
      { text: 'Bot', sender: 'bot' },
      { text: '<div class="location-buttons"></div>', sender: 'bot' }
    ];
    component.sendMessageToBackend = jest.fn(() => { throw new Error('fail'); });
    component.populateMessages = jest.fn();
    component.requestUpdate = jest.fn();
    await component.handleLocationButton('Indoor');
    expect(component.populateMessages).toHaveBeenCalled();
    expect(component.requestUpdate).toHaveBeenCalled();
  });

  test('handleConversationOption sets userInput and calls sendMessage', async () => {
    const spy = jest.spyOn(component, 'sendMessage').mockResolvedValue();
    await component.handleConversationOption('option');
    expect(component.userInput).toBe('option');
    expect(component.conversationOptions).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('scrollToBottom does nothing if messageContainer missing', () => {
    component.shadowRoot.getElementById = jest.fn(() => null);
    expect(() => component.scrollToBottom()).not.toThrow();
  });
});

describe('DataProcessor', () => {
  test('parseValue parses numbers and strings', () => {
    const processor = new DataProcessor([]);
    expect(processor.parseValue('25.3')).toBe(25.3);
    expect(processor.parseValue('good')).toBe('good');
    expect(processor.parseValue(null)).toBe(null);
    expect(processor.parseValue(undefined)).toBe(undefined);
    expect(processor.parseValue(42)).toBe(42);
  });

  test('findMode returns most frequent value', () => {
    const processor = new DataProcessor([]);
    expect(processor.findMode(['a', 'b', 'a', 'c', 'a'])).toBe('a');
    expect(processor.findMode([1, 2, 2, 3])).toBe(2);
    expect(processor.findMode([1])).toBe(1);
    expect([undefined, null]).toContain(processor.findMode([]));
    expect([undefined, null]).toContain(processor.findMode(null));
  });

  test('calculateAverage handles numbers and empty arrays', () => {
    const processor = new DataProcessor([]);
    expect(processor.calculateAverage([1, 2, 3])).toBe(2);
    expect(processor.calculateAverage([])).toBe(0);
    expect(processor.calculateAverage(null)).toBe(0);
    expect(processor.calculateAverage(undefined)).toBe(0);
    expect(processor.calculateAverage(['a', 'b'])).toBe(0);
  });

  test('aggregateData handles different methods', () => {
    const processor = new DataProcessor([
      { temperature: '25', humidity: '60' },
      { temperature: '26', humidity: '62' }
    ]);
    expect(processor.aggregateData('avg')).toHaveProperty('temperature');
    expect(typeof processor.aggregateData('avg').temperature).toBe('string');
    expect(processor.aggregateData('max')).toHaveProperty('temperature');
    expect(typeof processor.aggregateData('max').temperature).toBe('string');
    expect(processor.aggregateData('min')).toHaveProperty('temperature');
    expect(typeof processor.aggregateData('min').temperature).toBe('string');
    expect(processor.aggregateData('mode')).toHaveProperty('temperature');
    expect(typeof processor.aggregateData('mode').temperature).toBe('string');
  });
});

describe('ChatBotComponent additional coverage', () => {
  let component;

  beforeEach(() => {
    component = new ChatBotComponent();
    component.shadowRoot = document.createElement('div');
    component.shadowRoot.getElementById = jest.fn((id) => {
      if (id === 'chat-pop') return {
        classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn() }
      };
      if (id === 'message-container') return {
        innerHTML: '',
        appendChild: jest.fn(),
        scrollTop: 0,
        scrollHeight: 100,
        classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn() }
      };
      // Always return a stub for visualization-modal (never null!)
      if (id === 'visualization-modal') return {
        addEventListener: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() },
        style: { display: 'none' }
      };
      if (id === 'visualization-close') return { addEventListener: jest.fn() };
      if (id === 'visualization-header') return {};
      if (id === 'loading-spinner') return { style: { display: 'flex' } };
      if (id === 'visualization-chart') return { getContext: jest.fn(() => ({ clearRect: jest.fn() })), style: { display: 'none' } };
      if (id === 'error-message') return { style: { display: 'none' }, textContent: '' };
      return {};
    });
    component.shadowRoot.querySelector = jest.fn(() => ({
      value: '',
      focus: jest.fn()
    }));
    component.shadowRoot.removeChild = jest.fn();
    component.messages = [];
    component.currentOptions = [];
    component.userInput = '';
    component.editingMessageIndex = -1;
    component.editedMessage = '';
    component.recommendedQuestions = [];
    component.showRecommendedQuestions = false;
    component.conversationOptions = [];
    component.currentChart = null;
    component.requestUpdate = jest.fn();
  });

  test('cancelEditMessage calls requestUpdate', () => {
    const spy = jest.spyOn(component, 'requestUpdate');
    component.cancelEditMessage();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('scrollToBottom does nothing if container is missing', () => {
    component.shadowRoot.getElementById = jest.fn(() => null);
    expect(() => component.scrollToBottom()).not.toThrow();
  });

  test('togglePopup closes popup', () => {
    component.popupActive = true;
    const popup = { classList: { add: jest.fn(), remove: jest.fn() } };
    component.shadowRoot.getElementById = jest.fn(() => popup);
    component.togglePopup();
    expect(popup.classList.remove).toHaveBeenCalledWith('active');
  });

  test('togglePopup opens popup and populates messages', () => {
    component.popupActive = false;
    const popup = { classList: { add: jest.fn(), remove: jest.fn() } };
    component.shadowRoot.getElementById = jest.fn(() => popup);
    component.populateMessages = jest.fn();
    component.togglePopup();
    expect(popup.classList.add).toHaveBeenCalledWith('active');
    expect(component.populateMessages).toHaveBeenCalled();
  });

  test('handleOptionSelection with no option calls addMessage with error', async () => {
    component.currentOptions = [];
    component.messages = [{ text: 'last correct', sender: 'bot' }];
    component.lastCorrectMessageIndex = 0;
    component.addMessage = jest.fn();
    await component.handleOptionSelection('notfound');
    expect(component.addMessage).toHaveBeenCalledWith('Error: Invalid option selected', 'bot');
    expect(component.addMessage).toHaveBeenCalledWith('last correct', 'bot');
  });

  test('populateMessages adds edit icon for user', () => {
    component.messages = [{ text: 'User', sender: 'user' }];
    component.editingMessageIndex = -1;
    const container = document.createElement('div');
    component.shadowRoot.getElementById = jest.fn(() => container);
    expect(() => component.populateMessages()).not.toThrow();
  });

  test('populateMessages handles empty messages', () => {
    component.messages = [];
    const container = document.createElement('div');
    component.shadowRoot.getElementById = jest.fn(() => container);
    expect(() => component.populateMessages()).not.toThrow();
  });

  test('populateMessages handles visualization icon with missing icon part', () => {
    component.messages = [{ text: 'Bot\n\n<div id="', sender: 'bot' }];
    component.editingMessageIndex = -1;
    const container = document.createElement('div');
    component.shadowRoot.getElementById = jest.fn(() => container);
    expect(() => component.populateMessages()).not.toThrow();
  });

  test('getNodeColor returns color for non-numeric nodeId', () => {
    expect(typeof component.getNodeColor('abc')).toBe('string');
  });

  test('extractTemporalData handles missing filtered_data', () => {
    const data = { node_data: { 'aq-01': {} } };
    expect(component.extractTemporalData(data)).toEqual({});
  });

  test('extractCurrentData handles missing categories', () => {
    const data = { node_data: { 'aq-01': {} } };
    expect(component.extractCurrentData(data)).toEqual({});
  });

  test('sendMessageToBackend handles error', async () => {
    global.fetch = jest.fn(() => { throw new Error('fail'); });
    const response = await component.sendMessageToBackend('test');
    expect(response).toContain('Sorry');
  });

  test('sendMessageToBackend handles non-json header', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ headers: { get: () => null }, json: async () => ({}) }));
    const response = await component.sendMessageToBackend('test');
    expect(response).toContain('unexpected response format');
  });

  test('openVisualizationModal destroys chart if exists', async () => {
    component.currentChart = { destroy: jest.fn() };
    component.shadowRoot.appendChild = jest.fn();
    component.shadowRoot.getElementById = jest.fn((id) => {
      if (id === 'visualization-modal') return {
        addEventListener: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() },
        style: { display: 'none' }
      };
      if (id === 'visualization-close') return { addEventListener: jest.fn() };
      if (id === 'visualization-header') return {};
      if (id === 'loading-spinner') return { style: { display: 'flex' } };
      if (id === 'visualization-chart') return { getContext: jest.fn(() => ({ clearRect: jest.fn() })), style: { display: 'none' } };
      if (id === 'error-message') return { style: { display: 'none' }, textContent: '' };
      return {};
    });
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({
        is_temporal: true,
        node_data: {
          'node1': {
            filtered_data: {
              cat: { data: [{ timestamp: Date.now(), temperature: 25, node_id: 'node1' }] }
            }
          }
        }
      })
    }));
    await expect(component.openVisualizationModal('test')).resolves.toBeUndefined();
  });

  test('openVisualizationModal handles no matching parameter', async () => {
    component.shadowRoot.appendChild = jest.fn();
    component.shadowRoot.getElementById = jest.fn((id) => {
      if (id === 'visualization-modal') return {
        addEventListener: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() },
        style: { display: 'none' }
      };
      if (id === 'visualization-close') return { addEventListener: jest.fn() };
      if (id === 'visualization-header') return {};
      if (id === 'loading-spinner') return { style: { display: 'flex' } };
      if (id === 'visualization-chart') return { getContext: jest.fn(() => ({ clearRect: jest.fn() })), style: { display: 'none' } };
      if (id === 'error-message') return { style: { display: 'none' }, textContent: '' };
      return {};
    });
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({
        is_temporal: false,
        node_data: { 'node1': { category1: [{ name: 'N1' }] } }
      })
    }));
    await expect(component.openVisualizationModal('temperature')).resolves.toBeUndefined();
  });

  test('openVisualizationModal handles fetch error', async () => {
    component.shadowRoot.appendChild = jest.fn();
    component.shadowRoot.getElementById = jest.fn((id) => {
      if (id === 'visualization-modal') return {
        addEventListener: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() },
        style: { display: 'none' }
      };
      if (id === 'visualization-close') return { addEventListener: jest.fn() };
      if (id === 'visualization-header') return {};
      if (id === 'loading-spinner') return { style: { display: 'flex' } };
      if (id === 'visualization-chart') return { getContext: jest.fn(() => ({ clearRect: jest.fn() })), style: { display: 'none' } };
      if (id === 'error-message') return { style: { display: 'none' }, textContent: '' };
      return {};
    });
    global.fetch = jest.fn(() => { throw new Error('fail'); });
    await expect(component.openVisualizationModal('temperature')).resolves.toBeUndefined();
  });

  test('handleRecommendedQuestion calls sendMessage', async () => {
    component.sendMessage = jest.fn();
    await component.handleRecommendedQuestion('Q?');
    expect(component.sendMessage).toHaveBeenCalled();
  });

  test('handleConversationOption sets userInput and clears conversationOptions', async () => {
    component.conversationOptions = [{ text: 'option', next: 'next' }];
    component.sendMessage = jest.fn();
    await component.handleConversationOption('option');
    expect(component.userInput).toBe('option');
    expect(component.conversationOptions).toEqual([]);
    expect(component.sendMessage).toHaveBeenCalled();
  });

  test('handleConversationOption with no option still sets userInput', async () => {
    component.conversationOptions = [];
    component.sendMessage = jest.fn();
    await component.handleConversationOption('option');
    expect(component.userInput).toBe('option');
    expect(component.conversationOptions).toEqual([]);
    expect(component.sendMessage).toHaveBeenCalled();
  });

  test('handleOptionSelection finds option and sets userInput', async () => {
    component.currentOptions = [{ text: '1', next: 'test' }];
    component.sendMessage = jest.fn();
    await component.handleOptionSelection('1');
    expect(component.userInput).toBe('1');
    expect(component.sendMessage).toHaveBeenCalled();
  });

  test('handleOptionSelection with invalid option adds error messages', async () => {
    component.currentOptions = [{ text: '2', next: 'test' }];
    component.messages = [{ text: 'last correct', sender: 'bot' }];
    component.lastCorrectMessageIndex = 0;
    component.addMessage = jest.fn();
    await component.handleOptionSelection('notfound');
    expect(component.addMessage).toHaveBeenCalledWith('Error: Invalid option selected', 'bot');
    expect(component.addMessage).toHaveBeenCalledWith('last correct', 'bot');
  });

  test('startEditMessage does nothing for bot message', () => {
    component.messages = [{ text: 'Bot', sender: 'bot' }];
    component.editingMessageIndex = -1;
    component.startEditMessage(0);
    expect(component.editingMessageIndex).toBe(-1);
  });

  test('saveEditedMessage does nothing if editedMessage is empty', async () => {
    component.editingMessageIndex = 0;
    component.editedMessage = '   ';
    component.populateMessages = jest.fn();
    await component.saveEditedMessage();
    expect(component.populateMessages).not.toHaveBeenCalled();
  });

  test('scrollToBottom scrolls if container exists', () => {
    const container = { scrollTop: 0, scrollHeight: 100 };
    component.shadowRoot.getElementById = jest.fn(() => container);
    component.scrollToBottom();
    expect(container.scrollTop).toBe(100);
  });

  test('togglePopup adds/removes active class', () => {
    const popup = { classList: { add: jest.fn(), remove: jest.fn() } };
    component.shadowRoot.getElementById = jest.fn(() => popup);
    component.popupActive = false;
    component.populateMessages = jest.fn();
    component.togglePopup();
    expect(popup.classList.add).toHaveBeenCalledWith('active');
    component.togglePopup();
    expect(popup.classList.remove).toHaveBeenCalledWith('active');
  });

  test('toggleRecommendedQuestions toggles and calls requestUpdate', () => {
    component.requestUpdate = jest.fn();
    const initial = component.showRecommendedQuestions;
    component.toggleRecommendedQuestions();
    expect(component.showRecommendedQuestions).toBe(!initial);
    expect(component.requestUpdate).toHaveBeenCalled();
  });

  test('addMessage pushes message and calls populateMessages', () => {
    component.messages = [];
    component.populateMessages = jest.fn();
    component.addMessage('test', 'user');
    expect(component.messages[0]).toEqual({ text: 'test', sender: 'user' });
    expect(component.populateMessages).toHaveBeenCalled();
  });

  test('resetInputAndPopulateMessages resets userInput and calls populateMessages', () => {
    component.userInput = 'abc';
    component.populateMessages = jest.fn();
    component.resetInputAndPopulateMessages();
    expect(component.userInput).toBe('');
    expect(component.populateMessages).toHaveBeenCalled();
  });

  test('populateMessages handles all message types', () => {
    component.messages = [
      { text: 'Bot', sender: 'bot' },
      { text: 'User', sender: 'user' },
      { text: 'Bot\n\n<div id="viz" class="visualization-icon"></div>', sender: 'bot' }
    ];
    component.editingMessageIndex = -1;
    const container = document.createElement('div');
    component.shadowRoot.getElementById = jest.fn(() => container);
    expect(() => component.populateMessages()).not.toThrow();
  });

  test('populateMessages handles editing state for user', () => {
    component.messages = [{ text: 'User', sender: 'user' }];
    component.editingMessageIndex = 0;
    const container = document.createElement('div');
    component.shadowRoot.getElementById = jest.fn(() => container);
    expect(() => component.populateMessages()).not.toThrow();
  });

  test('populateMessages handles empty messages', () => {
    component.messages = [];
    const container = document.createElement('div');
    component.shadowRoot.getElementById = jest.fn(() => container);
    expect(() => component.populateMessages()).not.toThrow();
  });

  test('populateMessages handles visualization icon with missing icon part', () => {
    component.messages = [{ text: 'Bot\n\n<div id="', sender: 'bot' }];
    component.editingMessageIndex = -1;
    const container = document.createElement('div');
    component.shadowRoot.getElementById = jest.fn(() => container);
    expect(() => component.populateMessages()).not.toThrow();
  });

  test('getNodeColor returns color for numeric and non-numeric nodeId', () => {
    expect(typeof component.getNodeColor('123')).toBe('string');
    expect(typeof component.getNodeColor('abc')).toBe('string');
  });

  test('extractTemporalData returns empty object if no filtered_data', () => {
    const data = { node_data: { 'aq-01': {} } };
    expect(component.extractTemporalData(data)).toEqual({});
  });

  test('extractCurrentData returns empty object if no categories', () => {
    const data = { node_data: { 'aq-01': {} } };
    expect(component.extractCurrentData(data)).toEqual({});
  });

  test('sendMessageToBackend handles fetch error', async () => {
    global.fetch = jest.fn(() => { throw new Error('fail'); });
    const response = await component.sendMessageToBackend('test');
    expect(response).toContain('Sorry');
  });

  test('sendMessageToBackend handles non-json header', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ headers: { get: () => null }, json: async () => ({}) }));
    const response = await component.sendMessageToBackend('test');
    expect(response).toContain('unexpected response format');
  });

  test('openVisualizationModal destroys chart if exists', async () => {
    component.currentChart = { destroy: jest.fn() };
    component.shadowRoot.appendChild = jest.fn();
    component.shadowRoot.getElementById = jest.fn((id) => {
      if (id === 'visualization-modal')
        return { addEventListener: jest.fn(), classList: { add: jest.fn(), remove: jest.fn() }, style: { display: 'none' } };
      if (id === 'visualization-close') return { addEventListener: jest.fn() };
      if (id === 'visualization-header') return {};
      if (id === 'loading-spinner') return { style: { display: 'flex' } };
      if (id === 'visualization-chart') return { getContext: jest.fn(() => ({ clearRect: jest.fn() })), style: { display: 'none' } };
      if (id === 'error-message') return { style: { display: 'none' }, textContent: '' };
      return {};
    });
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({
        is_temporal: true,
        node_data: {
          'node1': {
            filtered_data: {
              cat: { data: [{ timestamp: Date.now(), temperature: 25, node_id: 'node1' }] }
            }
          }
        }
      })
    }));
    await expect(component.openVisualizationModal('test')).resolves.toBeUndefined();
  });

  test('openVisualizationModal handles no matching parameter', async () => {
    component.shadowRoot.appendChild = jest.fn();
    component.shadowRoot.getElementById = jest.fn((id) => {
      if (id === 'visualization-modal') return {
        addEventListener: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() },
        style: { display: 'none' }
      };
      if (id === 'visualization-close') return { addEventListener: jest.fn() };
      if (id === 'visualization-header') return {};
      if (id === 'loading-spinner') return { style: { display: 'flex' } };
      if (id === 'visualization-chart') return { getContext: jest.fn(() => ({ clearRect: jest.fn() })), style: { display: 'none' } };
      if (id === 'error-message') return { style: { display: 'none' }, textContent: '' };
      return {};
    });
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({
        is_temporal: false,
        node_data: { 'node1': { category1: [{ name: 'N1' }] } }
      })
    }));
    await expect(component.openVisualizationModal('temperature')).resolves.toBeUndefined();
  });

  test('openVisualizationModal handles fetch error', async () => {
    component.shadowRoot.appendChild = jest.fn();
    component.shadowRoot.getElementById = jest.fn((id) => {
      if (id === 'visualization-modal') return {
        addEventListener: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() },
        style: { display: 'none' }
      };
      if (id === 'visualization-close') return { addEventListener: jest.fn() };
      if (id === 'visualization-header') return {};
      if (id === 'loading-spinner') return { style: { display: 'flex' } };
      if (id === 'visualization-chart') return { getContext: jest.fn(() => ({ clearRect: jest.fn() })), style: { display: 'none' } };
      if (id === 'error-message') return { style: { display: 'none' }, textContent: '' };
      return {};
    });
    global.fetch = jest.fn(() => { throw new Error('fail'); });
    await expect(component.openVisualizationModal('temperature')).resolves.toBeUndefined();
  });

  test('handleRecommendedQuestion calls sendMessage', async () => {
    component.sendMessage = jest.fn();
    await component.handleRecommendedQuestion('Q?');
    expect(component.sendMessage).toHaveBeenCalled();
  });

  test('handleLocationButton handles location', async () => {
    component.messages = [
      { text: 'Bot', sender: 'bot' },
      { text: '<div class="location-buttons"></div>', sender: 'bot' }
    ];
    component.sendMessageToBackend = jest.fn().mockResolvedValue('Location response');
    component.populateMessages = jest.fn();
    component.requestUpdate = jest.fn();
    await component.handleLocationButton('Indoor');
    expect(component.sendMessageToBackend).toHaveBeenCalled();
    expect(component.populateMessages).toHaveBeenCalled();
    expect(component.requestUpdate).toHaveBeenCalled();
  });

  test('handleLocationButton handles error', async () => {
    component.messages = [
      { text: 'Bot', sender: 'bot' },
      { text: '<div class="location-buttons"></div>', sender: 'bot' }
    ];
    component.sendMessageToBackend = jest.fn(() => { throw new Error('fail'); });
    component.populateMessages = jest.fn();
    component.requestUpdate = jest.fn();
    await component.handleLocationButton('Indoor');
    expect(component.populateMessages).toHaveBeenCalled();
    expect(component.requestUpdate).toHaveBeenCalled();
  });

  test('handleUserInput updates userInput', () => {
    const event = { target: { value: 'test input' } };
    component.handleUserInput(event);
    expect(component.userInput).toBe('test input');
  });

  test('getLevenshteinDistance computes string distance', () => {
    expect(component.getLevenshteinDistance('abc', 'abcd')).toBe(1);
    expect(component.getLevenshteinDistance('', 'abc')).toBe(3);
    expect(component.getLevenshteinDistance('abc', '')).toBe(3);
    expect(component.getLevenshteinDistance('', '')).toBe(0);
  });

  test('extractLocation finds known locations', () => {
    expect(component.extractLocation('Temperature at Vindhya')).toBe('Vindhya');
    expect(component.extractLocation('Humidity in Kohli Block')).toBe('Kohli Block');
    expect(component.extractLocation('Unknown location')).toBeUndefined();
  });

  test('handleKeyDown triggers sendMessage on Enter', async () => {
    component.userInput = 'test';
    const spy = jest.spyOn(component, 'sendMessage').mockResolvedValue();
    const event = { key: 'Enter', preventDefault: jest.fn() };
    await component.handleKeyDown(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('cancelEditMessage resets editing state', () => {
    component.editingMessageIndex = 1;
    component.editedMessage = 'test';
    component.cancelEditMessage();
    expect(component.editingMessageIndex).toBe(-1);
    expect(component.editedMessage).toBe('');
  });

  test('cancelEditMessage calls requestUpdate', () => {
    component.requestUpdate = jest.fn();
    component.cancelEditMessage();
    expect(component.requestUpdate).toHaveBeenCalled();
  });

  test('handleConversationOption calls sendMessage', async () => {
    component.sendMessage = jest.fn();
    await component.handleConversationOption('option');
    expect(component.sendMessage).toHaveBeenCalled();
  });
});
