const STORAGE_KEY = "offline-insta-v7";
const AVATAR_SIZE = 256;
const POST_SIZE = 1080;

const state = {
  accounts: [],
  posts: [],
  dms: [],
  follows: [],
  activeAccountId: null,
  viewMode: "feed",
  profileViewingId: null,
  selectedPostId: null,
  currentReelIndex: 0,
  searchQuery: "",
};

const cropState = {
  target: null,
  file: null,
  image: null,
  zoom: 1,
  x: 0,
  y: 0,
  baseScale: 1,
  outputSize: AVATAR_SIZE,
  tempResult: null,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
};

const accountForm = document.getElementById("account-form");
const postForm = document.getElementById("post-form");
const commentForm = document.getElementById("comment-form");
const dmForm = document.getElementById("dm-form");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
const dmFrom = document.getElementById("dm-from");
const dmTo = document.getElementById("dm-to");
const dmThread = document.getElementById("dm-thread");
const dmPanel = document.getElementById("dm-panel");
const composeCard = document.getElementById("compose-card");
const accountList = document.getElementById("account-list");
const activeAccountEl = document.getElementById("active-account");
const profileHeader = document.getElementById("profile-header");
const viewTitleEl = document.getElementById("view-title");
const feedEl = document.getElementById("feed");
const clearButton = document.getElementById("clear-data");
const postTemplate = document.getElementById("post-template");

const viewFeedButton = document.getElementById("view-feed");
const viewExploreButton = document.getElementById("view-explore");
const viewProfileButton = document.getElementById("view-profile");
const viewReelsButton = document.getElementById("view-reels");
const viewDmButton = document.getElementById("view-dm");

const reelsOverlay = document.getElementById("reels-overlay");
const reelStage = document.getElementById("reel-stage");
const closeReelsButton = document.getElementById("close-reels");
const nextReelButton = document.getElementById("next-reel");

const postModal = document.getElementById("post-modal");
const closeModalButton = document.getElementById("close-modal");
const modalImage = document.getElementById("modal-image");
const modalAvatar = document.getElementById("modal-avatar");
const modalUser = document.getElementById("modal-user");
const modalUserTrigger = document.getElementById("modal-user-trigger");
const modalCaption = document.getElementById("modal-caption");
const modalTime = document.getElementById("modal-time");
const modalComments = document.getElementById("modal-comments");

const cropDialog = document.getElementById("crop-dialog");
const cropTitle = document.getElementById("crop-title");
const cropViewport = document.getElementById("crop-viewport");
const cropImageEl = document.getElementById("crop-image");
const cropZoom = document.getElementById("crop-zoom");
const cancelCrop = document.getElementById("cancel-crop");
const applyCrop = document.getElementById("apply-crop");

const avatarInput = document.getElementById("avatar");
const postInput = document.getElementById("photo");

init();

