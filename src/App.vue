
<template>
  <div>
    <header class="app-header">
      <div class="user-info">
        <template v-if="user">
          <img v-if="user.picture || user.photos" :src="user.picture || (user.photos && user.photos[0] && user.photos[0].value)" class="user-avatar" />
          <span>
            {{
              user.displayName ||
              user.name?.givenName + ' ' + user.name?.familyName ||
              user.name?.familyName ||
              user.name?.givenName ||
              user.email ||
              (user.emails && user.emails[0] && user.emails[0].value) ||
              'User'
            }}
          </span>
          <button @click="logout" class="logout-btn">Logout</button>
        </template>
        <template v-else>
          <button @click="login" class="login-btn">Login with Google</button>
        </template>
      </div>
    </header>
    <!-- Sidebar is now rendered directly in each view, not via slot. -->
    <router-view />
  </div>
</template>

<script setup>
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

// Re-fetch user info after every route change
router.afterEach(() => {
  fetchUser()
})
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100dvw;
  height: 100dvh;
  overflow: hidden;
  background: #2f2f2f;
}

.app-header {
  width: 100%;
  background: #232323;
  color: #fff;
  padding: 8px 20px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  box-sizing: border-box;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}
.login-btn, .logout-btn {
  background: #444;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 6px 16px;
  font-size: 16px;
  cursor: pointer;
}
.login-btn:hover, .logout-btn:hover {
  background: #666;
}

@media (max-width: 768px) {
  html, body, #app {
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }
  .app-header {
    padding: 8px 8px;
  }
}

@media (max-width: 600px) {
  html, body, #app {
    width: 100vw;
    height: auto;
    min-height: 100vh;
    font-size: 15px;
  }
  .app-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 8px 2px;
  }
  .user-info {
    gap: 6px;
  }
  .user-avatar {
    width: 28px;
    height: 28px;
  }
  .login-btn, .logout-btn {
    font-size: 15px;
    padding: 5px 10px;
    border-radius: 6px;
  }
}
</style>
