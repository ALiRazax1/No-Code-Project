// Background context helper for capturing quick web snippets
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "quick-save-prompt",
    title: "Save selection to PromptVault",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "quick-save-prompt" && info.selectionText) {
    chrome.storage.local.get(['prompts'], (result) => {
      const current = result.prompts || [];
      const autoTitle = info.selectionText.split(" ").slice(0, 3).join(" ") + "...";
      
      const snippet = {
        id: Date.now().toString(),
        title: "Clipped: " + autoTitle,
        content: info.selectionText,
        category: "Productivity",
        createdAt: Date.now()
      };
      
      current.unshift(snippet);
      chrome.storage.local.set({ prompts: current });
    });
  }
});