function init() {
  hydrate();
  ensureActiveAccount();
  searchInput.value = state.searchQuery;
  renderAll();

  accountForm.addEventListener("submit", handleCreateAccount);
  postForm.addEventListener("submit", handleCreatePost);
  commentForm.addEventListener("submit", handleAddComment);
  dmForm.addEventListener("submit", handleSendDm);

  avatarInput.addEventListener("change", () => startCrop("avatar"));
  postInput.addEventListener("change", () => startCrop("post"));

  dmFrom.addEventListener("change", renderDmThread);
  dmTo.addEventListener("change", renderDmThread);

  searchInput.addEventListener("input", () => {
    state.searchQuery = searchInput.value.trim().toLowerCase();
    renderSearchResults();
    renderFeed();
    persist();
  });

  clearButton.addEventListener("click", clearData);

  viewFeedButton.addEventListener("click", () => setViewMode("feed"));
  viewExploreButton.addEventListener("click", () => setViewMode("explore"));
  viewProfileButton.addEventListener("click", () => setViewMode("profile"));
  viewReelsButton.addEventListener("click", () => setViewMode("reels"));
  viewDmButton.addEventListener("click", () => setViewMode("dm"));

  closeReelsButton.addEventListener("click", () => setViewMode("feed"));
  nextReelButton.addEventListener("click", nextReel);

  window.addEventListener("keydown", (event) => {
    if (state.viewMode === "reels" && event.key === "ArrowDown") {
      event.preventDefault();
      nextReel();
    }
  });

  closeModalButton.addEventListener("click", closeModal);
  postModal.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.tagName === "DIALOG") closeModal();
  });

  cropZoom.addEventListener("input", () => {
    cropState.zoom = Number(cropZoom.value);
    constrainCropPosition();
    renderCropPreview();
  });

  cropImageEl.addEventListener("mousedown", (event) => {
    cropState.dragging = true;
    cropState.dragStartX = event.clientX;
    cropState.dragStartY = event.clientY;
    cropImageEl.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (event) => {
    if (!cropState.dragging) return;
    const dx = event.clientX - cropState.dragStartX;
    const dy = event.clientY - cropState.dragStartY;
    cropState.dragStartX = event.clientX;
    cropState.dragStartY = event.clientY;
    cropState.x += dx;
    cropState.y += dy;
    constrainCropPosition();
    renderCropPreview();
  });

  window.addEventListener("mouseup", () => {
    cropState.dragging = false;
    cropImageEl.style.cursor = "grab";
  });

  cancelCrop.addEventListener("click", closeCropDialog);
  applyCrop.addEventListener("click", applyCropResult);
}

function hydrate() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    state.accounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
    state.posts = Array.isArray(parsed.posts) ? parsed.posts : [];
    state.dms = Array.isArray(parsed.dms) ? parsed.dms : [];
    state.follows = Array.isArray(parsed.follows) ? parsed.follows : [];
    state.activeAccountId = parsed.activeAccountId || null;
    state.viewMode = ["feed", "explore", "profile", "reels", "dm"].includes(parsed.viewMode) ? parsed.viewMode : "feed";
    state.profileViewingId = parsed.profileViewingId || null;
    state.searchQuery = typeof parsed.searchQuery === "string" ? parsed.searchQuery : "";
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    accounts: state.accounts,
    posts: state.posts,
    dms: state.dms,
    follows: state.follows,
    activeAccountId: state.activeAccountId,
    viewMode: state.viewMode,
    profileViewingId: state.profileViewingId,
    searchQuery: state.searchQuery,
  }));
}

function ensureActiveAccount() {
  if (!state.activeAccountId && state.accounts.length) state.activeAccountId = state.accounts[0].id;
  if (!state.profileViewingId) state.profileViewingId = state.activeAccountId;
}

function setViewMode(mode) {
  state.viewMode = mode;
  if (mode === "reels") state.currentReelIndex = 0;
  if (mode === "profile" && !state.profileViewingId) state.profileViewingId = state.activeAccountId;
  persist();
  renderAll();
}

function openProfile(accountId) {
  if (!accountId) return;
  state.profileViewingId = accountId;
  state.viewMode = "profile";
  persist();
  renderAll();
}

async function handleCreateAccount(event) {
  event.preventDefault();
  const data = new FormData(accountForm);
  const username = String(data.get("username") || "").trim().toLowerCase();
  if (!username) return;
  if (state.accounts.some((item) => item.username === username)) return alert("That username already exists.");

  state.accounts.unshift({
    id: crypto.randomUUID(),
    username,
    avatarDataUrl: cropState.target === "avatar" ? cropState.tempResult : null,
    createdAt: Date.now(),
  });

  cropState.tempResult = null;
  state.activeAccountId = state.accounts[0].id;
  state.profileViewingId = state.activeAccountId;
  state.viewMode = "profile";

  accountForm.reset();
  persist();
  renderAll();
}

function setActiveAccount(accountId) {
  state.activeAccountId = accountId;
  if (!state.profileViewingId) state.profileViewingId = accountId;
  persist();
  renderAll();
}

