// ===== api.js - DeepSeek API 调用 =====

const API = {
  // DeepSeek V4 Pro API 配置
  BASE_URL: 'https://api.deepseek.com/chat/completions',
  API_KEY: 'sk-d594b4ef2b9a447fa1c2bb4f9fe4fd86',
  MODEL: 'deepseek-v4-pro',

  /**
   * 流式聊天
   * @param {Array} messages - 消息数组 [{role, content}]
   * @param {Object} callbacks - { onChunk(text), onDone(), onError(err) }
   * @returns {AbortController} 用于取消请求
   */
  async streamChat(messages, callbacks) {
    const controller = new AbortController();
    const settings = Storage.getSettings();

    try {
      const response = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`
        },
        body: JSON.stringify({
          model: this.MODEL,
          messages: messages,
          stream: true,
          temperature: settings.temperature,
          max_tokens: 4096
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg;
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.error?.message || `HTTP ${response.status}`;
        } catch {
          errMsg = `HTTP ${response.status}: ${errText.slice(0, 200)}`;
        }
        throw new Error(errMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          callbacks.onDone();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            callbacks.onDone();
            return controller;
          }

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              callbacks.onChunk(content);
            }
          } catch (e) {
            // Skip malformed chunks
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        callbacks.onDone(); // treat abort as done
      } else {
        callbacks.onError(err.message || '未知错误');
      }
    }

    return controller;
  }
};
