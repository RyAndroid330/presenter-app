<template>
  <div class="app-root">
    <header class="app-header">
      <nav class="main-nav">
        <button @click="router.push('/')"             class="nav-btn" :class="{ active: route.path === '/' }">Home</button>
        <button @click="restrictedNav('/presenter')"  class="nav-btn" :class="{ active: route.path === '/presenter' }">Slides</button>
        <button @click="restrictedNav('/teacher')"    class="nav-btn" :class="{ active: route.path === '/teacher' }">Teacher</button>
        <button @click="restrictedNav('/musician')"   class="nav-btn" :class="{ active: route.path === '/musician' }">Musician</button>
        <button @click="openViewerDialog"             class="nav-btn" :class="{ active: route.path === '/viewer' }">Viewer</button>
      </nav>
      <div class="user-info">
        <template v-if="user">
          <img v-if="user.picture || user.photos"
               :src="user.picture || (user.photos && user.photos[0] && user.photos[0].value)"
               class="user-avatar hide-mobile" />
          <span class="user-name hide-mobile">{{
            user.displayName ||
            (user.name?.givenName ? (user.name.givenName + ' ' + (user.name.familyName || '')).trim() : null) ||
            (user.emails && user.emails[0] && user.emails[0].value) || 'User'
          }}</span>
          <button @click="logout" class="auth-btn">Logout</button>
        </template>
        <template v-else>
          <button @click="login" class="auth-btn">Login</button>
        </template>
      </div>
    </header>

    <div class="view-slot">
      <router-view />
    </div>

    <!-- Viewer meeting picker dialog -->
    <dialog ref="viewerDialogRef" class="viewer-dialog" @close="onDialogClose">
      <h2 class="dialog-title">Join a Meeting</h2>
      <div v-if="meetings.length" class="meeting-picker">
        <div
          v-for="m in meetings"
          :key="m.id"
          class="meeting-option"
          :class="{ selected: selectedMeeting === m.name }"
          @click="selectedMeeting = m.name"
        >
          <span class="meeting-option-name">{{ m.name }}</span>
          <span v-if="selectedMeeting === m.name" class="meeting-check">✓</span>
        </div>
      </div>
      <p v-else class="no-meetings">No active meetings right now.</p>
      <div class="dialog-actions">
        <button class="dialog-cancel" @click="viewerDialogRef.close()">Cancel</button>
        <button class="dialog-join" :disabled="!selectedMeeting" @click="joinMeeting">Join</button>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route  = useRoute()
const user   = ref(null)

function restrictedNav(path) {
  if (!user.value) { window.location.href = '/auth/google'; return }
  router.push(path)
}
function login()  { window.location.href = '/auth/google' }
function logout() { window.location.href = '/logout' }

async function fetchUser() {
  try {
    const res = await fetch('/api/user')
    user.value = res.ok ? (await res.json()).user : null
  } catch { user.value = null }
}

// ── Viewer dialog ──
const viewerDialogRef  = ref(null)
const meetings         = ref([])
const selectedMeeting  = ref('')
let pollInterval       = null

async function loadMeetings() {
  try {
    const res = await fetch('/api/meetings')
    meetings.value = await res.json()
    if (!meetings.value.find(m => m.name === selectedMeeting.value)) {
      selectedMeeting.value = meetings.value[0]?.name || ''
    }
  } catch (e) { console.error(e) }
}

function openViewerDialog() {
  selectedMeeting.value = ''
  loadMeetings()
  pollInterval = setInterval(loadMeetings, 2000)
  viewerDialogRef.value.showModal()
}

function onDialogClose() {
  clearInterval(pollInterval)
  pollInterval = null
}

function joinMeeting() {
  if (!selectedMeeting.value) return
  viewerDialogRef.value.close()
  router.push({ path: '/viewer', query: { meet: selectedMeeting.value } })
}

onMounted(fetchUser)
router.afterEach(fetchUser)
</script>

<style>
/* ── App shell ──
   theme.css owns: html, body, #app, :root tokens, scrollbar, resets.
   App.vue owns: the flex column shell, navbar, view slot, dialog.
*/

.app-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;   /* fills #app which theme.css sets to 100dvh */
  overflow: hidden;
}

/* Fixed-height navbar */
.app-header {
  flex-shrink: 0;
  height: var(--nav-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  z-index: 50;
}

/* Every view fills exactly the remaining height */
.view-slot {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── Navbar ── */
.main-nav { display: flex; gap: 2px; }

.nav-btn {
  position: relative;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.9em;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
  white-space: nowrap;
}
.nav-btn::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 12px;
  right: 12px;
  height: 2px;
  border-radius: 2px;
  background: var(--accent);
  transform: scaleX(0);
  transition: transform var(--transition);
}
.nav-btn:hover,
.nav-btn.active           { background: var(--accent-dim); color: var(--accent); }
.nav-btn:hover::after,
.nav-btn.active::after    { transform: scaleX(1); }

/* ── User info ── */
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}
.user-name {
  font-size: 0.85em;
  color: var(--text-muted);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.auth-btn {
  background: var(--bg-active);
  color: var(--text-primary);
  border: none;
  border-radius: var(--radius);
  padding: 5px 14px;
  font-size: 0.85em;
  cursor: pointer;
}
.auth-btn:hover { background: #555; }

@media (max-width: 600px) {
  .app-header { padding: 0 8px; }
  .nav-btn    { font-size: 0.78em; padding: 4px 7px; }
}

/* ── Viewer meeting picker dialog ── */
.viewer-dialog {
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 0;
  width: min(400px, 92vw);
  box-shadow: 0 12px 48px rgba(0,0,0,0.6);
  overflow: hidden;
}
.viewer-dialog::backdrop {
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(3px);
}
.dialog-title {
  margin: 0;
  padding: 20px 20px 16px;
  font-size: 17px;
  font-weight: 700;
  border-bottom: 1px solid var(--border);
}
.meeting-picker {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  max-height: 280px;
  overflow-y: auto;
}
.meeting-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: var(--radius-lg);
  cursor: pointer;
  font-size: 15px;
  background: var(--bg-hover);
  transition: background var(--transition);
}
.meeting-option:hover    { background: var(--bg-active); }
.meeting-option.selected { background: var(--accent-dim); color: var(--accent); }
.meeting-option-name     { font-weight: 500; }
.meeting-check           { font-size: 16px; color: var(--accent); }

.no-meetings {
  padding: 24px 20px;
  text-align: center;
  color: var(--text-faint);
  font-style: italic;
  font-size: 14px;
  margin: 0;
}
.dialog-actions {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid var(--border);
  justify-content: flex-end;
}
.dialog-cancel {
  padding: 8px 18px;
  border-radius: var(--radius);
  border: none;
  background: var(--bg-active);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}
.dialog-cancel:hover  { background: #555; }
.dialog-join {
  padding: 8px 22px;
  border-radius: var(--radius);
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.dialog-join:hover    { background: var(--accent-hover); }
.dialog-join:disabled { opacity: 0.35; cursor: default; }
</style>