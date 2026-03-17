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
  height: 100vh;
  background: #2f2f2f;
  color: white;
  font-family: Arial, sans-serif;
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
  margin-bottom: 30px;
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

@media (max-width: 600px) {
  .teacher {
    padding: 15px 10px;
    overflow-y: auto;
  }
  .header {
    gap: 12px;
    margin-bottom: 20px;
  }
  .header h1 {
    font-size: 22px;
  }
  .back-btn {
    padding: 8px 14px;
    font-size: 16px;
  }
  .new-btn {
    font-size: 16px;
    padding: 12px;
  }
  .lesson-row {
    padding: 12px 14px;
    font-size: 16px;
  }
}
</style>
