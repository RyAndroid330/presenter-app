<template>
  <div class="viewer">
    <!-- Portrait prompt — shown on mobile when orientation lock fails -->
    <div class="rotate-prompt" v-if="showRotatePrompt">
      <span class="material-icons rotate-icon">screen_rotation</span>
      <span>Rotate your device to landscape</span>
    </div>

    <template v-if="!showRotatePrompt">
    <div v-if="!displayText" class="waiting-message">
      Waiting for the meeting to start
    </div>
    <div ref="displayRef" class="display" v-show="(!showChords || !currentChords) && displayText">
      {{ displayText }}
    </div>

    <div v-if="showChords && currentChords" class="chord-sheet">
      <template v-for="(line, idx) in chordSheetLines" :key="idx">
        <div v-if="line.hasChords" class="cs-chords">{{ line.chordLine }}</div>
        <div class="cs-text">{{ line.textLine || '\u00A0' }}</div>
      </template>
    </div>

    <button class="chord-toggle" :class="{ active: showChords }" @click="toggleChords">&#9834;</button>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createFitText } from '../composables/useFitText.js'

const route = useRoute()
const router = useRouter()
const meeting = route.query.meet

if (!meeting) {
  alert('No meeting selected')
  router.push('/')
}


const displayRef = ref(null)
const displayText = ref('')
const currentChords = ref(null)
const showChords = ref(false)

/* --- Landscape enforcement (mobile only) --- */
const showRotatePrompt = ref(false)
const isMobile = () => /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)

function checkOrientation() {
  if (!isMobile()) return
  const portrait = window.matchMedia('(orientation: portrait)').matches
  showRotatePrompt.value = portrait
}

async function lockLandscape() {
  if (!isMobile()) return
  try {
    await screen.orientation.lock('landscape')
    showRotatePrompt.value = false
  } catch {
    // Lock not supported — fall back to prompt
    checkOrientation()
    window.addEventListener('orientationchange', checkOrientation)
    window.addEventListener('resize', checkOrientation)
  }
}


let fitText = null
let eventSource = null
let resizeHandler = null
let wakeLock = null
let noSleepVideo = null

// --- Keep screen awake: Wake Lock API + silent-video fallback ---

async function requestWakeLock() {
  // 1) Try the modern Wake Lock API
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen')
      wakeLock.addEventListener('release', () => { wakeLock = null })
      return // success – no need for video fallback
    } catch { /* denied or failed, fall through */ }
  }
  // 2) Fallback: loop a tiny silent video to keep device awake
  enableNoSleepVideo()
}

function enableNoSleepVideo() {
  if (noSleepVideo) return
  // Minimal 1-second silent MP4 (base64). Works on iOS Safari + Android Chrome.
  const silentMp4 = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAA' +
    'JxtZGF0AAACrwYF//+r3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NCByMzEwOCA' +
    'zMWUxOWY5IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAy' +
    'MyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhY' +
    'mFjPTAgcmVmPTEgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MToweDEgbWU9ZGlhIHN1Ym' +
    '1lPTAgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MCBtZV9yYW5nZT0xNiBj' +
    'aHJvbWFfbWU9MSB0cmVsbGlzPTAgOHg4ZGN0PTAgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZm' +
    'FzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9MCB0aHJlYWRzPTEgbG9va2FoZWFkX3Ro' +
    'cmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPT' +
    'AgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0wIHdlaWdo' +
    'dHA9MCBrZXlpbnQ9MjUwIGtleWludF9taW49MjUgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcm' +
    'VzaD0wIHJjPWNyZiBtYnRyZWU9MCBjcmY9MjMuMCBxY29tcD0wLjYwIHFwbWluPTAgcXBt' +
    'YXg9NjkgcXBzdGVwPTQgdmJ2X21heHJhdGU9MCB2YnZfYnVmc2l6ZT0wIGNyZl9tYXg9MC' +
    '4wIHJjX2xvb2thaGVhZD0wIGlwX3JhdGlvPTEuNDAgYXE9MDAAAAAwZYiEAD//8m+P5irG' +
    'BoQA3KIABwCboBYAFgBOgAAADAACdCAQ4AAAB9AAAAAAKE1vb3YAAABsbXZoZAAAAAAAAA' +
    'AAAAAAAAAABAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAGYdHJhawAAAFx0a2hkAAAAAwAAAAAAAAAAAAAAAQ' +
    'AAAAAAAAQAAAAAAAAAAAAAAAAAAAAABAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAACQbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAoAAAABABVxAAAAAAALWhkbHIAAAAAAAAA' +
    'dmlkZUAAAAAAAAAAAAAAAFZpZGVvSGFuZGxlcgAAAMtzdGJsAAAAi3N0c2QAAAAAAAAAAQAA' +
    'AHthdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAABAAEABIAAAASAAAAAAAAAABAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGP//AAAANWF2Y0MBZAAf/+EAGGdkAB+s2UCg' +
    'L/lwFqCAAAADAIAAAAMDxYtlgAEABmjr48siwAAAABhzdHRzAAAAAAAAAAEAAAABAAAAAQAA' +
    'ABRzdHNzAAAAAAAAAAEAAAABAAAAKGN0dHMAAAAAAAAAAgAAAAEAAAAAAAAAAgAAABAAAAAs' +
    'c3RzYwAAAAAAAAABAAAAAQAAAAEAAAABAAAAHHN0c3oAAAAAAAAAAAAAAAEAAAK3AAAAFHN0' +
    'Y28AAAAAAAAAAQAAADAAAABidWR0YQAAAFptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGly' +
    'YXBwbAAAAAAAAAAAAAAAAC1pbHN0AAAAJal0b28AAAAdZGF0YQAAAAEAAAAATGF2ZjYwLjMu' +
    'MTAw'
  noSleepVideo = document.createElement('video')
  noSleepVideo.setAttribute('playsinline', '')
  noSleepVideo.setAttribute('muted', '')
  noSleepVideo.muted = true
  noSleepVideo.loop = true
  noSleepVideo.style.cssText = 'position:fixed;top:-1px;left:-1px;width:1px;height:1px;opacity:0;pointer-events:none'
  noSleepVideo.src = silentMp4
  document.body.appendChild(noSleepVideo)
  noSleepVideo.play().catch(() => {})
}

