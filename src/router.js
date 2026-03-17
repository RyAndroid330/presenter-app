import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import PresenterView from './views/PresenterView.vue'
import ViewerView from './views/ViewerView.vue'
import MusicianView from './views/MusicianView.vue'
import SongEditorView from './views/SongEditorView.vue'
import LessonEditorView from './views/LessonEditorView.vue'
import TeacherView from './views/TeacherView.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/presenter', component: PresenterView },
  { path: '/viewer', component: ViewerView },
  { path: '/musician', component: MusicianView },
  { path: '/song-editor', component: SongEditorView },
  { path: '/lesson-editor', component: LessonEditorView },
  { path: '/teacher', component: TeacherView }
]


const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard: require auth for all except / and /viewer
router.beforeEach(async (to, from, next) => {
  if (to.path === '/' || to.path === '/viewer') {
    return next()
  }
  // Check auth
  try {
    const res = await fetch('/api/user')
    if (res.ok) {
      const data = await res.json()
      if (data.user) return next()
    }
  } catch {}
  // Not authenticated
  next('/')
})

export default router
