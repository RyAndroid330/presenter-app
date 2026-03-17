
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
  min-width: 100vw;
  min-height: 100vh;
  width: 100vw;
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
  background: #2f2f2f;
  font-size: 16px;
}

.app-header {
  width: 100%;
  background: #232323;
  color: #fff;
  padding: 0.5em 1.5em;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  box-sizing: border-box;
  min-height: 48px;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 0.7em;
  flex-wrap: wrap;
}
.user-avatar {
  width: 2.2em;
  height: 2.2em;
  border-radius: 50%;
  object-fit: cover;
}
.login-btn, .logout-btn {
  background: #444;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.4em 1.2em;
  font-size: 1em;
  cursor: pointer;
}
.login-btn:hover, .logout-btn:hover {
  background: #666;
}


@media (max-width: 900px) {
  html, body, #app {
    font-size: 15px;
  }
  .app-header {
    padding: 0.5em 0.7em;
  }
}

@media (max-width: 600px) {
  html, body, #app {
    font-size: 14px;
    min-width: 100vw;
    min-height: 100vh;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .app-header {
    flex-direction: column;
    align-items: flex-end;
    padding: 0.5em 0.4em;
    min-height: 40px;
  }
  .user-info {
    gap: 0.5em;
    font-size: 0.95em;
  }
  .user-avatar {
    width: 1.7em;
    height: 1.7em;
  }
  .login-btn, .logout-btn {
    font-size: 0.95em;
    padding: 0.3em 0.7em;
  }
}

@media (max-width: 400px) {
  html, body, #app {
    font-size: 12.5px;
  }
  .app-header {
    min-height: 32px;
  }
}
</style>
