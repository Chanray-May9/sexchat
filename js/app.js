// ===== app.js - 应用入口 & 事件绑定 =====

(function() {
  'use strict';

  UI.init();
  UI.updateUserDisplay();
  UI.loadSettingsUI();

  const settings = Storage.getSettings();
  if (!settings.thinkingEnabled) {
    document.getElementById('effortRow').style.display = 'none';
  }
  if (settings.model === 'deepseek-v4-flash') {
    document.getElementById('effortRow').style.display = 'none';
  }

  UI.renderCharList();

  // ===== 发送消息 =====
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
  UI.els.chatInput.addEventListener('input', () => {
    UI.els.chatInput.style.height = 'auto';
    UI.els.chatInput.style.height = Math.min(UI.els.chatInput.scrollHeight, 120) + 'px';
  });

  // ===== 侧边栏 =====
  UI.els.btnBack.addEventListener('click', () => UI.els.sidebar.classList.remove('collapsed'));
  UI.els.sidebarToggle.addEventListener('click', () => UI.els.sidebar.classList.toggle('collapsed'));

  // ===== 聊天操作 =====
  UI.els.btnClearChat.addEventListener('click', () => {
    if (!Chat.currentCharId) return;
    if (!confirm('确定要清空当前对话吗？此操作不可恢复。')) return;
    Chat.clearCurrentChat();
    UI.clearMessages();
    UI.showToast('对话已清空');
  });

  UI.els.btnExportChat.addEventListener('click', () => {
    const text = Chat.exportCurrentChat();
    if (!text) { UI.showToast('没有可导出的对话', 'error'); return; }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sexchat_' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    UI.showToast('对话已导出 💕');
  });

  // ===== 角色弹窗 =====
  UI.els.btnCreateChar.addEventListener('click', () => UI.openCharModal());
  UI.els.btnCloseModal.addEventListener('click', () => UI.closeModal());
  UI.els.btnCancelChar.addEventListener('click', () => UI.closeModal());
  UI.els.modalOverlay.addEventListener('click', (e) => { if (e.target === UI.els.modalOverlay) UI.closeModal(); });
  UI.els.btnSaveChar.addEventListener('click', () => UI.saveCharacter());

  // ===== 键盘 =====
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (UI.els.modalOverlay.style.display === 'flex') UI.closeModal();
      if (UI.els.userModalOverlay.style.display === 'flex') UI.closeUserModal();
    }
    if (e.ctrlKey && e.key === 'Enter') {
      if (UI.els.modalOverlay.style.display === 'flex') UI.saveCharacter();
    }
  });

  // ===== Emoji =====
  UI.els.emojiPicker.querySelectorAll('.emoji-option').forEach(btn => {
    btn.addEventListener('click', () => {
      UI.els.emojiPicker.querySelectorAll('.emoji-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      UI.els.charEmoji.value = btn.dataset.emoji;
    });
  });

  // ===== 模板 =====
  UI.els.btnTemplate.addEventListener('click', () => {
    UI.els.charPrompt.value = Characters.getTemplate();
    UI.els.charPrompt.focus();
    UI.showToast('模板已插入 📋');
  });

  // ===== 用户身份 =====
  UI.els.btnEditUser.addEventListener('click', () => UI.openUserModal());
  UI.els.btnCloseUserModal.addEventListener('click', () => UI.closeUserModal());
  UI.els.btnCancelUser.addEventListener('click', () => UI.closeUserModal());
  UI.els.userModalOverlay.addEventListener('click', (e) => { if (e.target === UI.els.userModalOverlay) UI.closeUserModal(); });
  UI.els.btnSaveUser.addEventListener('click', () => UI.saveUser());

  // ===== 移动端 =====
  UI.els.chatArea.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && !UI.els.sidebar.classList.contains('collapsed')) {
      if (!e.target.closest('.sidebar') && !e.target.closest('.btn-back')) {
        UI.els.sidebar.classList.add('collapsed');
      }
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) UI.els.sidebar.classList.remove('collapsed');
  });

  document.addEventListener('dblclick', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();
  }, { passive: false });

  console.log('💕 性爱AI 已就绪');
})();
