/* Lightweight Chromium/CDP regression coverage for the demo interaction. */
const { spawn } = require("node:child_process")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")

const url = process.env.BROWSER_TEST_URL || "http://localhost:3002"
const port = Number(process.env.BROWSER_TEST_CDP_PORT || 9223)
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "polyplinko-browser-"))
let browser
let socket
let nextId = 1
const pending = new Map()

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForPage() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      const page = pages.find((item) => item.type === "page" && item.webSocketDebuggerUrl && item.url.startsWith(url))
      if (page) return page
    } catch {}
    await sleep(250)
  }
  throw new Error("Chromium CDP page did not start")
}

function command(method, params = {}) {
  const id = nextId++
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || JSON.stringify(result.exceptionDetails))
  return result.result?.value
}

async function check(name, expression) {
  const result = await evaluate(expression)
  if (!result) throw new Error(`FAIL: ${name}`)
  console.log(`PASS: ${name}`)
}

async function click(selector) {
  const point = await evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) throw new Error(${JSON.stringify(`Missing ${selector}`)}); const rect = element.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; })()`)
  await command("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y })
  await command("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", buttons: 1, clickCount: 1 })
  await command("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", buttons: 0, clickCount: 1 })
  await sleep(50)
  let state = await evaluate(`document.querySelector(${JSON.stringify(selector)}).getAttribute("data-state")`)
  if (state === "unchecked") {
    // Radix switches are native buttons. A trusted keyboard activation is a
    // reliable fallback when headless Chromium's layout hit-testing differs
    // from the rendered viewport.
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
    await command("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 })
    await command("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 })
    await sleep(50)
    state = await evaluate(`document.querySelector(${JSON.stringify(selector)}).getAttribute("data-state")`)
  }
  return state
}

async function boardPointer(percent, yPercent = 0.2) {
  return evaluate(`(() => {
    const board = document.querySelector('[data-testid="plinko-board"]');
    if (!board) throw new Error('Missing board');
    const rect = board.getBoundingClientRect();
    board.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, pointerId: 1,
      clientX: rect.left + rect.width * ${percent},
      clientY: rect.top + rect.height * ${yPercent},
    }));
    return board.getAttribute('data-demo-origin-x');
  })()`)
}

async function main() {
  browser = spawn("chromium", [
    "--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`, url,
  ], { stdio: "ignore" })
  const page = await waitForPage()
  socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve)
    socket.addEventListener("error", reject)
  })
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) request.reject(new Error(message.error.message))
      else request.resolve(message.result)
    }
  })
  await command("Runtime.enable")
  await command("Page.enable")
  await command("Page.navigate", { url })
  await sleep(700)
  await evaluate("localStorage.removeItem('polyplinko:interactive-drop-confirmed'); window.__confirmCalls = 0; window.confirm = () => { window.__confirmCalls += 1; return false }")
  await sleep(500)

  await check("Interactive Drop defaults off", `document.querySelector('[data-testid="demo-mode-switch"]').getAttribute('data-state') === 'unchecked' && !document.querySelector('[data-testid="interactive-drop-switch"]')`)
  await check("Board click while off does not spawn", `(() => { const board = document.querySelector('[data-testid="plinko-board"]'); const rect = board.getBoundingClientRect(); board.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: rect.left + rect.width * .1, clientY: rect.top + rect.height * .2 })); return board.getAttribute('data-demo-origin-x') === ''; })()`)

  await click('[data-testid="demo-mode-switch"]')
  await sleep(150)
  await check("Interactive control appears in demo mode", `!!document.querySelector('[data-testid="interactive-drop-switch"]')`)
  await click('[data-testid="interactive-drop-switch"]')
  await sleep(100)
  await check("Cancel keeps Interactive Drop off", `document.querySelector('[data-testid="interactive-drop-switch"]').getAttribute('data-state') === 'unchecked' && window.__confirmCalls === 1`)

  await evaluate("window.confirm = () => { window.__confirmCalls += 1; return true }")
  await click('[data-testid="interactive-drop-switch"]')
  await sleep(150)
  await check("Confirm enables Interactive Drop", `document.querySelector('[data-testid="interactive-drop-switch"]').getAttribute('data-state') === 'checked'`)
  await check("Acknowledgement persists locally", `localStorage.getItem('polyplinko:interactive-drop-confirmed') === 'true'`)

  await boardPointer(0.1)
  await sleep(100)
  await check("Left click controls visual spawn origin", `Number(document.querySelector('[data-testid="plinko-board"]').getAttribute('data-demo-origin-x')) < 35 && document.querySelector('[data-testid="plinko-board"]').getAttribute('data-phase') !== 'ready'`)
  await boardPointer(0.9)
  await sleep(100)
  await check("Right click controls visual spawn origin", `Number(document.querySelector('[data-testid="plinko-board"]').getAttribute('data-demo-origin-x')) > 65`)
  await check("Pointer mode is active for mouse and touch", `document.querySelector('[data-testid="plinko-board"]').getAttribute('data-interactive-drop') === 'on' && document.querySelector('[data-testid="plinko-board"]').getAttribute('aria-label').includes('demo ball')`)

  await click('[data-testid="drop-one-ball"]')
  await sleep(100)
  await check("Drop One Ball remains functional", `document.querySelector('[data-testid="plinko-board"]').getAttribute('data-phase') !== 'ready'`)
  await click('[data-testid="play-demo-round"]')
  await sleep(100)
  await check("Play Demo Round remains functional", `document.querySelector('[data-testid="plinko-board"]').getAttribute('data-phase') !== 'ready'`)

  await command("Page.reload", { ignoreCache: true })
  await sleep(800)
  await evaluate("window.__confirmCalls = 0; window.confirm = () => { window.__confirmCalls += 1; return true }")
  await check("Reload preserves first-use acknowledgement", `localStorage.getItem('polyplinko:interactive-drop-confirmed') === 'true'`)
  await click('[data-testid="demo-mode-switch"]')
  await sleep(100)
  await click('[data-testid="interactive-drop-switch"]')
  await sleep(100)
  await check("Acknowledged enable does not prompt again", `document.querySelector('[data-testid="interactive-drop-switch"]').getAttribute('data-state') === 'checked' && window.__confirmCalls === 0`)

  await click('[data-testid="demo-mode-switch"]')
  await sleep(100)
  await check("Paid-mode board pointer cannot set demo origin", `document.querySelector('[data-testid="plinko-board"]').getAttribute('data-interactive-drop') === 'off' && document.querySelector('[data-testid="plinko-board"]').getAttribute('data-demo-origin-x') === ''`)
  await boardPointer(0.1)
  await sleep(100)
  await check("Paid-mode pointer remains non-authoritative", `document.querySelector('[data-testid="plinko-board"]').getAttribute('data-demo-origin-x') === ''`)

  console.log("Browser interaction regression: PASS")
}

main().catch((error) => {
  console.error(error.stack || error)
  process.exitCode = 1
}).finally(async () => {
  socket?.close()
  browser?.kill("SIGTERM")
  try { fs.rmSync(profile, { recursive: true, force: true }) } catch {}
})
