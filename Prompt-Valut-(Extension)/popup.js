// Dynamic Category organizer logic with absolute parallax layout sync (replaces image_75b73e.png)
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

let currentCategoryFilter = "All";
let searchQuery = "";
let localApiKey = "";

document.addEventListener('DOMContentLoaded', () => {
  initializeWorkspace();
  setupEventListeners();
});

function initializeWorkspace() {
  chrome.storage.local.get(['categories', 'prompts', 'apiKey'], (result) => {
    // Populate Default Dynamic Categories list if none stored
    if (!result.categories || result.categories.length === 0) {
      chrome.storage.local.set({ categories: ["All", "Coding", "Writing", "Productivity", "Marketing"] });
    }
    
    localApiKey = result.apiKey || "";
    updateApiBadgeStatus();
    loadInterfaceData();
  });
}

function updateApiBadgeStatus() {
  const badge = document.getElementById('api-status-badge');
  const label = document.getElementById('title-field-label');
  const input = document.getElementById('prompt-title-input');
  const hint = document.getElementById('title-hint');
  
  if (localApiKey) {
    if (badge) {
      badge.textContent = "AI ACTIVE";
      badge.style.color = "#34d399";
      badge.style.background = "rgba(16, 185, 129, 0.15)";
    }
    if (label) label.textContent = "Title (Optional)";
    if (input) input.placeholder = "AI auto-name if empty...";
    if (hint) hint.style.style = "display: none;";
  } else {
    if (badge) {
      badge.textContent = "MANUAL MODE";
      badge.style.color = "#f87171";
      badge.style.background = "rgba(239, 68, 68, 0.15)";
    }
    if (label) label.textContent = "Title (Required)";
    if (input) input.placeholder = "Title is required...";
    if (hint) hint.style.display = "block";
  }
}

function loadInterfaceData() {
  loadCategoryTabs();
  loadSavedPrompts();
}

function setupEventListeners() {
  // Navigation transitions
  document.getElementById('add-prompt-btn').addEventListener('click', () => {
    switchScreen('add-view');
    populateCategorySelector();
  });
  
  document.getElementById('add-cancel-btn').addEventListener('click', () => {
    switchScreen('home-view');
  });

  document.getElementById('manage-cats-btn').addEventListener('click', () => {
    switchScreen('cats-view');
    renderCategoriesManagement();
  });

  document.getElementById('cats-done-btn').addEventListener('click', () => {
    switchScreen('home-view');
    loadInterfaceData();
  });

  document.getElementById('settings-btn').addEventListener('click', () => {
    switchScreen('settings-view');
    document.getElementById('api-key-input').value = localApiKey;
  });

  document.getElementById('settings-back-btn').addEventListener('click', () => {
    switchScreen('home-view');
  });

  document.getElementById('api-key-save-btn').addEventListener('click', () => {
    saveApiKeySetting();
  });

  document.getElementById('new-cat-add-btn').addEventListener('click', () => {
    addDynamicCategory();
  });

  document.getElementById('prompt-save-btn').addEventListener('click', () => {
    saveNewPromptTemplate();
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    loadSavedPrompts();
  });

  document.getElementById('export-all-btn').addEventListener('click', () => {
    exportConsolidatedMarkdown();
  });

  // Modal Closures
  document.getElementById('modal-close-btn').addEventListener('click', () => {
    document.getElementById('prompt-modal').className = "modal-overlay";
  });
}

function switchScreen(screenId) {
  document.getElementById('home-view').style.display = screenId === 'home-view' ? 'flex' : 'none';
  document.getElementById('cats-view').className = screenId === 'cats-view' ? 'form-panel active' : 'form-panel';
  document.getElementById('settings-view').className = screenId === 'settings-view' ? 'form-panel active' : 'form-panel';
  document.getElementById('add-view').className = screenId === 'add-view' ? 'form-panel active' : 'form-panel';
}

