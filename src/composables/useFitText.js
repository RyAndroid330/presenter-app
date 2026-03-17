/**
 * Creates an auto-fitting text scaler for a container element.
 * @param {import('vue').Ref<HTMLElement>} containerRef - Vue ref to the container DOM element
 * @param {number} padding - Pixels to subtract from width/height for fitting (default 0)
 * @returns {{ fit: (text: string) => void, cleanup: () => void }}
 */
export function createFitText(containerRef, padding = 0) {
  const span = document.createElement('span')
  span.style.visibility = 'hidden'
  span.style.position = 'absolute'
  span.style.fontFamily = 'Arial, sans-serif'
  span.style.whiteSpace = 'pre-wrap'
  span.style.wordBreak = 'break-word'
  span.style.lineHeight = '1.1'
  document.body.appendChild(span)

  function fit(text) {
    const el = containerRef.value
    if (!el) return

    const width = el.clientWidth - padding
    const height = el.clientHeight - padding
    let fontSize = 200

    span.style.width = width + 'px'
    span.innerText = text || ' '

    while (fontSize > 10) {
      span.style.fontSize = fontSize + 'px'
      if (span.offsetHeight <= height) break
      fontSize--
    }

    el.style.fontSize = fontSize + 'px'
  }

  function cleanup() {
    if (span.parentNode) span.parentNode.removeChild(span)
  }

  return { fit, cleanup }
}