async function handleCreatePost(event) {
  event.preventDefault();
  if (!state.activeAccountId) return alert("Create/select an account first.");

  const data = new FormData(postForm);
  const caption = String(data.get("caption") || "").trim();

  if (!cropState.tempResult || cropState.target !== "post") {
    return alert("Choose an image and apply crop first.");
  }

  state.posts.unshift({
    id: crypto.randomUUID(),
    accountId: state.activeAccountId,
    imageDataUrl: cropState.tempResult,
    caption,
    comments: [],
    likes: [],
    createdAt: Date.now(),
  });

  cropState.tempResult = null;
  postForm.reset();
  persist();
  renderAll();
}

function handleAddComment(event) {
  event.preventDefault();
  if (!state.selectedPostId) return;
  const input = document.getElementById("comment-input");
  const text = input.value.trim();
  if (!text) return;

  const post = state.posts.find((item) => item.id === state.selectedPostId);
  if (!post) return;
  post.comments.push({ id: crypto.randomUUID(), fromId: state.activeAccountId, text, likes: [], createdAt: Date.now() });

  input.value = "";
  persist();
  renderPostModal(post);
  renderFeed();
}

function handleSendDm(event) {
  event.preventDefault();
  const fromId = dmFrom.value;
  const toId = dmTo.value;
  const textInput = document.getElementById("dm-text");
  const text = textInput.value.trim();
  if (!fromId || !toId || fromId === toId || !text) return;

  state.dms.push({ id: crypto.randomUUID(), fromId, toId, text, createdAt: Date.now() });
  textInput.value = "";
  persist();
  renderDmThread();
}

function clearData() {
  if (!confirm("Delete all local app data?")) return;
  state.accounts = [];
  state.posts = [];
  state.dms = [];
  state.follows = [];
  state.activeAccountId = null;
  state.profileViewingId = null;
  state.viewMode = "feed";
  state.searchQuery = "";
  state.currentReelIndex = 0;
  state.selectedPostId = null;
  localStorage.removeItem(STORAGE_KEY);
  renderAll();
  closeModal();
}

function renderAll() {
  searchInput.value = state.searchQuery;
  renderNav();
  renderModeSections();
  renderAccounts();
  renderSearchResults();
  renderDmSelectors();
  renderDmThread();
  renderProfileHeader();
  renderFeed();
  renderReels();
}

function renderModeSections() {
  const isDm = state.viewMode === "dm";
  dmPanel.classList.toggle("hidden", !isDm);
  composeCard.classList.toggle("hidden", isDm);
  profileHeader.classList.toggle("hidden", isDm || state.viewMode !== "profile");
  feedEl.classList.toggle("hidden", isDm || state.viewMode === "reels");
}

function renderNav() {
  viewFeedButton.classList.toggle("active", state.viewMode === "feed");
  viewExploreButton.classList.toggle("active", state.viewMode === "explore");
  viewProfileButton.classList.toggle("active", state.viewMode === "profile");
  viewReelsButton.classList.toggle("active", state.viewMode === "reels");
  viewDmButton.classList.toggle("active", state.viewMode === "dm");

  if (state.viewMode === "profile") {
    const viewing = getViewingAccount();
    viewTitleEl.textContent = viewing ? `@${viewing.username}` : "Profile";
  } else if (state.viewMode === "explore") viewTitleEl.textContent = "Explore";
  else if (state.viewMode === "reels") viewTitleEl.textContent = "Reels";
  else if (state.viewMode === "dm") viewTitleEl.textContent = "Messages";
  else viewTitleEl.textContent = "Home feed";
}

function renderAccounts() {
  accountList.innerHTML = "";
  for (const account of state.accounts) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = account.id === state.activeAccountId ? "active" : "";
    button.addEventListener("click", () => setActiveAccount(account.id));

    const left = document.createElement("div");
    left.className = "user-line";
    left.innerHTML = `<img class="avatar" src="${getAvatar(account)}" alt="avatar" /><span>@${escapeHtml(account.username)}</span>`;

    const badge = document.createElement("span");
    badge.className = "muted small";
    badge.textContent = account.id === state.activeAccountId ? "Active" : "";

    button.append(left, badge);
    li.append(button);
    accountList.append(li);
  }

  const active = getActiveAccount();
  activeAccountEl.textContent = active ? `Acting as @${active.username}` : "No active account";
}

