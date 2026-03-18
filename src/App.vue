<template>
  <div>
    <header class="app-header">
      <nav class="main-nav">
        <button @click="router.push('/')" class="nav-btn" :class="{ active: route.path === '/' }">Home</button>
        <button @click="restrictedNav('/presenter')" class="nav-btn" :class="{ active: route.path === '/presenter' }">Slides</button>
        <button @click="restrictedNav('/teacher')" class="nav-btn" :class="{ active: route.path === '/teacher' }">Teacher</button>
        <button @click="restrictedNav('/musician')" class="nav-btn" :class="{ active: route.path === '/musician' }">Musician</button>
        <button @click="openViewerDialog" class="nav-btn" :class="{ active: route.path === '/viewer' }">Viewer</button>
      </nav>
      <div class="user-info">
        <template v-if="user">
          <img v-if="user.picture || user.photos" :src="user.picture || (user.photos && user.photos[0] && user.photos[0].value)" class="user-avatar" />
          <span>
            {{
              user.displayName ||
              user.name?.givenName + ' ' + user.name?.familyName ||
              user.name?.familyName ||
              user.name?.givenName ||
              user.email ||
              (user.emails && user.emails[0] && user.emails[0].value) ||
              'User'
            }}
          </span>
          <button @click="logout" class="logout-btn">Logout</button>
        </template>
        <template v-else>
          <button @click="login" class="login-btn">Login with Google</button>
        </template>
      </div>
    </header>
    <!-- Sidebar is now rendered directly in each view, not via slot. -->
    <router-view />

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
// Navigation logic for navbar
function restrictedNav(path) {
  if (!user.value) {
    window.location.href = '/auth/google'
    return
  }
  router.push(path)
}

import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
const user = ref(null)
const router = useRouter()
const route = useRoute()

// ── Viewer dialog ──
const viewerDialogRef = ref(null)
const meetings = ref([])
const selectedMeeting = ref('')
let pollInterval = null

async function loadMeetings() {
  try {
    const res = await fetch('/api/meetings')
    meetings.value = await res.json()
    // Auto-select first if nothing selected or previous selection gone
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

async function fetchUser() {
  try {
    const res = await fetch('/api/user')
    if (res.ok) {
      const data = await res.json()
      user.value = data.user
    } else {
      user.value = null
    }
  } catch {
    user.value = null
  }
}

function login() {
  window.location.href = '/auth/google'
}

function logout() {
  window.location.href = '/logout'
}

onMounted(fetchUser)

router.afterEach(() => {
  fetchUser()
})
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100dvw;
  height: 100dvh;
  overflow: hidden;
  background: #2f2f2f;
}

.app-header {
  width: 100%;
  background: #232323;
  color: #fff;
  padding: 8px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
}
.main-nav {
  display: flex;
  gap: 16px;
}
.nav-btn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 1em;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  font-weight: 500;
  position: relative;
}
.nav-btn::after {
  content: '';
  display: block;
  position: absolute;
  bottom: -2px;
  left: 14px;
  right: 14px;
  height: 2px;
  border-radius: 2px;
  background: var(--accent-color, #4fc3f7);
  transform: scaleX(0);
  transition: transform 0.15s;
}
.nav-btn:hover {
  background: rgba(79, 195, 247, 0.08);
  color: var(--accent-color, #4fc3f7);
}
.nav-btn:hover::after {
  transform: scaleX(1);
}
.nav-btn.active {
  color: var(--accent-color, #4fc3f7);
  background: rgba(79, 195, 247, 0.12);
}
.nav-btn.active::after {
  transform: scaleX(1);
}
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}
.login-btn, .logout-btn {
  background: #444;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 6px 16px;
  font-size: 16px;
  cursor: pointer;
}
.login-btn:hover, .logout-btn:hover {
  background: #666;
}

@media (max-width: 768px) {
  html, body, #app {
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }
  .app-header {
    padding: 8px 8px;
  }
}

/* ── Viewer meeting picker dialog ── */
.viewer-dialog {
  background: var(--bg-surface, #232323);
  color: var(--text-primary, #e0e0e0);
  border: 1px solid var(--border, #333);
  border-radius: 16px;
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
  border-bottom: 1px solid var(--border, #333);
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
  border-radius: 10px;
  cursor: pointer;
  font-size: 15px;
  transition: background 0.12s;
  background: var(--bg-hover, #3a3a3a);
}
.meeting-option:hover { background: var(--bg-active, #444); }
.meeting-option.selected {
  background: var(--accent-dim, rgba(29,185,84,0.12));
  color: var(--accent, #1db954);
}
.meeting-option-name { font-weight: 500; }
.meeting-check { font-size: 16px; color: var(--accent, #1db954); }

.no-meetings {
  padding: 24px 20px;
  text-align: center;
  color: var(--text-faint, #666);
  font-style: italic;
  font-size: 14px;
}
.dialog-actions {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid var(--border, #333);
  justify-content: flex-end;
}
.dialog-cancel {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  background: var(--bg-active, #444);
  color: var(--text-primary, #e0e0e0);
  font-size: 14px;
  cursor: pointer;
}
.dialog-cancel:hover { background: #555; }
.dialog-join {
  padding: 8px 22px;
  border-radius: 8px;
  border: none;
  background: var(--accent, #1db954);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}
.dialog-join:hover   { background: var(--accent-hover, #1ed760); }
.dialog-join:disabled { opacity: 0.35; cursor: default; }
</style>