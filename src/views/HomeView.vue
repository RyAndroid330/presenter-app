<template>
  <!-- Mac Dark Mode meets Spotify styling -->
  <div class="home-layout">
    <aside class="sidebar" :class="{ expanded: sidebarHover }" @mouseenter="sidebarHover = true" @mouseleave="sidebarHover = false">
      <div class="sidebar-buttons">
        <button @click="restrictedNav('/presenter')">
          <span class="icon material-icons">slideshow</span>
          <span class="label">Slides</span>
        </button>
        <button @click="restrictedNav('/teacher')">
          <span class="icon material-icons">school</span>
          <span class="label">Teacher</span>
        </button>
        <button @click="restrictedNav('/musician')">
          <span class="icon material-icons">piano</span>
          <span class="label">Musician</span>
        </button>
        <button @click="openViewerDialog">
          <span class="icon material-icons">visibility</span>
          <span class="label">Viewer</span>
        </button>
      </div>
    </aside>
    <main class="main-content">
      <h1>Welcome to StudyLink</h1>
      <p class="welcome-msg">Your meeting, on every screen.</p>
      <div class="meetings-card">
        <h2>Active Meetings</h2>
        <ul class="meetings-list">
          <li v-for="m in meetings" :key="m.id" class="meeting-row">
            <span class="meeting-name">{{ m.name }}</span>
            <button class="join-btn" @click="joinMeetingDirect(m.name)">Join</button>
          </li>
          <li v-if="!meetings.length" class="no-meetings">No active meetings.</li>
        </ul>
      </div>
    </main>

    <dialog ref="dialogRef">
      <h2>Select Meeting</h2>
      <select v-model="selectedMeeting">
        <option v-for="m in meetings" :key="m.id" :value="m.name">{{ m.name }}</option>
      </select>
      <br><br>
      <button @click="joinMeeting">Join</button>
      <button @click="closeDialog">Cancel</button>
    </dialog>

    <dialog ref="loginDialog">
      <h2>Login Required</h2>
      <p>You must be logged in to access this section.</p>
      <button @click="login">Login with Google</button>
      <button @click="closeLoginDialog">Cancel</button>
    </dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const dialogRef = ref(null)
const loginDialog = ref(null)
const meetings = ref([])
const selectedMeeting = ref('')
const sidebarHover = ref(false)
const user = ref(null)
let pollInterval = null

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

async function loadMeetings() {
  try {
    const res = await fetch('/api/meetings')
    const data = await res.json()
    meetings.value = data
    const current = selectedMeeting.value
    if (data.find(m => m.name === current)) {
      selectedMeeting.value = current
    } else if (data.length) {
      selectedMeeting.value = data[0].name
    }
  } catch (e) {
    console.error('Failed to load meetings', e)
  }
}

function restrictedNav(path) {
  if (!user.value) {
    loginDialog.value.showModal()
    return
  }
  router.push(path)
}

function openViewerDialog() {
  dialogRef.value.showModal()
  loadMeetings()
  pollInterval = setInterval(loadMeetings, 1000)
}

function closeDialog() {
  dialogRef.value.close()
  clearInterval(pollInterval)
}
 function joinMeetingDirect(meetingName) {
      if (!meetingName) return
      router.push({ path: '/viewer', query: { meet: meetingName } })
    }
function joinMeeting() {
  if (!selectedMeeting.value) return
  closeDialog()
  router.push({ path: '/viewer', query: { meet: selectedMeeting.value } })
}

function login() {
  window.location.href = '/auth/google'
}

function closeLoginDialog() {
  loginDialog.value.close()
}

onMounted(() => {
  fetchUser()
  loadMeetings()
})

onUnmounted(() => {
  clearInterval(pollInterval)
})
</script>

