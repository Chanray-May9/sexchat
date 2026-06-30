// ===== app.js - 应用入口 & 事件绑定 =====

(function() {
  'use strict';

  // 初始化 UI 引用
  UI.init();
  UI.updateUserDisplay();
  UI.renderCharList();

  // 检测移动端
  const isMobile = () => window.innerWidth <= 768;

  // 侧边栏控制
  function openSidebar() {
    UI.els.sidebar.classList.add('open');
    UI.els.sidebarBackdrop.classList.add('visible');
  }

  function closeSidebar() {
    UI.els.sidebar.classList.remove('open');
    UI.els.sidebarBackdrop.classList.remove('visible');
  }

  // 恢复上次活跃角色
  const savedCharId = Storage.getActiveChar();
  if (savedCharId) {
    const char = Characters.getById(savedCharId);
    if (char) {
      Chat.init(savedCharId);
      UI.loadChatView(char);
    }
  }

  // ===== 事件绑定 =====

  // --- 发送消息 ---
  function handleSend() {
    const content = UI.els.chatInput.value.trim();
    if (!content || Chat.isGenerating) return;
    UI.els.chatInput.value = '';
    UI.els.chatInput.style.height = 'auto';
    UI.showTyping();
    Chat.sendMessage(content);
  }

  UI.els.btnSend.addEventListener('click', handleSend);

  UI.els.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  UI.els.chatInput.addEventListener('input', () => {
    UI.els.chatInput.style.height = 'auto';
    UI.els.chatInput.style.height = Math.min(UI.els.chatInput.scrollHeight, 100) + 'px';
  });

  // --- 侧边栏 ---
  UI.els.btnBack.addEventListener('click', openSidebar);

  // 关闭侧边栏
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('sidebarBackdrop').addEventListener('click', closeSidebar);

  // 桌面端默认打开侧边栏
  if (!isMobile()) {
    UI.els.sidebar.classList.add('open');
  }

  // --- 欢迎页打开角色列表按钮 ---
  document.getElementById('btnOpenChars').addEventListener('click', openSidebar);

  // --- 切换角色后关闭侧边栏（移动端）---
  const origSelect = UI.selectCharacter.bind(UI);
  UI.selectCharacter = function(charId) {
    origSelect(charId);
    if (isMobile()) closeSidebar();
  };

  // --- 移动端底部栏 ---
  document.getElementById('tabCharacters').addEventListener('click', () => {
    if (isMobile()) openSidebar();
  });

  document.getElementById('tabClear').addEventListener('click', () => {
    if (!Chat.currentCharId) {
      UI.showToast('请先选择一个角色', 'error');
      return;
    }
    if (!confirm('确定要清空当前对话吗？此操作不可恢复。')) return;
    Chat.clearCurrentChat();
    UI.clearMessages();
    UI.showToast('对话已清空');
  });

  document.getElementById('tabUser').addEventListener('click', () => {
    UI.openUserModal();
  });

  // --- 清空对话（顶部按钮）---
  UI.els.btnClearChat.addEventListener('click', () => {
    if (!Chat.currentCharId) return;
    if (!confirm('确定要清空当前对话吗？')) return;
    Chat.clearCurrentChat();
    UI.clearMessages();
    UI.showToast('对话已清空');
  });

  // --- 导出对话 ---
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

  // --- 创建角色 ---
  UI.els.btnCreateChar.addEventListener('click', () => UI.openCharModal());

  // --- 角色弹窗 ---
  UI.els.btnCloseModal.addEventListener('click', () => UI.closeModal());
  UI.els.btnCancelChar.addEventListener('click', () => UI.closeModal());
  UI.els.modalOverlay.addEventListener('click', (e) => {
    if (e.target === UI.els.modalOverlay) UI.closeModal();
  });
  UI.els.btnSaveChar.addEventListener('click', () => UI.saveCharacter());

  // --- 弹窗切换显示 ---
  // 覆写 openCharModal 和 closeModal 使用 class 控制
  const origOpenCharModal = UI.openCharModal.bind(UI);
  UI.openCharModal = function(char) {
    origOpenCharModal(char);
    UI.els.modalOverlay.classList.add('open');
  };

  const origCloseModal = UI.closeModal.bind(UI);
  UI.closeModal = function() {
    origCloseModal();
    UI.els.modalOverlay.classList.remove('open');
  };

  // --- 键盘快捷键 ---
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (UI.els.modalOverlay.classList.contains('open')) UI.closeModal();
      if (UI.els.userModalOverlay.classList.contains('open')) UI.closeUserModal();
    }
    if (e.ctrlKey && e.key === 'Enter') {
      if (UI.els.modalOverlay.classList.contains('open')) UI.saveCharacter();
    }
  });

  // --- Emoji 选择器 ---
  UI.els.emojiPicker.querySelectorAll('.emoji-option').forEach(btn => {
    btn.addEventListener('click', () => {
      UI.els.emojiPicker.querySelectorAll('.emoji-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      UI.els.charEmoji.value = btn.dataset.emoji;
    });
  });

  // --- 提示词模板 ---
  UI.els.btnTemplate.addEventListener('click', () => {
    UI.els.charPrompt.value = Characters.getTemplate();
    UI.els.charPrompt.focus();
    UI.showToast('模板已插入 📋');
  });

  // --- 用户身份弹窗 ---
  UI.els.btnEditUser.addEventListener('click', () => UI.openUserModal());

  // 覆写用户弹窗方法
  const origOpenUserModal = UI.openUserModal.bind(UI);
  UI.openUserModal = function() {
    origOpenUserModal();
    UI.els.userModalOverlay.classList.add('open');
  };
  const origCloseUserModal = UI.closeUserModal.bind(UI);
  UI.closeUserModal = function() {
    origCloseUserModal();
    UI.els.userModalOverlay.classList.remove('open');
  };

  UI.els.btnCloseUserModal.addEventListener('click', () => UI.closeUserModal());
  UI.els.btnCancelUser.addEventListener('click', () => UI.closeUserModal());
  UI.els.userModalOverlay.addEventListener('click', (e) => {
    if (e.target === UI.els.userModalOverlay) UI.closeUserModal();
  });
  UI.els.btnSaveUser.addEventListener('click', () => UI.saveUser());

  // --- 窗口大小变化 ---
  window.addEventListener('resize', () => {
    if (!isMobile() && !UI.els.sidebar.classList.contains('open')) {
      UI.els.sidebar.classList.add('open');
    }
  });

  console.log('💕 性爱AI 已就绪 — ' + (isMobile() ? '移动端' : '桌面端'));
})();