function renderSearchResults() {
  searchResults.innerHTML = "";
  if (!state.searchQuery) {
    searchResults.classList.add("hidden");
    return;
  }

  searchResults.classList.remove("hidden");
  const accounts = state.accounts.filter((account) => account.username.toLowerCase().includes(state.searchQuery));

  const title = document.createElement("h3");
  title.className = "search-title";
  title.textContent = `Account results (${accounts.length})`;
  searchResults.append(title);

  for (const account of accounts) {
    const row = document.createElement("div");
    row.className = "search-account";

    const left = document.createElement("button");
    left.type = "button";
    left.className = "user-trigger-text";
    left.innerHTML = `<div class="user-line"><img class="avatar" src="${getAvatar(account)}" alt="avatar"/><span>@${escapeHtml(account.username)}</span></div>`;
    left.addEventListener("click", () => openProfile(account.id));

    const followBtn = document.createElement("button");
    followBtn.type = "button";
    followBtn.textContent = isFollowingActive(account.id) ? "Following" : "Follow";
    followBtn.disabled = account.id === state.activeAccountId;
    followBtn.addEventListener("click", () => {
      toggleFollow(account.id);
      renderSearchResults();
    });

    row.append(left, followBtn);
    searchResults.append(row);
  }
}

function renderDmSelectors() {
  const options = state.accounts.map((account) => `<option value="${account.id}">@${escapeHtml(account.username)}</option>`).join("");
  const fromCurrent = dmFrom.value;
  const toCurrent = dmTo.value;
  dmFrom.innerHTML = `<option value="">From</option>${options}`;
  dmTo.innerHTML = `<option value="">To</option>${options}`;
  if (state.accounts.length >= 2) {
    dmFrom.value = hasAccount(fromCurrent) ? fromCurrent : state.accounts[0].id;
    dmTo.value = hasAccount(toCurrent) ? toCurrent : state.accounts[1].id;
  }
}

function hasAccount(accountId) {
  return state.accounts.some((account) => account.id === accountId);
}

function renderDmThread() {
  dmThread.innerHTML = "";
  const fromId = dmFrom.value;
  const toId = dmTo.value;
  if (!fromId || !toId || fromId === toId) {
    dmThread.innerHTML = '<p class="muted small">Select two different accounts.</p>';
    return;
  }

  const messages = state.dms.filter((dm) => (dm.fromId === fromId && dm.toId === toId) || (dm.fromId === toId && dm.toId === fromId));
  for (const dm of messages) {
    const sender = state.accounts.find((acc) => acc.id === dm.fromId);
    const node = document.createElement("div");
    node.className = `dm-msg ${dm.fromId === fromId ? "self" : "other"}`;
    node.innerHTML = `<strong>${sender ? `@${escapeHtml(sender.username)}` : "@deleted"}</strong><br>${escapeHtml(dm.text)}`;
    dmThread.append(node);
  }
}

function renderProfileHeader() {
  if (state.viewMode !== "profile") return;
  const account = getViewingAccount();
  if (!account) {
    profileHeader.innerHTML = '<p class="empty">No profile selected.</p>';
    return;
  }

  const postsCount = state.posts.filter((post) => post.accountId === account.id).length;
  const followers = state.follows.filter((f) => f.followingId === account.id).length;
  const following = state.follows.filter((f) => f.followerId === account.id).length;

  profileHeader.innerHTML = `
    <div class="profile-avatar-wrap"><img class="profile-avatar" src="${getAvatar(account)}" alt="avatar" /></div>
    <div>
      <h2>@${escapeHtml(account.username)}</h2>
      <div class="profile-stats"><span><strong>${postsCount}</strong> posts</span><span><strong>${followers}</strong> followers</span><span><strong>${following}</strong> following</span></div>
      <button id="follow-btn" type="button">${isFollowingActive(account.id) ? "Following" : "Follow"}</button>
      <div class="follow-lists small"><div><strong>Followers:</strong> ${renderFollowNames(account.id, "followers") || '<span class="muted">none</span>'}</div><div><strong>Following:</strong> ${renderFollowNames(account.id, "following") || '<span class="muted">none</span>'}</div></div>
    </div>
  `;

  const followBtn = document.getElementById("follow-btn");
  if (followBtn) {
    followBtn.disabled = account.id === state.activeAccountId;
    followBtn.addEventListener("click", () => {
      toggleFollow(account.id);
      renderProfileHeader();
      renderSearchResults();
    });
  }

  profileHeader.querySelectorAll("[data-open-profile]").forEach((node) => {
    node.addEventListener("click", () => openProfile(node.getAttribute("data-open-profile")));
  });
}

