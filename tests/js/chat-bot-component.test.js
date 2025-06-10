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
      if (id === 'popup') return {
        classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn() }
      };
      if (id === 'message-container') return {
        innerHTML: '',
        appendChild: jest.fn(),
        scrollTop: 0,
        scrollHeight: 100,
        classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn() }
      };
      if (id === 'visualization-modal') return { classList: { add: jest.fn() }, addEventListener: jest.fn() };
      if (id === 'visualization-chart') return { getContext: jest.fn(() => ({ clearRect: jest.fn() })) };
      if (id === 'visualization-close') return { addEventListener: jest.fn() };
      if (id === 'loading-spinner') return { style: { display: 'flex' } };
      if (id === 'error-message') return { style: { display: 'none' }, textContent: '' };
      if (id && id.startsWith('visualizeIcon_')) return { parentNode: { replaceChild: jest.fn() }, cloneNode: jest.fn(() => ({ addEventListener: jest.fn() })) };
      if (id && id.startsWith('indoorButton_')) return { addEventListener: jest.fn() };
      if (id && id.startsWith('outdoorButton_')) return { addEventListener: jest.fn() };
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
