<template>
  <!-- Mac Dark Mode meets Spotify styling -->
  <div class="home-layout">
    <!-- Sidebar removed, navigation is now in the top navbar. -->
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

      <div class="how-it-works">
        <h2>How it works</h2>
        <p class="how-intro">
          StudyLink is built for small church gatherings — a home group, an extra room, anywhere
          you don't have a projector. Everyone uses their own device and the meeting comes to them.
        </p>

        <div class="role-cards">
          <div class="role-card">
            <span class="role-icon material-icons">menu_book</span>
            <h3>Teacher</h3>
            <p>Prepare a lesson as a series of text slides. Share it to the meeting when you're ready and the presenter can step through each slide during the teaching.</p>
          </div>

          <div class="role-card">
            <span class="role-icon material-icons">music_note</span>
            <h3>Worship Leader</h3>
            <p>Build a worship session by adding songs in order. Share it to the meeting so the presenter can display each verse and chorus as the congregation sings along.</p>
          </div>

          <div class="role-card">
            <span class="role-icon material-icons">dashboard_customize</span>
            <h3>Presenter</h3>
            <p>Run the slides live during the meeting. Load a worship session or lesson and tap each section to display it. On the fly you can also:</p>
            <ul class="role-list">
              <li><span class="material-icons list-icon">timer</span> Set a countdown — <em>"Meeting starts in 5:00"</em> or <em>"Break ends in 2:30"</em></li>
              <li><span class="material-icons list-icon">menu_book</span> Look up and display any Bible verse</li>
              <li><span class="material-icons list-icon">music_note</span> Find and present any song from the library</li>
              <li><span class="material-icons list-icon">add_circle</span> Type a custom text slide for anything unplanned</li>
            </ul>
          </div>

          <div class="role-card">
            <span class="role-icon material-icons">tv</span>
            <h3>Everyone else</h3>
            <p>Join the meeting as a viewer. Whatever the presenter displays appears on your screen in real time — lyrics, scripture, announcements, timers. No app to install, just open the link.</p>
            <p class="role-note"><span class="material-icons list-icon">piano</span> <strong>Musicians:</strong> tap the music button in the viewer to see the full chord chart for the current song.</p>
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
.home-layout {
  display: flex;
  min-height: 90vh;
  background: #181818;
}
.sidebar {
  width: 75px;
  background: #232323;
  color: #fff;
  transition: width 0.2s;
  box-shadow: 2px 0 8px rgba(0,0,0,0.15);
  padding-top: 2em;
}
.sidebar.expanded {
  width: 200px;
}
.sidebar-buttons {
  display: flex;
  flex-direction: column;
  gap: 1em;
  height: 100%;
  justify-content: center;
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

  @media (max-width: 900px) {
    .main-content {
      padding: 1.2em 0.7em;
    }
    .meetings-card {
      padding: 1em;
    }
  }

  @media (max-width: 600px) {
    .home-layout {
      flex-direction: column;
    }
    .sidebar {
      width: 100vw;
      min-width: 0;
      flex-direction: row;
      padding-top: 0.5em;
      box-shadow: none;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .sidebar.expanded {
      width: 100vw;
    }
    .sidebar-buttons {
      flex-direction: row;
      gap: 0.5em;
      justify-content: space-around;
    }
    .sidebar button {
      font-size: 1em;
      padding: 0.5em 0.7em;
      border-radius: 10px;
    }
    .icon {
      margin-right: 0.3em;
      font-size: 1.2em;
    }
    .main-content {
      padding: 1em 0.3em;
    }
    h1 {
      font-size: 1.3em;
    }
    .meetings-card {
      border-radius: 8px;
      padding: 0.7em;
    }
    .meeting-row {
      font-size: 0.98em;
      padding: 0.5em 0;
    }
  }
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

/* ---- How it works ---- */
.how-it-works {
  margin-top: 2.5em;
  max-width: 960px;
  padding-bottom: 3em;
}
.how-it-works h2 {
  font-size: 1.5em;
  font-weight: 700;
  margin-bottom: 0.5em;
  color: #fff;
}
.how-intro {
  color: #b3b3b3;
  font-size: 1.05em;
  margin-bottom: 1.8em;
  max-width: 680px;
  line-height: 1.6;
}
.role-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 1em;
}
.role-card {
  background: #232323;
  border-radius: 14px;
  padding: 1.4em 1.2em 1.2em;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}
.role-icon {
  font-size: 2em;
  color: var(--accent-color, #4fc3f7);
  margin-bottom: 0.1em;
}
.role-card h3 {
  font-size: 1.05em;
  font-weight: 700;
  margin: 0;
  color: #fff;
}
.role-card p {
  font-size: 0.92em;
  color: #b3b3b3;
  margin: 0;
  line-height: 1.55;
}
.role-list {
  list-style: none;
  padding: 0;
  margin: 0.3em 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.45em;
}
.role-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.4em;
  font-size: 0.88em;
  color: #b3b3b3;
  line-height: 1.4;
}
.list-icon {
  font-size: 1em !important;
  color: var(--accent-color, #4fc3f7);
  flex-shrink: 0;
  margin-top: 1px;
}
.role-note {
  margin-top: 0.6em !important;
  display: flex;
  align-items: flex-start;
  gap: 0.4em;
  font-size: 0.88em !important;
}

dialog {
  background: #232323;
  color: #fff;
  border-radius: 16px;
  padding: 2em;
  border: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
select, button {
  font-size: 1em;
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