function saveApiKeySetting() {
  const keyVal = document.getElementById('api-key-input').value.trim();
  chrome.storage.local.set({ apiKey: keyVal }, () => {
    localApiKey = keyVal;
    updateApiBadgeStatus();
    switchScreen('home-view');
  });
}

function loadCategoryTabs() {
  chrome.storage.local.get(['categories'], (result) => {
    const bar = document.getElementById('cat-tabs-bar');
    bar.innerHTML = '';
    const cats = result.categories || ["All", "Coding", "Writing", "Productivity", "Marketing"];
    
    cats.forEach(c => {
      const el = document.createElement('div');
      el.className = 'cat-badge' + (currentCategoryFilter === c ? ' active' : '');
      el.textContent = c;
      el.onclick = () => {
        currentCategoryFilter = c;
        loadCategoryTabs();
        loadSavedPrompts();
      };
      bar.appendChild(el);
    });
  });
}

function populateCategorySelector() {
  chrome.storage.local.get(['categories'], (result) => {
    const select = document.getElementById('prompt-cat-select');
    select.innerHTML = '';
    const cats = result.categories || [];
    cats.filter(c => c !== "All").forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    });
  });
}

function loadSavedPrompts() {
  chrome.storage.local.get(['prompts'], (result) => {
    const list = document.getElementById('prompts-list');
    list.innerHTML = '';
    let items = result.prompts || [];

    if (currentCategoryFilter !== 'All') {
      items = items.filter(p => p.category === currentCategoryFilter);
    }

    if (searchQuery) {
      items = items.filter(p => 
        p.title.toLowerCase().includes(searchQuery) || 
        p.content.toLowerCase().includes(searchQuery)
      );
    }

    if (items.length === 0) {
      list.innerHTML = '<div style="text-align:center; padding:40px 10px; font-size:11px; color:#64748b;">No prompts found. Click "Add Prompt" to create one.</div>';
      return;
    }

    items.forEach(p => {
      const card = document.createElement('div');
      card.className = 'prompt-card';
      
      const wordCount = p.content ? p.content.trim().split(/\s+/).filter(Boolean).length : 0;
      
      card.innerHTML = `
        <div class="card-meta">
          <span class="card-title">${p.title}</span>
          <span class="card-cat-label">${p.category}</span>
        </div>
        <div class="card-body">${p.content}</div>
        <div class="card-divider"></div>
        <div class="card-footer">${wordCount} words</div>
        <button class="quick-copy-btn" title="Quick Copy">
          <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
          </svg>
        </button>
      `;
      
      // Separate click: Clicking card content opens the modal preview
      card.addEventListener('click', (e) => {
        if (e.target.closest('.quick-copy-btn')) return;
        openPromptModal(p);
      });

      // Quick Copy click event handler
      card.querySelector('.quick-copy-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        copyTextToClipboard(p.content);
      });

      list.appendChild(card);
    });
  });
}

function openPromptModal(prompt) {
  document.getElementById('modal-cat-badge').textContent = prompt.category;
  document.getElementById('modal-prompt-title').textContent = prompt.title;
  
  const bodyEl = document.getElementById('modal-prompt-body');
  bodyEl.innerHTML = parseMarkdownBasic(prompt.content);

  const copyBtn = document.getElementById('modal-copy-btn');
  copyBtn.onclick = () => {
    copyTextToClipboard(prompt.content);
  };

  document.getElementById('prompt-modal').className = "modal-overlay active";
}

function parseMarkdownBasic(text) {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Lists
  html = html.replace(/^\s*[-*]\s+(.*$)/gim, '• $1');
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h4 style="color:#ffffff; margin: 8px 0 4px 0; font-weight:700;">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 style="color:#ffffff; margin: 12px 0 6px 0; font-weight:700;">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2 style="color:#ffffff; margin: 16px 0 8px 0; font-weight:800;">$1</h2>');
  return html;
}

function copyTextToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  
  // Custom tiny confirmation alert wrapper
  const confirmPill = document.createElement('div');
  confirmPill.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#10b981; color:white; font-size:10px; font-weight:800; padding:6px 16px; border-radius:999px; z-index:9999; box-shadow:0 10px 25px rgba(16,185,129,0.35);";
  confirmPill.textContent = "COPIED TO CLIPBOARD!";
  document.body.appendChild(confirmPill);
  setTimeout(() => confirmPill.remove(), 1500);
}

function addDynamicCategory() {
  const input = document.getElementById('new-cat-input');
  const val = input.value.trim();
  if (!val) return;

  chrome.storage.local.get(['categories'], (result) => {
    const list = result.categories || ["All", "Coding", "Writing", "Productivity", "Marketing"];
    if (list.includes(val)) return;
    list.push(val);
    chrome.storage.local.set({ categories: list }, () => {
      input.value = '';
      renderCategoriesManagement();
    });
  });
}

function deleteDynamicCategory(catName) {
  chrome.storage.local.get(['categories', 'prompts'], (result) => {
    let cats = result.categories || ["All", "Coding", "Writing", "Productivity", "Marketing"];
    cats = cats.filter(c => c !== catName);
    
    const prompts = result.prompts || [];
    prompts.forEach(p => {
      if (p.category === catName) p.category = "Productivity";
    });

    chrome.storage.local.set({ categories: cats, prompts: prompts }, () => {
      renderCategoriesManagement();
    });
  });
}

function renderCategoriesManagement() {
  chrome.storage.local.get(['categories'], (result) => {
    const mgmt = document.getElementById('cats-list-mgmt');
    mgmt.innerHTML = '';
    const cats = result.categories || ["All", "Coding", "Writing", "Productivity", "Marketing"];
    
    cats.filter(c => c !== 'All').forEach(c => {
      const row = document.createElement('div');
      row.className = 'cat-row';
      row.innerHTML = `
        <span class="cat-row-title">${c}</span>
        <span class="cat-row-delete">Delete</span>
      `;
      row.querySelector('.cat-row-delete').onclick = () => deleteDynamicCategory(c);
      mgmt.appendChild(row);
    });
  });
}

async function saveNewPromptTemplate() {
  const content = document.getElementById('prompt-body-input').value.trim();
  const cat = document.getElementById('prompt-cat-select').value;
  let customTitle = document.getElementById('prompt-title-input').value.trim();

  if (!content) return;

  if (!customTitle && !localApiKey) {
    alert("Title is required when API Key is missing.");
    return;
  }

  if (!customTitle && localApiKey) {
    document.getElementById('ai-generating-indicator').style.display = 'block';
    customTitle = await autoSummarizeTitleText(content);
    document.getElementById('ai-generating-indicator').style.display = 'none';
  }

  chrome.storage.local.get(['prompts'], (result) => {
    const list = result.prompts || [];
    const item = {
      id: Date.now().toString(),
      title: customTitle || "Generated AI Prompt",
      content: content,
      category: cat,
      createdAt: Date.now()
    };
    list.unshift(item);
    chrome.storage.local.set({ prompts: list }, () => {
      document.getElementById('prompt-body-input').value = '';
      document.getElementById('prompt-title-input').value = '';
      switchScreen('home-view');
      loadInterfaceData();
    });
  });
}

async function autoSummarizeTitleText(promptText) {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${localApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Summarize this prompt into a short title of exactly 3 to 4 words. Be direct: "${promptText}"` }] }]
      })
    });
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Generated AI Prompt";
  } catch (err) {
    return promptText.split(" ").slice(0, 4).join(" ") + "...";
  }
}

function exportConsolidatedMarkdown() {
  chrome.storage.local.get(['prompts'], (result) => {
    const items = result.prompts || [];
    if (items.length === 0) {
      alert("No prompts saved to export.");
      return;
    }
    
    let md = "# PromptVault Consolidated Markdown Export\n\n";
    items.forEach(p => {
      md += "## " + p.title + " (" + p.category + ")\n\n";
      md += p.content + "\n\n---\n\n";
    });
    
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "PromptVault_Export.md";
    a.click();
    URL.revokeObjectURL(url);
  });
}