function renderFollowNames(accountId, mode) {
  const ids = mode === "followers"
    ? state.follows.filter((f) => f.followingId === accountId).map((f) => f.followerId)
    : state.follows.filter((f) => f.followerId === accountId).map((f) => f.followingId);

  return ids
    .map((id) => state.accounts.find((account) => account.id === id))
    .filter(Boolean)
    .map((account) => `<button type="button" class="follow-chip" data-open-profile="${account.id}">@${escapeHtml(account.username)}</button>`)
    .join("");
}

function renderFeed() {
  feedEl.innerHTML = "";
  feedEl.classList.toggle("explore", state.viewMode === "explore");

  if (state.viewMode === "reels" || state.viewMode === "dm") return;

  const posts = getVisiblePosts();
  if (!posts.length) {
    feedEl.append(createEmptyMessage());
    return;
  }

  if (state.viewMode === "explore") {
    posts.forEach((post, index) => {
      const tile = document.createElement("article");
      tile.className = `explore-tile ${index % 7 === 2 ? "tall" : ""} ${index % 11 === 4 ? "wide" : ""}`;
      tile.innerHTML = `<img src="${post.imageDataUrl}" alt="Explore post" />`;
      tile.addEventListener("click", () => openPost(post.id));
      feedEl.append(tile);
    });
    return;
  }

  for (const post of posts) {
    if (!Array.isArray(post.likes)) post.likes = [];
    const account = state.accounts.find((item) => item.id === post.accountId);
    const node = postTemplate.content.firstElementChild.cloneNode(true);

    const avatarButton = node.querySelector(".user-trigger");
    const userButton = node.querySelector(".post-user");
    avatarButton.querySelector(".avatar").src = getAvatar(account);
    userButton.textContent = account ? `@${account.username}` : "@deleted";

    avatarButton.addEventListener("click", () => openProfile(account?.id));
    userButton.addEventListener("click", () => openProfile(account?.id));

    node.querySelector(".post-time").textContent = formatDate(post.createdAt);
    const image = node.querySelector(".post-image");
    image.src = post.imageDataUrl;
    image.addEventListener("click", () => openPost(post.id));

    node.querySelector(".post-caption").textContent = post.caption;
    node.querySelector(".post-likes-count").textContent = `${post.likes.length} likes`;
    node.querySelector(".post-comments-count").textContent = `${post.comments.length} comments`;

    const likeButton = node.querySelector(".like-btn");
    likeButton.classList.toggle("liked", isLikedByActive(post.likes));
    likeButton.textContent = isLikedByActive(post.likes) ? "♥ Liked" : "♡ Like";
    likeButton.addEventListener("click", () => toggleLike(post.id));

    node.querySelector(".comment-btn").addEventListener("click", () => openPost(post.id));

    feedEl.append(node);
  }
}

function renderReels() {
  const on = state.viewMode === "reels";
  reelsOverlay.classList.toggle("hidden", !on);
  if (!on) return;

  if (!state.posts.length) {
    reelStage.innerHTML = '<p class="empty">No reels yet.</p>';
    return;
  }

  if (state.currentReelIndex >= state.posts.length) state.currentReelIndex = 0;
  const post = state.posts[state.currentReelIndex];
  const account = state.accounts.find((item) => item.id === post.accountId);

  reelStage.innerHTML = `<img src="${post.imageDataUrl}" alt="Reel image" id="reel-image" /><div class="reel-meta"><div class="user-line"><img class="avatar" src="${getAvatar(account)}" alt="avatar" /><strong>@${escapeHtml(account?.username || "deleted")}</strong></div><p>${escapeHtml(post.caption || "")}</p></div>`;
  const reelImage = document.getElementById("reel-image");
  if (reelImage) reelImage.addEventListener("click", () => openPost(post.id));
}

