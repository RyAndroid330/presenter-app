<template>
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
      <h1>Welcome to Presentation Control</h1>
      <p class="welcome-msg">Easily manage and join meetings for presentations, music, and lessons.</p>
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
