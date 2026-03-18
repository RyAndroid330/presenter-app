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
  height: 100%;
  overflow-y: auto;
  background: var(--bg-base);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 20px;
}

h1 { font-size: 1.8em; font-weight: 700; margin: 0 0 20px; }

.new-btn {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 8px 22px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 20px;
}
.new-btn:hover { background: var(--accent-hover); }

.lesson-list {
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lesson-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 12px 16px;
  cursor: pointer;
  font-size: 15px;
  transition: background var(--transition);
}
.lesson-row:hover { background: var(--bg-hover); }

.rename-input {
  flex: 1;
  padding: 4px 8px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 15px;
  outline: none;
}

.delete-btn {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
}
.delete-btn:hover { color: var(--danger); background: var(--danger-hover); }

.empty { color: var(--text-faint); font-style: italic; text-align: center; padding: 24px; }

@media (max-width: 600px) {
  .teacher { padding: 20px 12px; }
  h1 { font-size: 1.4em; }
}
</style>