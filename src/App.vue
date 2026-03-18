<template>
  <div class="app-root">
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
          <img v-if="user.picture || user.photos" :src="user.picture || (user.photos && user.photos[0] && user.photos[0].value)" class="user-avatar hide-mobile" />
          <span class="user-name hide-mobile">{{
            user.displayName ||
            (user.name?.givenName ? user.name.givenName + ' ' + (user.name.familyName || '') : null) ||
            user.email ||
            (user.emails && user.emails[0] && user.emails[0].value) ||
            'User'
          }}</span>
          <button @click="logout" class="logout-btn">Logout</button>
        </template>
        <template v-else>
          <button @click="login" class="login-btn">Login</button>
        </template>
      </div>
    </header>
    <div class="view-container">
      <router-view />
    </div>
  </div>
</template>

<script setup>
function restrictedNav(path) {
  if (!user.value) {
    window.location.href = '/auth/google'
    return
  }
  router.push(path)
}

function openViewerDialog() {
  router.push('/viewer')
}

import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
const user = ref(null)
const router = useRouter()
const route = useRoute()

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
router.afterEach(() => { fetchUser() })
</script>

<style>
:root {
  --nav-h: 44px;
}

*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background: #2f2f2f;
  overflow: hidden;
}

#app {
  width: 100dvw;
  height: 100dvh;
  overflow: hidden;
}

.app-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.app-header {
  flex-shrink: 0;
  height: var(--nav-h);
  width: 100%;
  background: #232323;
  color: #fff;
  padding: 0 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 50;
}

/* This is the slot that all views fill */
.view-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.main-nav {
  display: flex;
  gap: 4px;
}

.nav-btn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 0.9em;
  padding: 5px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  font-weight: 500;
  position: relative;
  white-space: nowrap;
}
.nav-btn::after {
  content: '';
  display: block;
  position: absolute;
  bottom: -2px;
  left: 12px;
  right: 12px;
  height: 2px;
  border-radius: 2px;
  background: var(--accent-color, #4fc3f7);
  transform: scaleX(0);
  transition: transform 0.15s;
}
.nav-btn:hover {
  background: rgba(79,195,247,0.08);
  color: var(--accent-color, #4fc3f7);
}
.nav-btn:hover::after { transform: scaleX(1); }
.nav-btn.active {
  color: var(--accent-color, #4fc3f7);
  background: rgba(79,195,247,0.12);
}
.nav-btn.active::after { transform: scaleX(1); }

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}
.user-name {
  font-size: 0.85em;
  color: #ccc;
  white-space: nowrap;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.login-btn, .logout-btn {
  background: #444;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 5px 14px;
  font-size: 0.85em;
  cursor: pointer;
  white-space: nowrap;
}
.login-btn:hover, .logout-btn:hover { background: #666; }

/* Mobile: hide name and avatar, keep only logout */
@media (max-width: 600px) {
  :root { --nav-h: 44px; }
  .hide-mobile { display: none !important; }
  .nav-btn {
    font-size: 0.78em;
    padding: 4px 7px;
  }
  .app-header {
    padding: 0 6px;
  }
}
</style>