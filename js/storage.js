// ===== storage.js - localStorage 封装 =====

const Storage = {
  KEYS: {
    CHARACTERS: 'sexchat_characters',
    CHATS: 'sexchat_chats',
    ACTIVE_CHAR: 'sexchat_activeChar',
    SETTINGS: 'sexchat_settings',
    USER: 'sexchat_user'
  },

  DEFAULT_SETTINGS: {
    model: 'deepseek-v4-pro',
    reasoningEffort: 'medium',
    temperature: 0.9,
    maxHistory: 50
  },

  DEFAULT_USER: {
    name: '郭权锐',
    age: 17,
    gender: '男',
    role: '主人',
    desc: '17岁男，身高178cm，有根包皮大鸡巴，喜欢穿白色衣服'
  },

  // --- Characters ---
  getCharacters() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.CHARACTERS)) || [];
    } catch { return []; }
  },

  saveCharacters(chars) {
    localStorage.setItem(this.KEYS.CHARACTERS, JSON.stringify(chars));
  },

  addCharacter(char) {
    const chars = this.getCharacters();
    char.id = char.id || 'char_' + Date.now();
    const existingIdx = chars.findIndex(c => c.id === char.id);
    if (existingIdx !== -1) {
      chars[existingIdx] = { ...chars[existingIdx], ...char, updatedAt: Date.now() };
    } else {
      char.createdAt = Date.now();
      chars.push(char);
    }
    this.saveCharacters(chars);
    return char;
  },

  updateCharacter(id, updates) {
    const chars = this.getCharacters();
    const idx = chars.findIndex(c => c.id === id);
    if (idx === -1) return null;
    chars[idx] = { ...chars[idx], ...updates, updatedAt: Date.now() };
    this.saveCharacters(chars);
    return chars[idx];
  },

  deleteCharacter(id) {
    const chars = this.getCharacters().filter(c => c.id !== id);
    this.saveCharacters(chars);
    // Also delete associated chats
    const chats = this.getAllChats();
    delete chats[id];
    localStorage.setItem(this.KEYS.CHATS, JSON.stringify(chats));
  },

  // --- Chats ---
  getAllChats() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.CHATS)) || {};
    } catch { return {}; }
  },

  getChat(charId) {
    const chats = this.getAllChats();
    return chats[charId] || [];
  },

  saveChat(charId, messages) {
    const chats = this.getAllChats();
    // Trim to maxHistory
    const maxHistory = this.getSettings().maxHistory;
    if (messages.length > maxHistory) {
      messages = messages.slice(messages.length - maxHistory);
    }
    chats[charId] = messages;
    localStorage.setItem(this.KEYS.CHATS, JSON.stringify(chats));
  },

  addMessage(charId, message) {
    const messages = this.getChat(charId);
    messages.push(message);
    this.saveChat(charId, messages);
    return messages;
  },

  clearChat(charId) {
    const chats = this.getAllChats();
    delete chats[charId];
    localStorage.setItem(this.KEYS.CHATS, JSON.stringify(chats));
  },

  // --- Active Character ---
  getActiveChar() {
    return localStorage.getItem(this.KEYS.ACTIVE_CHAR);
  },

  setActiveChar(charId) {
    localStorage.setItem(this.KEYS.ACTIVE_CHAR, charId);
  },

  // --- Settings ---
  getSettings() {
    try {
      return { ...this.DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(this.KEYS.SETTINGS)) };
    } catch { return { ...this.DEFAULT_SETTINGS }; }
  },

  saveSettings(settings) {
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
  },

  // --- User ---
  getUser() {
    try {
      return { ...this.DEFAULT_USER, ...JSON.parse(localStorage.getItem(this.KEYS.USER)) };
    } catch { return { ...this.DEFAULT_USER }; }
  },

  saveUser(user) {
    localStorage.setItem(this.KEYS.USER, JSON.stringify(user));
  }
};