function nextReel() {
  if (!state.posts.length) return;
  state.currentReelIndex = (state.currentReelIndex + 1) % state.posts.length;
  renderReels();
}

function toggleLike(postId) {
  const post = state.posts.find((item) => item.id === postId);
  if (!post || !state.activeAccountId) return;
  if (!Array.isArray(post.likes)) post.likes = [];

  const index = post.likes.indexOf(state.activeAccountId);
  if (index === -1) post.likes.push(state.activeAccountId);
  else post.likes.splice(index, 1);

  persist();
  renderFeed();
}

function toggleCommentLike(postId, commentId) {
  const post = state.posts.find((item) => item.id === postId);
  if (!post || !state.activeAccountId) return;
  const comment = post.comments.find((item) => item.id === commentId);
  if (!comment) return;
  if (!Array.isArray(comment.likes)) comment.likes = [];

  const index = comment.likes.indexOf(state.activeAccountId);
  if (index === -1) comment.likes.push(state.activeAccountId);
  else comment.likes.splice(index, 1);

  persist();
  renderPostModal(post);
  renderFeed();
}

function isLikedByActive(list) {
  return Boolean(state.activeAccountId && Array.isArray(list) && list.includes(state.activeAccountId));
}

function toggleFollow(targetId) {
  if (!state.activeAccountId || !targetId || targetId === state.activeAccountId) return;
  const index = state.follows.findIndex((item) => item.followerId === state.activeAccountId && item.followingId === targetId);
  if (index === -1) state.follows.push({ followerId: state.activeAccountId, followingId: targetId });
  else state.follows.splice(index, 1);
  persist();
}

function isFollowingActive(targetId) {
  if (!state.activeAccountId || targetId === state.activeAccountId) return false;
  return state.follows.some((item) => item.followerId === state.activeAccountId && item.followingId === targetId);
}

function openPost(postId) {
  const post = state.posts.find((item) => item.id === postId);
  if (!post) return;
  state.selectedPostId = post.id;
  renderPostModal(post);
  if (!postModal.open) postModal.showModal();
}

function renderPostModal(post) {
  const account = state.accounts.find((item) => item.id === post.accountId);
  modalImage.src = post.imageDataUrl;
  modalAvatar.src = getAvatar(account);
  modalUser.textContent = account ? `@${account.username}` : "@deleted";
  modalCaption.textContent = post.caption;
  modalTime.textContent = formatDate(post.createdAt);

  modalUserTrigger.onclick = () => openProfile(account?.id);
  modalUser.onclick = () => openProfile(account?.id);

  modalComments.innerHTML = "";
  if (!post.comments.length) {
    modalComments.innerHTML = '<li class="muted small">No comments yet.</li>';
    return;
  }

  post.comments.forEach((comment) => {
    if (!Array.isArray(comment.likes)) comment.likes = [];
    const author = state.accounts.find((item) => item.id === comment.fromId);

    const li = document.createElement("li");
    li.className = "comment-item";
    li.innerHTML = `
      <div class="comment-top">
        <button type="button" class="user-trigger-text comment-user">@${escapeHtml(author?.username || "deleted")}</button>
        <button type="button" class="action-btn comment-like">${isLikedByActive(comment.likes) ? "♥" : "♡"} ${comment.likes.length}</button>
      </div>
      <p>${escapeHtml(comment.text)}</p>
    `;

    li.querySelector(".comment-user").addEventListener("click", () => openProfile(author?.id));
    li.querySelector(".comment-like").addEventListener("click", () => toggleCommentLike(post.id, comment.id));

    modalComments.append(li);
  });
}

function closeModal() {
  if (postModal.open) postModal.close();
  state.selectedPostId = null;
}

