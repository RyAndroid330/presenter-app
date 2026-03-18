<template>
  <div class="viewer">
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
})
</script>

<style scoped>
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

.waiting-message {
  color: var(--text-faint);
  font-size: 1.2em;
}

.display {
  width: 80%;
  max-width: 900px;
  max-height: 80%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-weight: bold;
  font-size: clamp(20px, 4vw, 64px);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.15;
  color: var(--text-primary);
}

/* Chord sheet */
.chord-sheet {
  font-family: 'Courier New', Courier, monospace;
  font-size: clamp(13px, 2vw, 36px);
  white-space: pre;
  overflow: auto;
  padding: 24px;
  max-width: 95vw;
  max-height: 88%;
}
.cs-chords { color: var(--accent); font-weight: bold; line-height: 1.2; }
.cs-text   { color: var(--text-primary); line-height: 1.5; }

/* Music toggle button */
.chord-toggle {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 52px;
  height: 52px;
  font-size: 1.6em;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  cursor: pointer;
  transition: background var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.chord-toggle:hover, .chord-toggle.active { background: var(--accent-hover); }

@media (max-width: 600px) {
  .display { font-size: clamp(18px, 6vw, 40px); width: 95%; }
  .chord-toggle { width: 44px; height: 44px; font-size: 1.3em; bottom: 16px; right: 16px; }
}
</style>