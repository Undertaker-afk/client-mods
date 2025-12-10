//@ts-check

export default () => {
  globalThis.customEvents.on('gameLoaded', () => {
    const bot = globalThis.bot
    const blockChanged = (data) => {
      const { block } = data ?? {}
      const existingTooltip = document.getElementById('waila-tooltip')
      if (existingTooltip) existingTooltip.remove()
      if (!block || ['air', 'void'].includes(block.name)) {
        return
      }
      showTooltip(block.displayName, block.material?.replace('mineable/', '') ?? '', block)
    }
    bot.on('highlightCursorBlock', blockChanged)
    blockChanged({ block: bot.mouse.cursorBlock })
    bot.on('blockBreakProgressStage', (block, stage) => {
      // if (block.position.equals(bot.mouse.cursorBlock?.position)) {
      //     showProgress(stage / 10)
      // }
    })
    bot.on('end', () => {
      const existingTooltip = document.getElementById('waila-tooltip')
      if (existingTooltip) existingTooltip.remove()
    })
  })
}

const showTooltip = (name, digTool, block) => {
  const isTouch = globalThis.miscUiState.currentTouch
  const top = isTouch ? 27 : 0

  // Remove existing tooltip if any
  const existingTooltip = document.getElementById('waila-tooltip')
  if (existingTooltip) existingTooltip.remove()

  const div = document.createElement('div')
  div.id = 'waila-tooltip'
  div.style.cssText = `
        position: fixed;
        top: ${top}px;
        left: 50%;
        transform: translateX(-50%);
        scale: 0.6;
        background-color: rgba(0, 0, 0, 0.7);
        border: 1px solid #666;
        border-radius: 1px;
        padding: 7px 10px;
        color: white;
        font-family: inherit;
        font-size: 12px;
        text-align: center;
        min-width: 100px;
        transform-origin: top left;
    `

  const nameDiv = document.createElement('div')
  nameDiv.textContent = name
  nameDiv.style.cssText = 'margin-bottom: 2px;'

  const toolDiv = document.createElement('div')
  toolDiv.textContent = digTool ? `Tool: ${digTool}` : ''
  toolDiv.style.cssText = 'color: #999;'

  const coordsDiv = document.createElement('div')
  coordsDiv.textContent = `[${block.position.x}, ${block.position.y}, ${block.position.z}]`
  coordsDiv.style.cssText = 'color: #999; margin-top: 6px;'

  div.appendChild(nameDiv)
    div.appendChild(toolDiv)
  div.appendChild(coordsDiv)
  const hudScaledContainer = document.getElementById('ui-root')
  if (hudScaledContainer) {
    hudScaledContainer.appendChild(div)
  }
}
