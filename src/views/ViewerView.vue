<style scoped>
.viewer {
  min-height: 100vh;
  background: #181818;
  color: #e0e0e0;
  font-family: 'Inter', 'Segoe UI', 'Arial', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100vw;
  box-sizing: border-box;
  padding: 0 1.5vw;
}
.waiting-message {
  color: #b3b3b3;
  font-size: 1.3em;
  margin-top: 2em;
  text-align: center;
}
.display {
  font-size: 2.5em;
  background: #232323;
  border-radius: 16px;
  padding: 2em 1em;
  margin: 2em auto;
  max-width: 900px;
  width: 100%;
  box-sizing: border-box;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  text-align: center;
  word-break: break-word;
  white-space: pre-wrap;
}
.chord-toggle {
  position: fixed;
  bottom: 2em;
  right: 2em;
  background: var(--accent-color);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  font-size: 2em;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  cursor: pointer;
  transition: background 0.2s;
  z-index: 10;
}
.chord-toggle.active, .chord-toggle:hover {
  background: var(--accent-color-hover);
}
.chord-sheet {
  background: #232323;
  border-radius: 16px;
  padding: 1.5em 1em;
  margin: 2em auto;
  max-width: 900px;
  width: 100%;
  font-family: 'Courier New', Courier, monospace;
  font-size: clamp(14px, 2.5vw, 40px);
  white-space: pre;
  max-height: 90vh;
  overflow-y: auto;
  line-height: 1.3;
  box-sizing: border-box;
}
.cs-chords {
  color: #4fc3f7;
  font-weight: bold;
}
.cs-text {
  margin-bottom: 0.6em;
}

@media (max-width: 900px) {
  .display, .chord-sheet {
    font-size: 2em;
    padding: 1.2em 0.5em;
    margin: 1.2em auto;
    border-radius: 12px;
  }
  .chord-toggle {
    width: 48px;
    height: 48px;
    font-size: 1.5em;
    bottom: 1em;
    right: 1em;
  }
}

@media (max-width: 600px) {
  .viewer {
    padding: 0 0.5vw;
  }
  .display, .chord-sheet {
    font-size: 1.2em;
    padding: 0.7em 0.2em;
    margin: 0.7em auto;
    border-radius: 8px;
    max-width: 98vw;
  }
  .chord-toggle {
    width: 40px;
    height: 40px;
    font-size: 1.1em;
    bottom: 0.7em;
    right: 0.7em;
  }
}

@media (max-width: 400px) {
  .display, .chord-sheet {
    font-size: 1em;
    padding: 0.3em 0.1em;
    border-radius: 5px;
  }
  .chord-toggle {
    width: 32px;
    height: 32px;
    font-size: 0.9em;
    bottom: 0.3em;
    right: 0.3em;
  }
}
</style>
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
  min-height: 100vh;
  background: #181818;
  color: #e0e0e0;
  font-family: 'Inter', 'Segoe UI', 'Arial', sans-serif;
}
.waiting-message {
  color: #b3b3b3;
  font-size: 1.3em;
  margin-top: 2em;
}
.display {
  font-size: 2.5em;
  background: #232323;
  border-radius: 16px;
  padding: 2em;
  margin: 2em auto;
  max-width: 900px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.chord-toggle {
  position: fixed;
  bottom: 2em;
  right: 2em;
  background: var(--accent-color);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  font-size: 2em;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  cursor: pointer;
  transition: background 0.2s;
}
.chord-toggle.active, .chord-toggle:hover {
  background: var(--accent-color-hover);
}
.chord-sheet {
  background: #232323;
  border-radius: 16px;
  padding: 1.5em;
  margin: 2em auto;
  max-width: 900px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.cs-chords {
  color: var(--accent-color);
  font-weight: bold;
}
.cs-text {
  color: #e0e0e0;
}

.viewer {
  height: 100vh;
  margin: 0;
  background: #2f2f2f;
  font-family: Arial, sans-serif;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  position: relative;
}

.display {
  width: 75dvw;
  height: 50dvh;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.1;
}

/* Chord sheet */
.chord-sheet {
  font-family: 'Courier New', Courier, monospace;
  font-size: clamp(14px, 2.5vw, 40px);
  white-space: pre;
  padding: 30px;
  max-height: 90vh;
  overflow-y: auto;
  line-height: 1.3;
}

.cs-chords {
  color: #4fc3f7;
  font-weight: bold;
}

.cs-text {
  margin-bottom: 0.6em;
}

/* Toggle button */
.chord-toggle {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.25);
  background: rgba(0,0,0,0.45);
  color: rgba(255,255,255,0.5);
  font-size: 26px;
  cursor: pointer;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
  line-height: 1;
}

.chord-toggle:hover {
  background: rgba(0,0,0,0.65);
  border-color: rgba(255,255,255,0.4);
}

.chord-toggle.active {
  background: rgba(79,195,247,0.25);
  border-color: #4fc3f7;
  color: #4fc3f7;
}

@media (max-width: 768px) {
  .display {
    width: 92vw;
    height: 70vh;
  }
  .chord-sheet {
    padding: 12px;
    font-size: clamp(12px, 3.5vw, 24px);
    white-space: pre-wrap;
    word-break: break-word;
  }
  .chord-toggle {
    bottom: 16px;
    right: 16px;
    width: 46px;
    height: 46px;
    font-size: 24px;
  }
}

.waiting-message {
  font-size: 2.2rem;
  color: #bbb;
  text-align: center;
  width: 100vw;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

</style>