<style scoped>
.home-layout {
  display: flex;
  min-height: 100vh;
  background: #181818;
}
.sidebar {
  width: 64px;
  background: #232323;
  color: #fff;
  transition: width 0.2s;
  box-shadow: 2px 0 8px rgba(0,0,0,0.15);
  padding-top: 2em;
  min-width: 56px;
}
.sidebar.expanded {
  width: 200px;
}
.sidebar-buttons {
  display: flex;
  flex-direction: column;
  gap: 1em;
}
.sidebar button {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: inherit;
  font-size: 1.1em;
  padding: 0.7em 1em;
  border-radius: 16px;
  cursor: pointer;
  transition: background 0.2s;
}
.sidebar button:hover {
  background: var(--accent-color);
  color: var(--accent-color-hover);
}
.icon {
  margin-right: 0.7em;
  font-size: 1.5em;
}
.label {
  font-weight: 500;
}
.main-content {
  flex: 1;
  padding: 2em 3em;
  min-width: 0;
}
h1 {
  font-size: 2.2em;
  font-weight: 700;
  margin-bottom: 0.5em;
}
.welcome-msg {
  font-size: 1.2em;
  color: #b3b3b3;
  margin-bottom: 2em;
}
.meetings-card {
  background: #232323;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  padding: 1.5em;
  margin-top: 1em;
  max-width: 100vw;
  box-sizing: border-box;
}
.meetings-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.meeting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7em 0;
  border-bottom: 1px solid #333;
}
.meeting-name {
  font-weight: 500;
}
.join-btn {
  background: var(--accent-color);
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 0.4em 1.2em;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.join-btn:hover {
  background: var(--accent-color-hover);
}
.no-meetings {
  color: #b3b3b3;
  text-align: center;
  padding: 1em 0;
}
dialog {
  background: #232323;
  color: #fff;
  border-radius: 16px;
  padding: 2em;
  border: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  max-width: 95vw;
  box-sizing: border-box;
}
select, button {
  font-size: 1em;
}

@media (max-width: 900px) {
  .main-content {
    padding: 1.2em 0.7em;
  }
  .sidebar {
    width: 48px;
  }
  .sidebar.expanded {
    width: 120px;
  }
}

@media (max-width: 600px) {
  .home-layout {
    flex-direction: column;
    min-height: 100vh;
  }
  .sidebar {
    width: 100vw;
    min-width: 0;
    height: auto;
    flex-direction: row;
    box-shadow: none;
    padding-top: 0.5em;
    padding-bottom: 0.5em;
    position: static;
    z-index: 1;
  }
  .sidebar.expanded {
    width: 100vw;
  }
  .sidebar-buttons {
    flex-direction: row;
    gap: 0.5em;
    padding: 0.5em 0.2em;
    align-items: center;
    justify-content: center;
  }
  .sidebar button {
    font-size: 1em;
    padding: 0.5em 0.7em;
    border-radius: 10px;
  }
  .main-content {
    padding: 1em 0.3em;
  }
  .meetings-card {
    padding: 0.7em;
    border-radius: 10px;
  }
  h1 {
    font-size: 1.3em;
  }
}

@media (max-width: 400px) {
  .sidebar {
    width: 100vw;
    min-width: 0;
  }
  .sidebar.expanded {
    width: 100vw;
  }
  .main-content {
    padding: 0.5em 0.1em;
  }
  .meetings-card {
    padding: 0.4em;
    border-radius: 7px;
  }
}
</style>

// ...existing code...
<style scoped>
.home-layout {
  display: flex;
  height: 100vh;
  background: #2f2f2f;
  color: white;
  font-family: Arial, sans-serif;
}

.sidebar {
  width: 56px;
  background: #232323;
  transition: width 0.2s cubic-bezier(.4,0,.2,1);
  overflow: hidden;
  position: relative;
  z-index: 2;
  box-shadow: 2px 0 8px rgba(0,0,0,0.08);
}
.sidebar.expanded {
  width: 180px;
}
.sidebar-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 0;
  align-items: stretch;
}
.sidebar button {
  background: none;
  border: none;
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  width: 100%;
}
.sidebar button:hover {
  background: #444;
}

.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: #ccc;
  font-size: 26px;
  line-height: 1;
}
.join-btn {
  margin-left: 16px;
  padding: 6px 18px;
  border-radius: 8px;
  border: none;
  background: #444;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.15s;
}
.join-btn:hover {
  background: #666;
}
.meeting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.label {
  opacity: 0;
  transition: opacity 0.2s;
  white-space: nowrap;
}
.sidebar.expanded .label {
  opacity: 1;
}

.main-content {
  flex: 1;
  padding: 48px 32px 0 32px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.meetings-card {
  width: 25%;
  min-width: 220px;
  max-width: 400px;
  background: #232323;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.10);
  padding: 24px 20px 16px 20px;
  margin-top: 24px;
  margin-bottom: 32px;
}
.meetings-card h2 {
  margin-top: 0;
  margin-bottom: 18px;
  font-size: 22px;
  color: #fff;
}
.welcome-msg {
  margin-top: 0;
  margin-bottom: 32px;
  font-size: 18px;
  color: #ccc;
}
.meetings-list {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
  width: 100%;
}
.meetings-list li {
  padding: 10px 0;
  border-bottom: 1px solid #333;
  font-size: 18px;
}
.meeting-name {
  font-weight: bold;
}
.no-meetings {
  color: #888;
  font-style: italic;
}

dialog {
  background: #2f2f2f;
  border: 1px solid #555;
  border-radius: 12px;
  padding: 30px;
  color: white;
}
select {
  padding: 8px;
  border-radius: 8px;
  border: none;
  background: #444;
  color: white;
  font-size: 16px;
  width: 250px;
}
option {
  background: #444;
  color: white;
}
@media (max-width: 700px) {
  .main-content {
    padding: 24px 6vw 0 6vw;
  }
  .sidebar.expanded {
    width: 90vw;
    min-width: 120px;
  }
}
</style>
