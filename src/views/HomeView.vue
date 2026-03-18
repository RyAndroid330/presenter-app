<template>
  <div class="home-layout">
    <main class="main-content">
      <div class="home-top">

        <div class="home-left">
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
        </div>

        <div class="home-right">
          <h2 class="how-title">How it works</h2>
          <p class="how-intro">
            Built for small gatherings — a home group, an extra room, anywhere without a projector.
            Everyone follows along on their own device.
          </p>
          <div class="role-cards">
            <div class="role-card">
              <span class="role-icon material-icons">menu_book</span>
              <h3>Teacher</h3>
              <p>Prepare a lesson as text slides and share it to the meeting for the presenter to step through during teaching.</p>
            </div>
            <div class="role-card">
              <span class="role-icon material-icons">music_note</span>
              <h3>Worship Leader</h3>
              <p>Build a worship session with songs in order. The presenter displays each verse and chorus as the congregation sings.</p>
            </div>
            <div class="role-card">
              <span class="role-icon material-icons">dashboard_customize</span>
              <h3>Presenter</h3>
              <p>Run slides live during the meeting. Load a session or lesson and tap to display each section. On the fly you can also set a countdown timer, look up a Bible verse, find a song, or type a custom slide.</p>
            </div>
            <div class="role-card">
              <span class="role-icon material-icons">tv</span>
              <h3>Viewer</h3>
              <p>Join and follow along in real time — lyrics, scripture, timers, announcements. No app needed. Musicians can tap the music button to see the full chord chart for the current song.</p>
            </div>
          </div>
        </div>

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
/* ---- Layout ---- */
.home-layout {
  min-height: 100%;
  color: #fff;
  font-family: Arial, sans-serif;
  overflow-y: auto;
  position: relative;
  /* Image anchored bottom-left */
  background: url('/Bible.jpg') no-repeat left bottom / cover;
  background-color: #181818;
}

/* Gradient: transparent bottom-left → dark top-right */
.home-layout::before {
  content: '';
  position: fixed;
  inset: 0;
  background: linear-gradient(
    to top right,
    rgba(18, 18, 18, 0.05) 0%,
    rgba(18, 18, 18, 0.55) 45%,
    rgba(18, 18, 18, 0.92) 75%,
    rgba(18, 18, 18, 0.99) 100%
  );
  pointer-events: none;
  z-index: 0;
}

/* All content sits above the overlay */
.main-content {
  position: relative;
  z-index: 1;
  padding: 2.5em 2.5em 3em;
}
.home-top {
  display: flex;
  gap: 2.5em;
  align-items: flex-start;
}

/* ---- Left column: title + meetings ---- */
.home-left {
  flex: 0 0 260px;
  min-width: 200px;
}
h1 {
  font-size: 2em;
  font-weight: 700;
  margin: 0 0 0.3em;
  color: #fff;
}
.welcome-msg {
  font-size: 1.05em;
  color: #b3b3b3;
  margin: 0 0 1.4em;
}
.meetings-card {
  background: rgba(30, 30, 30, 0.85);
  backdrop-filter: blur(6px);
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.35);
  padding: 1.2em 1.2em 0.6em;
}
.meetings-card h2 {
  font-size: 1.1em;
  font-weight: 700;
  margin: 0 0 0.9em;
  color: #fff;
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
  padding: 0.6em 0;
  border-bottom: 1px solid #333;
}
.meeting-row:last-child {
  border-bottom: none;
}
.meeting-name {
  font-size: 0.95em;
  font-weight: 500;
}
.join-btn {
  background: var(--accent-color, #4fc3f7);
  color: #181818;
  border: none;
  border-radius: 20px;
  padding: 0.3em 1em;
  font-weight: 700;
  font-size: 0.85em;
  cursor: pointer;
  transition: opacity 0.15s;
}
.join-btn:hover {
  opacity: 0.85;
}
.no-meetings {
  color: #666;
  font-style: italic;
  font-size: 0.9em;
  padding: 0.5em 0 0.8em;
}

/* ---- Right column: how it works ---- */
.home-right {
  flex: 1;
  min-width: 0;
}
.how-title {
  font-size: 1.3em;
  font-weight: 700;
  margin: 0 0 0.4em;
  color: #fff;
}
.how-intro {
  color: #b3b3b3;
  font-size: 0.95em;
  margin: 0 0 1.2em;
  line-height: 1.6;
}
.role-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1em;
}
.role-card {
  background: rgba(30, 30, 30, 0.80);
  backdrop-filter: blur(6px);
  border-radius: 14px;
  padding: 1.2em 1em 1em;
  display: flex;
  flex-direction: column;
  gap: 0.4em;
}
.role-icon {
  font-size: 1.8em;
  color: var(--accent-color, #4fc3f7);
}
.role-card h3 {
  font-size: 0.95em;
  font-weight: 700;
  margin: 0;
  color: #fff;
}
.role-card p {
  font-size: 0.85em;
  color: #b3b3b3;
  margin: 0;
  line-height: 1.55;
}

/* ---- Dialogs ---- */
dialog {
  background: #232323;
  color: #fff;
  border-radius: 14px;
  padding: 2em;
  border: none;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
}
select {
  padding: 8px;
  border-radius: 8px;
  border: none;
  background: #444;
  color: white;
  font-size: 15px;
  width: 250px;
}
option { background: #444; color: white; }

/* ---- Responsive ---- */
@media (max-width: 1100px) {
  .role-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 700px) {
  .home-top {
    flex-direction: column;
    gap: 1.5em;
  }
  .home-left {
    flex: none;
    width: 100%;
  }
  .role-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  .main-content {
    padding: 1.2em 1em 2em;
  }
}
@media (max-width: 480px) {
  .role-cards {
    grid-template-columns: 1fr;
  }
}
</style>