function disableNoSleepVideo() {
  if (!noSleepVideo) return
  noSleepVideo.pause()
  noSleepVideo.remove()
  noSleepVideo = null
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') requestWakeLock()
}
document.addEventListener('visibilitychange', handleVisibilityChange)

// Mobile browsers require a user gesture before video can autoplay.
// After first tap anywhere, (re)start the no-sleep video if it exists.
function onFirstInteraction() {
  if (noSleepVideo) noSleepVideo.play().catch(() => {})
  document.removeEventListener('click', onFirstInteraction)
  document.removeEventListener('touchstart', onFirstInteraction)
}
document.addEventListener('click', onFirstInteraction)
document.addEventListener('touchstart', onFirstInteraction)

const chordSheetLines = computed(() => {
  const text = displayText.value || ''
  const chords = currentChords.value
  if (!text || !chords) return []
  const lines = text.split('\n')
  const result = []
  let absPos = 0
  for (const line of lines) {
    let chordStr = ''
    let hasChords = false
    let i = 0
    while (i < line.length) {
      const ch = chords[String(absPos + i)]
      if (ch) {
        hasChords = true
        chordStr += ch
        i += ch.length
      } else {
        chordStr += ' '
        i++
      }
    }
    result.push({ chordLine: chordStr.trimEnd(), textLine: line, hasChords })
    absPos += line.length + 1
  }
  return result
})

function toggleChords() {
  showChords.value = !showChords.value
  if (!showChords.value && fitText) {
    nextTick(() => fitText.fit(displayText.value))
  }
}

onMounted(() => {
  lockLandscape()
  fitText = createFitText(displayRef, 0)

  eventSource = new EventSource('/api/events?meet=' + encodeURIComponent(meeting))

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)
    displayText.value = data.text
    currentChords.value = data.chords || null
    if (!showChords.value || !data.chords) {
      fitText.fit(data.text)
    }
  }

  resizeHandler = () => {
    if (!showChords.value || !currentChords.value) {
      fitText.fit(displayText.value)
    }
  }
  window.addEventListener('resize', resizeHandler)

  requestWakeLock()
})

onUnmounted(() => {
  if (eventSource) eventSource.close()
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  if (fitText) fitText.cleanup()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (wakeLock) { wakeLock.release(); wakeLock = null }
  disableNoSleepVideo()
  window.removeEventListener('orientationchange', checkOrientation)
  window.removeEventListener('resize', checkOrientation)
  try { screen.orientation.unlock() } catch {}
})
</script>
<style scoped>
/* ── Layout ── */
.viewer {
  height: 100%;
  width: 100%;
  background: var(--bg-raised);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

/* Waiting state */
.waiting-message {
  font-size: 1.4em;
  color: var(--text-faint);
  text-align: center;
  pointer-events: none;
}

/* ── Main display — fills the space, fitText sets font-size ── */
.display {
  /* Fill almost all of the viewer so fitText has max room */
  width: 92%;
  height: 92%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-weight: bold;
  /* No font-size here — useFitText.js owns that */
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.15;
  color: var(--text-primary);
  overflow: hidden;
}

/* ── Chord sheet — when music view is active ── */
.chord-sheet {
  font-family: 'Courier New', Courier, monospace;
  font-size: clamp(13px, 2vw, 34px);
  white-space: pre;
  overflow: auto;
  padding: 24px 32px;
  max-width: 95vw;
  max-height: 92%;
  line-height: 1.3;
}
.cs-chords { color: var(--accent); font-weight: bold; line-height: 1.2; }
.cs-text   { color: var(--text-primary); margin-bottom: 0.5em; }

/* ── Music toggle button — inverted: accent bg, dark icon ── */
.chord-toggle {
  position: fixed;
  bottom: 22px;
  right: 22px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  /* Inverted: accent background, dark symbol */
  background: var(--bg-base, #181818);
  color: var(--accent);
  font-size: 26px;
  cursor: pointer;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  transition: background var(--transition), transform var(--transition);
  padding: 0;
  line-height: 1;
}
.chord-toggle:hover    { background: var(--accent-hover); transform: scale(1.08); }
/* Active = currently showing chords: slightly different shade to show state */
.chord-toggle.active   { background: var(--accent-hover); box-shadow: 0 4px 20px rgba(29,185,84,0.4); }

/* ── Rotate prompt ── */
.rotate-prompt {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--bg-raised);
  color: var(--text-muted);
  font-size: 1.1em;
  z-index: 200;
  text-align: center;
  padding: 24px;
}
.rotate-icon {
  font-size: 52px;
  color: var(--accent);
  animation: rotate-hint 2s ease-in-out infinite;
}
@keyframes rotate-hint {
  0%, 100% { transform: rotate(0deg); }
  40%       { transform: rotate(90deg); }
  60%       { transform: rotate(90deg); }
}

/* ── Mobile ── */
@media (max-width: 600px) {
  .display { width: 96%; height: 88%; }
  .chord-sheet {
    padding: 12px 8px;
    font-size: clamp(11px, 3.5vw, 20px);
    white-space: pre-wrap;
    word-break: break-word;
  }
  .chord-toggle { width: 44px; height: 44px; font-size: 22px; bottom: 14px; right: 14px; }
}
</style>