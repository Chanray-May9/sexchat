// ===== chat.js - 聊天逻辑 =====

const Chat = {
  currentCharId: null,
  abortController: null,
  isGenerating: false,

  // 初始化聊天
  init(charId) {
    this.currentCharId = charId;
    Storage.setActiveChar(charId);
    this.isGenerating = false;
  },

  // 获取当前聊天历史
  getHistory() {
    if (!this.currentCharId) return [];
    return Storage.getChat(this.currentCharId);
  },

  // 发送消息
  async sendMessage(content) {
    if (!this.currentCharId || this.isGenerating) return;

    const char = Characters.getById(this.currentCharId);
    if (!char) return;

    this.isGenerating = true;

    // 添加用户消息到历史
    const userMsg = { role: 'user', content, timestamp: Date.now() };
    Storage.addMessage(this.currentCharId, userMsg);
    UI.addMessage('user', content, userMsg.timestamp);

    // 构建 API 消息列表
    const systemPrompt = Characters.buildSystemPrompt(this.currentCharId);
    const history = this.getHistory();
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content }))
    ];

    // 创建 AI 消息占位符
    const assistantTimestamp = Date.now();
    const msgEl = UI.addMessage('assistant', '', assistantTimestamp, true);
    const bubbleEl = msgEl.querySelector('.msg-bubble');
    let fullContent = '';

    // 流式请求
    this.abortController = await API.streamChat(apiMessages, {
      onChunk: (text) => {
        fullContent += text;
        if (bubbleEl) {
          bubbleEl.textContent = fullContent;
          UI.scrollToBottom();
        }
      },
      onDone: () => {
        this.isGenerating = false;
        this.abortController = null;
        // 保存完整的 AI 回复到历史
        if (fullContent) {
          Storage.addMessage(this.currentCharId, {
            role: 'assistant',
            content: fullContent,
            timestamp: assistantTimestamp
          });
        }
        UI.onGenerationDone();
        UI.scrollToBottom();
      },
      onError: (err) => {
        this.isGenerating = false;
        this.abortController = null;
        if (bubbleEl) {
          bubbleEl.textContent = fullContent || `❌ 出错了：${err}`;
          bubbleEl.style.color = 'var(--accent)';
        }
        // Still save partial content
        if (fullContent) {
          Storage.addMessage(this.currentCharId, {
            role: 'assistant',
            content: fullContent,
            timestamp: assistantTimestamp
          });
        }
        UI.onGenerationDone();
        UI.showToast(`请求失败：${err}`, 'error');
      }
    });
  },

  // 停止生成
  stopGeneration() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      this.isGenerating = false;
      UI.onGenerationDone();
    }
  },

  // 清空当前聊天
  clearCurrentChat() {
    if (this.currentCharId) {
      Storage.clearChat(this.currentCharId);
      UI.clearMessages();
    }
  },

  // 导出当前聊天为文本
  exportCurrentChat() {
    if (!this.currentCharId) return '';
    const char = Characters.getById(this.currentCharId);
    const history = Storage.getChat(this.currentCharId);
    if (!history.length) return '';

    let text = `=== 性爱AI 聊天记录 ===\n`;
    text += `角色：${char.name}（${char.scene}）\n`;
    text += `时间：${new Date().toLocaleString()}\n`;
    text += `\n${'='.repeat(40)}\n\n`;

    for (const msg of history) {
      const label = msg.role === 'user' ? '你' : char.name;
      const time = new Date(msg.timestamp).toLocaleTimeString();
      text += `[${time}] ${label}：\n${msg.content}\n\n`;
    }

    return text;
  }
};
