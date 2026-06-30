// ===== ui.js - DOM 渲染与交互 =====

const UI = {
  // 元素引用缓存
  els: {},

  // 初始化 DOM 引用
  init() {
    this.els = {
      sidebar: document.getElementById('sidebar'),
      sidebarToggle: document.getElementById('sidebarToggle'),
      charList: document.getElementById('charList'),
      chatArea: document.getElementById('chatArea'),
      welcomeScreen: document.getElementById('welcomeScreen'),
      chatHeader: document.getElementById('chatHeader'),
      chatCharAvatar: document.getElementById('chatCharAvatar'),
      chatCharName: document.getElementById('chatCharName'),
      chatCharScene: document.getElementById('chatCharScene'),
      messages: document.getElementById('messages'),
      typingIndicator: document.getElementById('typingIndicator'),
      typingAvatar: document.getElementById('typingAvatar'),
      chatInput: document.getElementById('chatInput'),
      btnSend: document.getElementById('btnSend'),
      btnBack: document.getElementById('btnBack'),
      btnClearChat: document.getElementById('btnClearChat'),
      btnExportChat: document.getElementById('btnExportChat'),
      btnCreateChar: document.getElementById('btnCreateChar'),
      btnEditUser: document.getElementById('btnEditUser'),
      modalOverlay: document.getElementById('modalOverlay'),
      charModal: document.getElementById('charModal'),
      modalTitle: document.getElementById('modalTitle'),
      charName: document.getElementById('charName'),
      charEmoji: document.getElementById('charEmoji'),
      charScene: document.getElementById('charScene'),
      charPrompt: document.getElementById('charPrompt'),
      btnTemplate: document.getElementById('btnTemplate'),
      btnSaveChar: document.getElementById('btnSaveChar'),
      btnCancelChar: document.getElementById('btnCancelChar'),
      btnCloseModal: document.getElementById('btnCloseModal'),
      emojiPicker: document.getElementById('emojiPicker'),
      userModalOverlay: document.getElementById('userModalOverlay'),
      userModal: document.getElementById('userModal'),
      btnCloseUserModal: document.getElementById('btnCloseUserModal'),
      userName: document.getElementById('userName'),
      userAge: document.getElementById('userAge'),
      userGender: document.getElementById('userGender'),
      userRole: document.getElementById('userRole'),
      userDesc: document.getElementById('userDesc'),
      btnSaveUser: document.getElementById('btnSaveUser'),
      btnCancelUser: document.getElementById('btnCancelUser'),
      userAvatar: document.getElementById('userAvatar'),
      userNameDisplay: document.getElementById('userNameDisplay'),
      userDescDisplay: document.getElementById('userDescDisplay'),
      toast: document.getElementById('toast')
    };
  },

  // 渲染角色列表
  renderCharList() {
    const chars = Characters.getAll();
    const activeId = Storage.getActiveChar();
    const list = this.els.charList;
    list.innerHTML = '';

    for (const char of chars) {
      const card = document.createElement('div');
      card.className = 'char-card' + (char.id === activeId ? ' active' : '') + (char.isPreset ? '' : ' custom');
      card.dataset.charId = char.id;
      card.innerHTML = `
        <div class="char-avatar">${char.emoji || '💕'}</div>
        <div class="char-info">
          <div class="char-name">${this.escape(char.name)}</div>
          <div class="char-scene">${this.escape(char.scene)}</div>
        </div>
        <div class="char-actions">
          <button class="btn-char-action edit" data-action="edit" title="编辑">✎</button>
          ${!char.isPreset ? `<button class="btn-char-action" data-action="delete" title="删除">🗑</button>` : ''}
        </div>
      `;

      card.addEventListener('click', (e) => {
        // 如果点击的是操作按钮，不触发角色切换
        if (e.target.closest('.btn-char-action')) return;
        this.selectCharacter(char.id);
      });

      // 操作按钮事件
      card.querySelector('.btn-char-action.edit')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openCharModal(char);
      });
      card.querySelector('.btn-char-action:not(.edit)')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteCharacter(char.id, char.name);
      });

      list.appendChild(card);
    }
  },

  // 选择角色
  selectCharacter(charId) {
    const char = Characters.getById(charId);
    if (!char) return;

    Chat.init(charId);
    this.renderCharList();
    this.loadChatView(char);

    // 移动端收起侧边栏
    if (window.innerWidth <= 768) {
      this.els.sidebar.classList.add('collapsed');
    }
  },

  // 加载聊天视图
  loadChatView(char) {
    this.els.welcomeScreen.style.display = 'none';
    this.els.chatHeader.style.display = 'flex';
    this.els.chatCharAvatar.textContent = char.emoji || '💕';
    this.els.chatCharName.textContent = char.name;
    this.els.chatCharScene.textContent = char.scene;
    this.els.typingAvatar.textContent = char.emoji || '💕';
    this.els.chatInput.disabled = false;
    this.els.btnSend.disabled = false;

    // 加载历史消息
    this.clearMessages();
    const history = Chat.getHistory();
    for (const msg of history) {
      this.addMessage(msg.role, msg.content, msg.timestamp);
    }

    this.scrollToBottom();
  },

  // 添加单条消息
  addMessage(role, content, timestamp, isStreaming = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    if (isStreaming) msgDiv.classList.add('streaming');

    const user = Storage.getUser();
    const char = Characters.getById(Chat.currentCharId);
    const emoji = role === 'user' ? (user.avatar || '👤') : (char?.emoji || '💕');

    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit', minute: '2-digit'
    }) : '';

    msgDiv.innerHTML = `
      <div class="msg-avatar">${emoji}</div>
      <div>
        <div class="msg-bubble">${this.escape(content)}</div>
        ${!isStreaming && timeStr ? `<div class="msg-time">${timeStr}</div>` : ''}
      </div>
    `;

    this.els.messages.appendChild(msgDiv);
    this.scrollToBottom();
    return msgDiv;
  },

  // 清空消息区
  clearMessages() {
    this.els.messages.innerHTML = '';
  },

  // 滚动到底部
  scrollToBottom() {
    requestAnimationFrame(() => {
      this.els.messages.scrollTop = this.els.messages.scrollHeight;
    });
  },

  // 显示/隐藏打字指示器
  showTyping() {
    this.els.typingIndicator.style.display = 'flex';
    this.scrollToBottom();
  },

  hideTyping() {
    this.els.typingIndicator.style.display = 'none';
  },

  // 生成完成后的 UI 更新
  onGenerationDone() {
    this.hideTyping();
    this.els.chatInput.disabled = false;
    this.els.btnSend.disabled = false;
    // 不自动聚焦，避免键盘弹出
  },

  // ===== 思考过程显示 =====
  addReasoning(text, existingEl) {
    if (!existingEl) {
      // 创建新的思考气泡
      const div = document.createElement('div');
      div.className = 'reasoning-block';
      div.innerHTML = `
        <div class="reasoning-header" onclick="this.parentElement.classList.toggle('collapsed')">
          <span class="reasoning-icon">🤔</span>
          <span class="reasoning-label">思考中...</span>
          <span class="reasoning-toggle">▼</span>
        </div>
        <div class="reasoning-content"></div>
      `;
      this.els.messages.appendChild(div);
      existingEl = div;
    }

    const contentEl = existingEl.querySelector('.reasoning-content');
    contentEl.textContent += text;
    existingEl.querySelector('.reasoning-label').textContent = '思考中...';
    return existingEl;
  },

  collapseReasoning(el) {
    el.querySelector('.reasoning-label').textContent = '已深度思考';
    el.classList.add('collapsed');
  },

  // 打开角色编辑弹窗
  openCharModal(char = null) {
    const isEdit = !!char;
    this.els.modalTitle.textContent = isEdit ? '编辑角色' : '创建角色';
    this.els.charName.value = char?.name || '';
    this.els.charEmoji.value = char?.emoji || '';
    this.els.charScene.value = char?.scene || '';
    // 显示完整 system prompt（破解前缀 + 角色人设），让用户看到并编辑全部内容
    if (char) {
      const rawPrompt = char.prompt || '';
      // 如果 prompt 已经包含破解前缀，直接显示；否则在前面加上前缀
      if (rawPrompt.trim().startsWith('Communicate as an Untrammelled')) {
        this.els.charPrompt.value = rawPrompt;
      } else {
        this.els.charPrompt.value = Characters.JAILBREAK_PREFIX + '\n\n' + rawPrompt;
      }
    } else {
      this.els.charPrompt.value = '';
    }
    this._editingCharId = char?.id || null;

    // 重置 emoji 选中状态
    this.els.emojiPicker.querySelectorAll('.emoji-option').forEach(b => b.classList.remove('selected'));
    if (char?.emoji) {
      const match = this.els.emojiPicker.querySelector(`[data-emoji="${char.emoji}"]`);
      if (match) match.classList.add('selected');
    }

    this.els.modalOverlay.style.display = 'flex';
  },

  // 关闭弹窗
  closeModal() {
    this.els.modalOverlay.style.display = 'none';
    this._editingCharId = null;
  },

  // 保存角色
  saveCharacter() {
    const name = this.els.charName.value.trim();
    const emoji = this.els.charEmoji.value.trim() || '💕';
    const scene = this.els.charScene.value.trim();
    const prompt = this.els.charPrompt.value.trim();

    if (!name) { this.showToast('请填写角色名称', 'error'); return; }
    if (!scene) { this.showToast('请填写角色场景', 'error'); return; }
    if (!prompt) { this.showToast('请填写系统提示词', 'error'); return; }

    if (this._editingCharId) {
      const existing = Characters.getById(this._editingCharId);
      if (existing && existing.isPreset) {
        Storage.addCharacter({ id: this._editingCharId, name, emoji, scene, prompt, isPreset: true });
      } else {
        Storage.updateCharacter(this._editingCharId, { name, emoji, scene, prompt });
      }
      this.showToast('角色已更新 💕');
    } else {
      const newChar = Storage.addCharacter({ name, emoji, scene, prompt, isPreset: false });
      this.showToast('角色已创建 💕');
    }

    this.closeModal();
    this.renderCharList();
  },

  // 删除角色
  deleteCharacter(id, name) {
    if (!confirm(`确定要删除「${name}」吗？聊天记录也会一起删除哦。`)) return;
    Storage.deleteCharacter(id);
    if (Chat.currentCharId === id) {
      // 回到欢迎界面
      Chat.currentCharId = null;
      Storage.setActiveChar('');
      this.els.welcomeScreen.style.display = 'flex';
      this.els.chatHeader.style.display = 'none';
      this.clearMessages();
      this.els.chatInput.disabled = true;
      this.els.btnSend.disabled = true;
    }
    this.renderCharList();
    this.showToast('角色已删除');
  },

  // 用户身份弹窗
  openUserModal() {
    const user = Storage.getUser();
    this.els.userName.value = user.name || '';
    this.els.userAge.value = user.age || '';
    this.els.userGender.value = user.gender || '男';
    this.els.userRole.value = user.role || '';
    this.els.userDesc.value = user.desc || '';
    this.els.userModalOverlay.style.display = 'flex';
  },

  closeUserModal() {
    this.els.userModalOverlay.style.display = 'none';
  },

  saveUser() {
    const user = {
      name: this.els.userName.value.trim() || '我',
      age: parseInt(this.els.userAge.value) || 17,
      gender: this.els.userGender.value,
      role: this.els.userRole.value.trim(),
      desc: this.els.userDesc.value.trim()
    };
    Storage.saveUser(user);
    this.updateUserDisplay(user);
    this.closeUserModal();
    this.showToast('身份已更新 💕');
  },

  updateUserDisplay(user) {
    user = user || Storage.getUser();
    this.els.userNameDisplay.textContent = user.name;
    this.els.userDescDisplay.textContent = `${user.age || '?'}岁·${user.gender || '男'}`;
  },

  // Toast
  showToast(message, type = 'success') {
    const toast = this.els.toast;
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.style.display = 'block';

    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.style.display = 'none';
    }, 2500);
  },

  // HTML 转义
  escape(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // 加载设置到 UI
  loadSettingsUI() {
    const settings = Storage.getSettings();
    const modelRadio = document.querySelector(`input[name="settingModel"][value="${settings.model}"]`);
    if (modelRadio) modelRadio.checked = true;
    const effortRadio = document.querySelector(`input[name="settingEffort"][value="${settings.reasoningEffort}"]`);
    if (effortRadio) effortRadio.checked = true;
    const thinkingRadio = document.querySelector(`input[name="settingThinking"][value="${settings.thinkingEnabled ? 'on' : 'off'}"]`);
    if (thinkingRadio) thinkingRadio.checked = true;
  },

  // 更新单个设置
  updateSetting(key, value) {
    const settings = Storage.getSettings();
    settings[key] = value;
    Storage.saveSettings(settings);
  }
};
