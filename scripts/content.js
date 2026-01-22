// ===== Constants & State =====
const MOODLE_API_URL = "https://courseweb.sliit.lk/lib/ajax/service.php";
let cachedSessKey = null;

// ===== Helper Functions =====

// Extract Moodle Session Key from the page source
function getSessKey() {
  if (cachedSessKey) return cachedSessKey;

  // Try to find it in the head script tags
  const scripts = document.querySelectorAll('head script');
  for (let script of scripts) {
    const content = script.textContent;
    if (content && content.includes('M.cfg')) {
      const match = content.match(/"sesskey":"([^"]+)"/);
      if (match && match[1]) {
        cachedSessKey = match[1];
        return cachedSessKey;
      }
    }
  }
  return null;
}

// Fetch all enrolled courses via Moodle API
async function fetchCoursesFromApi() {
  const sessKey = getSessKey();
  if (!sessKey) {
    console.warn("SliitScope: Could not find sesskey. API fetch failed.");
    return [];
  }

  const payload = [{
    index: 0,
    methodname: "core_course_get_enrolled_courses_by_timeline_classification",
    args: {
      offset: 0,
      limit: 0,
      classification: "all",
      sort: "fullname"
    }
  }];

  try {
    const url = `${MOODLE_API_URL}?sesskey=${sessKey}&info=core_course_get_enrolled_courses_by_timeline_classification`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data && data[0] && !data[0].error) {
      // Map API response to our internal module structure
      // We use the viewurl as ID to maintain backward compatibility if possible,
      // or we can use the numeric ID. Let's use numeric ID for better reliability,
      // but if the old extension used URLs, we might want to migrate.
      // The old extension used 'href' which was the view URL.
      return data[0].data.courses.map(course => ({
        id: course.viewurl, // Using viewurl as ID to match old behavior
        courseId: course.id, // Keep numeric ID just in case
        name: course.fullname,
        hidden: false // Default, will be overridden by storage
      }));
    } else {
      console.error("SliitScope: API Error", data);
      return [];
    }
  } catch (error) {
    console.error("SliitScope: Fetch Error", error);
    return [];
  }
}

// Apply hidden modules to the DOM (Dashboard Cards)
// Apply hidden modules to the DOM (Dashboard Cards)
function applyHiddenModules(hiddenIds) {
  // Focus Mode triggering removed per user feedback.
  // We now only hide the specific course cards.

  // Target the course cards on the dashboard (my/courses.php)
  const courseCards = document.querySelectorAll('.card[data-course-id], .course-summaryitem[data-course-id], .list-group-item[data-course-id]');
  let visibleCount = 0;

  if (courseCards.length > 0) {
    courseCards.forEach(card => {
      const courseId = card.getAttribute('data-course-id');
      const urlId = `https://courseweb.sliit.lk/course/view.php?id=${courseId}`;
      const shouldHide = hiddenIds.includes(urlId) || hiddenIds.some(hid => hid.includes(`id=${courseId}`));

      // Helper to check if element is a Bootstrap grid column
      const isGridColumn = (el) => el && el.classList && Array.from(el.classList).some(cls => cls === 'col' || cls.startsWith('col-'));

      const parent = card.parentElement;
      const target = isGridColumn(parent) ? parent : card;

      if (shouldHide) {
        target.style.setProperty('display', 'none', 'important');
      } else {
        // Show logic - clean up all potential hiddens
        if (target.style.display === 'none') target.style.display = '';
        if (card.style.display === 'none') card.style.display = '';
        if (parent.style.display === 'none') parent.style.display = '';
        visibleCount++;
      }
    });

    // === Auto-Load Logic ===
    // If the visible count is low (e.g. < 5), try to click "Show more"
    // We check for standard Moodle "Show more" buttons or pagination
    checkAndLoadMore(visibleCount);
  }
}

let loadMoreAttempts = 0;
const MAX_LOAD_ATTEMPTS = 5; // Prevent infinite loops
let lastLoadTime = 0;

function checkAndLoadMore(visibleCount) {
  const now = Date.now();
  if (now - lastLoadTime < 1000) return; // Debounce 1s

  // Standard Moodle limit is often 12 or 24. If we have significantly fewer, load more.
  if (visibleCount < 8) { // Threshold
    const loadButtons = document.querySelectorAll(
      '[data-action="more-courses"], .dashboard-card-deck-show-more, .btn.btn-secondary[id*="showmore"]'
    );

    if (loadButtons.length > 0 && loadMoreAttempts < MAX_LOAD_ATTEMPTS) {
      console.log("SliitScope: Auto-loading more courses...", loadButtons[0]);
      loadButtons[0].click();
      loadMoreAttempts++;
      lastLoadTime = now;

      // Reset attempts after a success and some time, so user can scroll further later
      setTimeout(() => { loadMoreAttempts = 0; }, 5000);
    }
  }
}

// Sync hidden state
function syncModulesWithStorage() {
  chrome.storage.local.get({ hiddenModules: [] }, (data) => {
    applyHiddenModules(data.hiddenModules);
  });
}

// ===== Message Listener =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_MODULES") {
    fetchCoursesFromApi().then(modules => {
      sendResponse({ modules });
    });
    return true; // async
  }

  if (request.type === "TOGGLE_MODULE") {
    chrome.storage.local.get({ hiddenModules: [] }, (data) => {
      let updated = data.hiddenModules;

      if (request.action === "hide") {
        if (!updated.includes(request.id)) updated.push(request.id);
      } else if (request.action === "show") {
        updated = updated.filter((id) => id !== request.id);
      }

      chrome.storage.local.set({ hiddenModules: updated }, () => {
        syncModulesWithStorage(); // Apply to current page immediately
        sendResponse({ status: "ok" });
      });
    });
    return true; // async response
  }

  if (request.type === "SYNC_MODULES") {
    syncModulesWithStorage();
    sendResponse({ status: "ok" });
  }
});

// ===== Theme Handling =====
function syncTheme() {
  chrome.storage.local.get({ theme: "dark" }, (data) => {
    if (data.theme === "dark") {
      document.body.classList.add("sliitscope-dark");
    } else {
      document.body.classList.remove("sliitscope-dark");
    }
  });
}

// Listen for storage changes (e.g. from popup)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.theme) {
    syncTheme();
  }
});

// ===== Observers & Init =====

// Watch for DOM changes (Cards loading async)
const observer = new MutationObserver((mutations) => {
  // Debounce could be added here if performance issues arise
  syncModulesWithStorage();
});

function init() {
  // Start observing the main content area for course loads
  const contentRegion = document.getElementById('region-main');
  if (contentRegion) {
    observer.observe(contentRegion, { childList: true, subtree: true });
  }

  // Initial sync
  syncModulesWithStorage();
  syncTheme();
}

// Run on page load
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
