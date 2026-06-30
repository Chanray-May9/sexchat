// ===== app.js - 应用入口 & 事件绑定 =====

(function() {
  'use strict';

  // 初始化 UI 引用
  UI.init();

  // 初始化用户身份显示
  UI.updateUserDisplay();

  // 加载设置到 UI
  UI.loadSettingsUI();
  const settings = Storage.getSettings();
  // 根据设置初始化思考开关和深度选项的显示
  if (!settings.thinkingEnabled) {
    document.getElementById('effortRow').style.display = 'none';
  }
  if (settings.model === 'deepseek-v4-flash') {
    document.getElementById('effortRow').style.display = 'none';
  }

  // 渲染角色列表
  UI.renderCharList();

  // ⚠️ 不再自动恢复上次聊天 - 每次打开都是欢迎页，历史记录手动查看

  // ===== 事件绑定 =====

  // 发送消息
  function handleSend() {
    const content = UI.els.chatInput.value.trim();
    if (!content || Chat.isGenerating) return;

    UI.els.chatInput.value = '';
    UI.els.chatInput.style.height = 'auto';
    UI.showTyping();
    Chat.sendMessage(content);
  }

  // 发送按钮
  UI.els.btnSend.addEventListener('click', handleSend);

  // 输入框 Enter 发送
  UI.els.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // 输入框自动调整高度
  UI.els.chatInput.addEventListener('input', () => {
    UI.els.chatInput.style.height = 'auto';
    UI.els.chatInput.style.height = Math.min(UI.els.chatInput.scrollHeight, 120) + 'px';
  });

  // 返回按钮 (移动端)
  UI.els.btnBack.addEventListener('click', () => {
    UI.els.sidebar.classList.remove('collapsed');
  });

  // 侧边栏切换按钮
  UI.els.sidebarToggle.addEventListener('click', () => {
    UI.els.sidebar.classList.toggle('collapsed');
  });

  // 清空对话
  UI.els.btnClearChat.addEventListener('click', () => {
    if (!Chat.currentCharId) return;
    if (!confirm('确定要清空当前对话吗？此操作不可恢复。')) return;
    Chat.clearCurrentChat();
    UI.clearMessages();
    UI.showToast('对话已清空');
  });

  // 导出对话
  UI.els.btnExportChat.addEventListener('click', () => {
    const text = Chat.exportCurrentChat();
    if (!text) {
      UI.showToast('没有可导出的对话', 'error');
      return;
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sexchat_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    UI.showToast('对话已导出 💕');
  });

  // 历史记录按钮
  document.getElementById('btnHistory').addEventListener('click', () => {
    const overlay = document.getElementById('historyOverlay');
    const list = document.getElementById('historyList');
    const history = Storage.getHistory();

    if (history.length === 0) {
      list.innerHTML = '<div class="history-empty">暂无历史记录</div>';
    } else {
      list.innerHTML = history.map(h => `
        <div class="history-item" data-hist-id="${h.id}">
          <span class="hist-emoji">${h.charEmoji}</span>
          <div class="hist-info">
            <div class="hist-name">${UI.escape(h.charName)}</div>
            <div class="hist-preview">${UI.escape(h.preview)}</div>
          </div>
          <span class="hist-time">${new Date(h.createdAt).toLocaleDateString('zh-CN')}</span>
          <button class="btn-hist-delete" data-del-id="${h.id}">🗑</button>
        </div>
      `).join('');

      // 点击加载历史
      list.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.btn-hist-delete')) return;
          const histId = item.dataset.histId;
          const entry = history.find(h => h.id === histId);
          if (!entry) return;
          // 加载历史消息
          const char = Characters.getById(entry.charId);
          if (!char) return;
          Chat.currentCharId = entry.charId;
          Storage.setActiveChar(entry.charId);
          // 把历史消息恢复到当前聊天
          Storage.saveChat(entry.charId, entry.messages);
          UI.loadChatView(char);
          overlay.style.display = 'none';
          if (window.innerWidth <= 768) UI.els.sidebar.classList.add('collapsed');
        });
      });

      // 删除按钮
      list.querySelectorAll('.btn-hist-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.delId;
          Storage.deleteHistoryEntry(id);
          // 刷新列表
          document.getElementById('btnHistory').click();
        });
      });
    }

    overlay.style.display = 'flex';
  });

  document.getElementById('btnCloseHistory').addEventListener('click', () => {
    document.getElementById('historyOverlay').style.display = 'none';
  });

  document.getElementById('historyOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.style.display = 'none';
    }
  });

  // 创建角色按钮
  UI.els.btnCreateChar.addEventListener('click', () => {
    UI.openCharModal();
  });

  // 角色弹窗 - 关闭
  UI.els.btnCloseModal.addEventListener('click', () => UI.closeModal());
  UI.els.btnCancelChar.addEventListener('click', () => UI.closeModal());
  UI.els.modalOverlay.addEventListener('click', (e) => {
    if (e.target === UI.els.modalOverlay) UI.closeModal();
  });

  // 角色弹窗 - 保存
  UI.els.btnSaveChar.addEventListener('click', () => UI.saveCharacter());

  // 角色弹窗 - 键盘快捷键
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (UI.els.modalOverlay.style.display === 'flex') UI.closeModal();
      if (UI.els.userModalOverlay.style.display === 'flex') UI.closeUserModal();
      if (document.getElementById('historyOverlay').style.display === 'flex') {
        document.getElementById('historyOverlay').style.display = 'none';
      }
    }
    // Ctrl+Enter 保存角色
    if (e.ctrlKey && e.key === 'Enter') {
      if (UI.els.modalOverlay.style.display === 'flex') UI.saveCharacter();
    }
  });

  // Emoji 选择器
  UI.els.emojiPicker.querySelectorAll('.emoji-option').forEach(btn => {
    btn.addEventListener('click', () => {
      UI.els.emojiPicker.querySelectorAll('.emoji-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      UI.els.charEmoji.value = btn.dataset.emoji;
    });
  });

  // 提示词模板按钮
  UI.els.btnTemplate.addEventListener('click', () => {
    const template = Characters.getTemplate();
    UI.els.charPrompt.value = template;
    UI.els.charPrompt.focus();
    UI.showToast('模板已插入 📋');
  });

  // 用户身份弹窗
  UI.els.btnEditUser.addEventListener('click', () => UI.openUserModal());
  UI.els.btnCloseUserModal.addEventListener('click', () => UI.closeUserModal());
  UI.els.btnCancelUser.addEventListener('click', () => UI.closeUserModal());
  UI.els.userModalOverlay.addEventListener('click', (e) => {
    if (e.target === UI.els.userModalOverlay) UI.closeUserModal();
  });
  UI.els.btnSaveUser.addEventListener('click', () => UI.saveUser());

  // 点击聊天区域空白处（移动端）收起侧边栏
  UI.els.chatArea.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && !UI.els.sidebar.classList.contains('collapsed')) {
      if (!e.target.closest('.sidebar') && !e.target.closest('.btn-back')) {
        UI.els.sidebar.classList.add('collapsed');
      }
    }
  });

  // 窗口大小变化时处理
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      UI.els.sidebar.classList.remove('collapsed');
    }
  });

  // PWA 支持（禁用双击缩放）
  document.addEventListener('dblclick', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();
  }, { passive: false });

  console.log('💕 性爱AI 已就绪');
})();
