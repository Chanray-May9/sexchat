// ===== api.js - DeepSeek API 调用（支持思考流式）=====

const API = {
  BASE_URL: 'https://api.deepseek.com/chat/completions',
  API_KEY: '***',

  /**
   * 流式聊天（支持思考过程）
   * @param {Array} messages - [{role, content}]
   * @param {Object} callbacks - { onReasoning(text), onChunk(text), onDone(), onError(err) }
   * @returns {AbortController}
   */
  async streamChat(messages, callbacks) {
    const controller = new AbortController();
    const settings = Storage.getSettings();

    const body = {
      model: settings.model || 'deepseek-v4-pro',
      messages: messages,
      stream: true,
      temperature: settings.temperature,
      max_tokens: 8192,
      thinking: { type: 'enabled' }
    };

    // 只有 V4 Pro 支持 reasoning_effort
    if (settings.model !== 'deepseek-v4-flash') {
      body.reasoning_effort = settings.reasoningEffort || 'medium';
    }

    try {
      const response = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`
        },
        body: JSON.stringify(body),
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
            const delta = json.choices?.[0]?.delta;
            if (!delta) continue;

            // 思考过程（始终对用户可见）
            if (delta.reasoning_content) {
              callbacks.onReasoning(delta.reasoning_content);
            }

            // 正式输出
            if (delta.content) {
              callbacks.onChunk(delta.content);
            }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        callbacks.onDone();
      } else {
        callbacks.onError(err.message || '未知错误');
      }
    }

    return controller;
  }
};
