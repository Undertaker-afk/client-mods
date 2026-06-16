
export const sanitizeHTML = (str) => {
    if (!str) return ''
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
}

export const sanitizeAttr = (str) => {
    if (!str) return ''
    return String(str).replace(/["'<>&]/g, (c) => {
        return { '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c
    })
}

export const safeSetInnerHTML = (element, html) => {
    if (!element) return
    // Only set innerHTML if we trust the source, otherwise use textContent
    element.textContent = ''
    const temp = document.createElement('div')
    temp.textContent = html
    element.textContent = temp.textContent
}

export const sanitizeModuleDisplay = (text) => {
    // For module names, descriptions, settings — strip any HTML
    if (!text) return ''
    return String(text).replace(/<[^>]*>/g, '')
}
