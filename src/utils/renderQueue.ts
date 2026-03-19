type RenderTask = {
  cancelled: boolean
  delayMs: number
  run: () => void
}

const queue: RenderTask[] = []
let isProcessing = false

function scheduleFrame(callback: () => void) {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => callback())
    return
  }
  setTimeout(callback, 0)
}

function drainQueue() {
  if (isProcessing) {
    return
  }

  const nextTask = queue.shift()
  if (!nextTask) {
    return
  }

  isProcessing = true
  scheduleFrame(() => {
    if (!nextTask.cancelled) {
      nextTask.run()
    }

    const resume = () => {
      isProcessing = false
      drainQueue()
    }

    if (nextTask.delayMs > 0) {
      setTimeout(resume, nextTask.delayMs)
      return
    }

    scheduleFrame(resume)
  })
}

export function enqueueRender(run: () => void, delayMs: number = 16) {
  const task: RenderTask = {
    cancelled: false,
    delayMs,
    run,
  }

  queue.push(task)
  drainQueue()

  return () => {
    task.cancelled = true
    const idx = queue.indexOf(task)
    if (idx >= 0) {
      queue.splice(idx, 1)
    }
  }
}
