document.addEventListener("DOMContentLoaded", function () {
  // Get the active tab
  function getCurrentTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length > 0) callback(tabs[0]);
    });
  }

  // Fetch hidden module IDs from local storage
  function fetchHiddenModules(callback) {
    chrome.storage.local.get({ hiddenModules: [] }, (data) => {
      callback(data.hiddenModules || []);
    });
  }

  // Save updated hidden module IDs to storage
  function saveHiddenModules(hiddenIds, callback) {
    chrome.storage.local.set({ hiddenModules: hiddenIds }, callback);
  }

  // Create a list item for a module
  function createModuleListItem(mod, modules, hiddenIds, tabId) {
    const li = document.createElement("li");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "module-checkbox";
    checkbox.dataset.id = mod.id;
    li.appendChild(checkbox);

    const titleSpan = document.createElement("span");
    titleSpan.className = "module-title";
    titleSpan.textContent = mod.name;
    if (mod.hidden) titleSpan.classList.add("dim");

    const btn = document.createElement("button");
    btn.className = "tidy-toggle-btn";
    btn.title = mod.hidden ? "Show this module" : "Hide this module";
    btn.textContent = mod.hidden ? "Show" : "Hide";
    btn.classList.add(mod.hidden ? "show-btn" : "hide-btn");

    btn.onclick = function () {
      let updatedHiddenIds;
      if (mod.hidden) {
        updatedHiddenIds = hiddenIds.filter((id) => id !== mod.id);
      } else {
        updatedHiddenIds = [...hiddenIds, mod.id];
      }

      saveHiddenModules(updatedHiddenIds, () => {
        renderModuleList(modules, updatedHiddenIds, tabId);
        // Notify content script to apply changes
        chrome.tabs.sendMessage(tabId, { type: "SYNC_MODULES" });
      });
    };

    li.appendChild(titleSpan);
    li.appendChild(btn);
    return li;
  }

  // Render modules list in popup
  function renderModuleList(modules, hiddenIds, tabId) {
    const listEl = document.getElementById("module-list");
    listEl.innerHTML = "";

    const filter = document.getElementById("filter-select").value;
    const sort = document.getElementById("sort-select").value;
    const searchTerm = document.getElementById("search-input").value.toLowerCase();

    let processedModules = modules.map((m) => ({
      ...m,
      hidden: hiddenIds.includes(m.id),
    }));

    if (filter === "visible") processedModules = processedModules.filter((m) => !m.hidden);
    if (filter === "hidden") processedModules = processedModules.filter((m) => m.hidden);

    if (searchTerm) {
        processedModules = processedModules.filter((m) => m.name.toLowerCase().includes(searchTerm));
    }

    if (sort === "az") {
        processedModules.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "za") {
        processedModules.sort((a, b) => b.name.localeCompare(a.name));
    }

    const groupRegex = /^(\d{4}\s-\sY\d\.S\d)\s-\s(.+)$/;
    const groups = processedModules.reduce((acc, mod) => {
      const match = mod.name.match(groupRegex);
      let groupName;
      let moduleName = mod.name;
      if (match) {
        groupName = match[1];
        moduleName = match[2];
      } else {
        groupName = "Other";
      }
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push({ ...mod, name: moduleName });
      return acc;
    }, {});

    const groupKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a)); // Sort groups chronologically

    groupKeys.forEach(groupName => {
      const groupHeader = document.createElement("div");
      groupHeader.className = "group-header";
      groupHeader.textContent = groupName;
      listEl.appendChild(groupHeader);

      const groupModules = groups[groupName];
      groupModules.forEach((mod) => {
        const li = createModuleListItem(mod, modules, hiddenIds, tabId);
        listEl.appendChild(li);
      });
    });
  }

  function refreshAndRender(tabId) {
    // Fetch modules from content script
    chrome.tabs.sendMessage(tabId, { type: "GET_MODULES" }, (response) => {
      if (!response || !response.modules) return;

      fetchHiddenModules((hiddenIds) => {
        renderModuleList(response.modules, hiddenIds, tabId);
      });
    });
  }

  function setupTheme() {
    const themeToggle = document.getElementById("theme-toggle");
    const container = document.querySelector(".container");

    function applyTheme(theme) {
        if (theme === "light") {
            container.classList.add("light-theme");
            themeToggle.textContent = "☀️";
        } else {
            container.classList.remove("light-theme");
            themeToggle.textContent = "🌙";
        }
    }

    chrome.storage.local.get({ theme: "dark" }, (data) => {
        applyTheme(data.theme);
    });

    themeToggle.onclick = function () {
        const currentTheme = container.classList.contains("light-theme") ? "light" : "dark";
        const newTheme = currentTheme === "light" ? "dark" : "light";
        chrome.storage.local.set({ theme: newTheme }, () => {
            applyTheme(newTheme);
        });
    };
  }

  function setupBulkActions(tabId, modules) {
    const selectAllCheckbox = document.getElementById("select-all");
    const hideSelectedBtn = document.getElementById("hide-selected");
    const showSelectedBtn = document.getElementById("show-selected");
    const moduleList = document.getElementById("module-list");

    selectAllCheckbox.onchange = function () {
        const checkboxes = moduleList.querySelectorAll(".module-checkbox");
        checkboxes.forEach(cb => {
            cb.checked = selectAllCheckbox.checked;
        });
    };

    function handleBulkAction(action) {
        const checkboxes = moduleList.querySelectorAll(".module-checkbox:checked");
        const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.id);

        if (selectedIds.length === 0) return;

        fetchHiddenModules(hiddenIds => {
            let updatedHiddenIds;
            if (action === 'hide') {
                updatedHiddenIds = [...new Set([...hiddenIds, ...selectedIds])];
            } else { // show
                updatedHiddenIds = hiddenIds.filter(id => !selectedIds.includes(id));
            }
            saveHiddenModules(updatedHiddenIds, () => {
                renderModuleList(modules, updatedHiddenIds, tabId);
                chrome.tabs.sendMessage(tabId, { type: "SYNC_MODULES" });
            });
        });
    }

    hideSelectedBtn.onclick = () => handleBulkAction('hide');
    showSelectedBtn.onclick = () => handleBulkAction('show');
  }

  // Initialize popup
  getCurrentTab((tab) => {
    setupTheme();

    if (
      !tab ||
      !tab.url ||
      !tab.url.startsWith("https://courseweb.sliit.lk/")
    ) {
      const contentDiv = document.querySelector(".content");
      if (contentDiv) {
        contentDiv.innerHTML = `
          <div style="text-align:center; color:#AAA; padding:32px 0;">
            <p><b>SliitScope</b> works only on</p>
            <p style="color:#888;">courseweb.sliit.lk</p>
          </div>
        `;
      }
      const showAllBtn = document.getElementById("show-all");
      if (showAllBtn) showAllBtn.style.display = "none";
      const themeToggle = document.getElementById("theme-toggle");
      if (themeToggle) themeToggle.style.display = 'none';
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tabId = tabs[0].id;

      // Fetch modules once and pass them around
      chrome.tabs.sendMessage(tabId, { type: "GET_MODULES" }, (response) => {
        if (!response || !response.modules) return;
        const modules = response.modules;

        function render() {
            fetchHiddenModules((hiddenIds) => {
                renderModuleList(modules, hiddenIds, tabId);
            });
        }

        render();
        setupBulkActions(tabId, modules);

        const filterSelect = document.getElementById("filter-select");
        const sortSelect = document.getElementById("sort-select");
        const searchInput = document.getElementById("search-input");
        if (filterSelect) filterSelect.onchange = render;
        if (sortSelect) sortSelect.onchange = render;
        if (searchInput) searchInput.oninput = render;

        const showAllBtn = document.getElementById("show-all");
        if (showAllBtn) {
            showAllBtn.style.display = "";
            showAllBtn.onclick = function () {
                saveHiddenModules([], () => {
                    render();
                    chrome.tabs.sendMessage(tabId, { type: "SYNC_MODULES" });
                });
            };
        }
      });
    });
  });
});
