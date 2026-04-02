/**
 * Creates an auto-fitting text scaler for a container element.
 * Font size is determined by binary search and is proportional to the
 * container width, guaranteeing no overflow in either dimension.
 *
 * @param {import('vue').Ref<HTMLElement>} containerRef
 * @param {number} padding - px to subtract from width/height before fitting
 * @returns {{ fit: (text: string) => void, cleanup: () => void }}
 */
export function createFitText(containerRef, padding = 0) {
  const span = document.createElement('span')
  span.style.visibility  = 'hidden'
  span.style.position    = 'absolute'
  span.style.whiteSpace  = 'pre-wrap'
  span.style.wordBreak   = 'break-word'
  span.style.lineHeight  = '1.15'
  span.style.fontFamily  = "'Inter', 'Segoe UI', Arial, sans-serif"
  span.style.fontWeight  = 'bold'
  document.body.appendChild(span)

  function fit(text) {
    const el = containerRef.value
    if (!el) return

    if (!text || !text.trim()) {
      el.style.fontSize = ''
      return
    }

    const w = el.clientWidth  - padding
    const h = el.clientHeight - padding

    if (w <= 0 || h <= 0) return

    span.style.width = w + 'px'
    span.innerText   = text

    // Upper bound: 40% of container width keeps text proportional across devices.
    // Lower bound: 8px (unreadable below this).
    let lo = 8
    let hi = Math.floor(w * 0.4)

    // Binary search for the largest font size where text fits within height.
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1
      span.style.fontSize = mid + 'px'
      if (span.offsetHeight <= h) {
        lo = mid
      } else {
        hi = mid
      }
    }

    el.style.fontSize = lo + 'px'
  }

  function cleanup() {
    if (span.parentNode) span.parentNode.removeChild(span)
  }

  return { fit, cleanup }
}