function getVisiblePosts() {
  let posts = state.posts;
  if (state.viewMode === "profile") {
    posts = state.posts.filter((post) => post.accountId === state.profileViewingId);
  } else if (state.viewMode === "explore") {
    posts = state.posts.filter((post) => post.accountId !== state.activeAccountId);
    if (!posts.length) posts = state.posts;
  }

  if (!state.searchQuery) return posts;
  return posts.filter((post) => {
    const account = state.accounts.find((item) => item.id === post.accountId);
    return (account?.username || "").toLowerCase().includes(state.searchQuery) || (post.caption || "").toLowerCase().includes(state.searchQuery);
  });
}

function getActiveAccount() {
  return state.accounts.find((item) => item.id === state.activeAccountId) || null;
}

function getViewingAccount() {
  return state.accounts.find((item) => item.id === state.profileViewingId) || null;
}

function getAvatar(account) {
  if (account?.avatarDataUrl) return account.avatarDataUrl;
  const initial = (account?.username || "U").slice(0, 1).toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='%23262626'/><text x='50%' y='56%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='34' font-family='Arial'>${initial}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createEmptyMessage() {
  const p = document.createElement("p");
  p.className = "empty";
  p.textContent = "No posts match this view yet.";
  return p;
}

function formatDate(unixTime) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(unixTime);
}

function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function startCrop(target) {
  const input = target === "avatar" ? avatarInput : postInput;
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("Please select an image file.");
    input.value = "";
    return;
  }

  cropState.target = target;
  cropState.file = file;
  cropState.image = await loadImage(await fileToDataUrl(file));
  cropState.outputSize = target === "avatar" ? AVATAR_SIZE : POST_SIZE;
  cropState.zoom = 1;
  cropState.x = 0;
  cropState.y = 0;
  cropState.tempResult = null;

  cropTitle.textContent = target === "avatar" ? "Crop profile picture" : "Crop post image";
  cropZoom.value = "1";

  const vw = cropViewport.clientWidth;
  const vh = cropViewport.clientHeight;
  cropState.baseScale = Math.max(vw / cropState.image.width, vh / cropState.image.height);

  renderCropPreview();
  cropDialog.showModal();
}

function renderCropPreview() {
  if (!cropState.image) return;
  const scale = cropState.baseScale * cropState.zoom;
  cropImageEl.src = cropState.image.src;
  cropImageEl.style.width = `${cropState.image.width * scale}px`;
  cropImageEl.style.height = `${cropState.image.height * scale}px`;
  cropImageEl.style.transform = `translate(-50%, -50%) translate(${cropState.x}px, ${cropState.y}px)`;
}

function constrainCropPosition() {
  if (!cropState.image) return;
  const vw = cropViewport.clientWidth;
  const vh = cropViewport.clientHeight;
  const scale = cropState.baseScale * cropState.zoom;
  const sw = cropState.image.width * scale;
  const sh = cropState.image.height * scale;
  const maxX = Math.max(0, (sw - vw) / 2);
  const maxY = Math.max(0, (sh - vh) / 2);
  cropState.x = Math.max(-maxX, Math.min(maxX, cropState.x));
  cropState.y = Math.max(-maxY, Math.min(maxY, cropState.y));
}

function closeCropDialog() {
  cropDialog.close();
}

function applyCropResult() {
  if (!cropState.image) return;

  const vw = cropViewport.clientWidth;
  const vh = cropViewport.clientHeight;
  const scale = cropState.baseScale * cropState.zoom;

  const sourceX = ((0 - vw / 2 - cropState.x) / scale) + cropState.image.width / 2;
  const sourceY = ((0 - vh / 2 - cropState.y) / scale) + cropState.image.height / 2;
  const sourceSide = vw / scale;

  const canvas = document.createElement("canvas");
  canvas.width = cropState.outputSize;
  canvas.height = cropState.outputSize;
  const context = canvas.getContext("2d");
  if (!context) return;

  context.drawImage(cropState.image, sourceX, sourceY, sourceSide, sourceSide, 0, 0, cropState.outputSize, cropState.outputSize);
  cropState.tempResult = canvas.toDataURL("image/jpeg", 0.92);

  closeCropDialog();
  alert(`${cropState.target === "avatar" ? "Profile picture" : "Post image"} crop applied.`);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
