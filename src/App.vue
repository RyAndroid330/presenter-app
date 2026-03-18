<template>
  <div class="app-root">
    <header class="app-header">
      <nav class="main-nav">
        <button @click="router.push('/')"              class="nav-btn" :class="{ active: route.path === '/' }">Home</button>
        <button @click="restrictedNav('/presenter')"   class="nav-btn" :class="{ active: route.path === '/presenter' }">Slides</button>
        <button @click="restrictedNav('/teacher')"     class="nav-btn" :class="{ active: route.path === '/teacher' }">Teacher</button>
        <button @click="restrictedNav('/musician')"    class="nav-btn" :class="{ active: route.path === '/musician' }">Musician</button>
        <button @click="router.push('/viewer')"        class="nav-btn" :class="{ active: route.path === '/viewer' }">Viewer</button>
      </nav>
      <div class="user-info">
        <template v-if="user">
          <img v-if="user.picture || user.photos"
               :src="user.picture || user.photos?.[0]?.value"
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
    <main class="view-slot">
      <router-view />
    </main>
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

onMounted(fetchUser)
router.afterEach(fetchUser)
</script>

<style>
.app-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-raised);
  color: var(--text-primary);
}

.app-header {
  flex-shrink: 0;
  height: var(--nav-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  z-index: 100;
}

.view-slot {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

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
.nav-btn:hover, .nav-btn.active { background: var(--accent-dim); color: var(--accent); }
.nav-btn:hover::after, .nav-btn.active::after { transform: scaleX(1); }

.user-info { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.user-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
.user-name { font-size: 0.85em; color: var(--text-muted); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
  .nav-btn { font-size: 0.78em; padding: 4px 7px; }
}
</style>