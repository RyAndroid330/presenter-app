<template>
  <div class="teacher">
    <div class="header">
      <button class="back-btn" @click="$router.push('/')">&#x2190; Home</button>
      <h1>Lessons</h1>
    </div>

    <button class="new-btn" @click="createLesson">+ New Lesson</button>

    <div class="lesson-list">
      <div
        v-for="l in lessons"
        :key="l.id"
        class="lesson-row"
        @click="editLesson(l.id)"
      >
        <input
          v-if="renamingId === l.id"
          v-model="renameText"
          class="rename-input"
          @click.stop
          @keydown.enter="finishRename(l)"
          @keydown.escape="renamingId = null"
          @blur="finishRename(l)"
          ref="renameInput"
        />
        <span v-else @dblclick.stop="startRename(l)">{{ l.name }}</span>
        <button class="delete-btn" @click.stop="deleteLesson(l.id)">&#x2715;</button>
      </div>
      <div v-if="!lessons.length" class="empty">No lessons yet</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const lessons = ref([])
const renamingId = ref(null)
const renameText = ref('')
const renameInput = ref(null)

async function loadLessons() {
  try {
    const res = await fetch('/api/lessons')
    lessons.value = await res.json()
  } catch (e) { console.error(e) }
}

async function createLesson() {
  try {
    const res = await fetch('/api/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Untitled' })
    })
    const lesson = await res.json()
    router.push({ path: '/lesson-editor', query: { id: lesson.id } })
  } catch (e) { console.error(e) }
}

function editLesson(id) {
  router.push({ path: '/lesson-editor', query: { id } })
}

async function deleteLesson(id) {
  if (!confirm('Delete this lesson and its slides?')) return
  try {
    await fetch('/api/lessons/' + id, { method: 'DELETE' })
    await loadLessons()
  } catch (e) { console.error(e) }
}

async function startRename(l) {
  renamingId.value = l.id
  renameText.value = l.name
  await nextTick()
  if (renameInput.value) {
    const el = Array.isArray(renameInput.value) ? renameInput.value[0] : renameInput.value
    if (el) { el.focus(); el.select() }
  }
}

async function finishRename(l) {
  if (!renamingId.value) return
  const name = renameText.value.trim()
  renamingId.value = null
  if (!name || name === l.name) return
  try {
    await fetch('/api/lessons/' + l.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    l.name = name
  } catch (e) { console.error(e) }
}

onMounted(loadLessons)
</script>

<style scoped>
.teacher {
  min-height: 100vh;
  background: #181818;
  color: #e0e0e0;
  font-family: 'Inter', 'Segoe UI', 'Arial', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 20px;
  box-sizing: border-box;
}

.header {
  display: flex;
  align-items: center;
  gap: 20px;
}
.back-btn {
  background: none;
  color: var(--accent-color);
  border: none;
  font-size: 1.1em;
  cursor: pointer;
  border-radius: 16px;
  padding: 0.5em 1.2em;
  transition: background 0.2s, color 0.2s;
}
.back-btn:hover {
  background: var(--accent-color);
  color: #181818;
}
.new-btn {
  background: var(--accent-color);
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 0.5em 1.5em;
  font-weight: 600;
  cursor: pointer;
  margin: 1em 0;
  transition: background 0.2s;
}
.new-btn:hover {
  background: var(--accent-color-hover);
}
.lesson-list {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}
.lesson-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #232323;
  border-radius: 12px;
  padding: 0.7em 1em;
  margin-bottom: 0.7em;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.rename-input {
  background: #222;
  color: #e0e0e0;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 0.4em 0.8em;
}
.delete-btn {
  background: none;
  color: #e74c3c;
  border: none;
  font-size: 1.1em;
  cursor: pointer;
  border-radius: 8px;
  padding: 0.2em 0.7em;
  transition: background 0.2s, color 0.2s;
}
.delete-btn:hover {
  background: #e74c3c;
  color: #fff;
}
.empty {
  color: #b3b3b3;
  text-align: center;
  margin-top: 2em;
}

.header h1 {
  margin: 0;
  font-size: 28px;
}

.back-btn {
  padding: 8px 18px;
  border-radius: 10px;
  border: none;
  background: #444;
  color: white;
  font-size: 18px;
  cursor: pointer;
}
.back-btn:hover { background: #666; }

.new-btn {
  width: 400px;
  max-width: 90vw;
  padding: 14px;
  font-size: 18px;
  margin-bottom: 16px;
  border-radius: 12px;
  border: none;
  background: #3a5a3a;
  color: white;
  cursor: pointer;
}
.new-btn:hover { background: #4a7a4a; }

.lesson-list {
  width: 400px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lesson-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: #3a3a3a;
  border-radius: 10px;
  cursor: pointer;
  font-size: 18px;
}
.lesson-row:hover { background: #4a4a4a; }

.rename-input {
  flex: 1;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #666;
  background: #2a2a2a;
  color: white;
  font-size: 18px;
  outline: none;
}
.rename-input:focus { border-color: #888; }

.delete-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 16px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 6px;
}
.delete-btn:hover {
  color: #ff6666;
  background: rgba(255,100,100,0.15);
}

.empty {
  text-align: center;
  color: #777;
  font-size: 16px;
  padding: 20px;
}

@media (max-width: 900px) {
  .teacher {
    padding: 18px 8px;
  }
  .header h1 {
    font-size: 22px;
  }
  .lesson-list, .new-btn {
    width: 98vw;
    max-width: 98vw;
  }
}

@media (max-width: 600px) {
  .teacher {
    padding: 10px 2vw;
    overflow-y: auto;
  }
  .header {
    gap: 8px;
    margin-bottom: 14px;
  }
  .header h1 {
    font-size: 18px;
  }
  .back-btn {
    padding: 7px 10px;
    font-size: 14px;
  }
  .new-btn {
    font-size: 14px;
    padding: 10px;
    width: 96vw;
    max-width: 96vw;
  }
  .lesson-list {
    width: 96vw;
    max-width: 96vw;
  }
  .lesson-row {
    padding: 10px 8px;
    font-size: 14px;
  }
}

@media (max-width: 400px) {
  .teacher {
    padding: 4px 1vw;
  }
  .header h1 {
    font-size: 15px;
  }
  .new-btn {
    font-size: 12px;
    padding: 7px;
    width: 94vw;
    max-width: 94vw;
  }
  .lesson-list {
    width: 94vw;
    max-width: 94vw;
  }
  .lesson-row {
    padding: 7px 4px;
    font-size: 12px;
  }
}
</style>
