import WebTorrent from 'https://esm.sh/webtorrent@3.0.21/dist/webtorrent.min.js'

const seedFiles = document.querySelector('#seedFiles')
const seedButton = document.querySelector('#seedButton')
const seedResult = document.querySelector('#seedResult')
const magnet = document.querySelector('#magnet')
const downloadMagnet = document.querySelector('#downloadMagnet')
const torrentFile = document.querySelector('#torrentFile')
const downloadFile = document.querySelector('#downloadFile')
const status = document.querySelector('#status')
const downloads = document.querySelector('#downloads')

const client = new WebTorrent()
const objectUrls = new Set()

function setStatus(message) {
  status.textContent = message
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** exponent).toFixed(exponent ? 2 : 0)} ${units[exponent]}`
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  objectUrls.add(url)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.textContent = `Download ${name}`
  link.rel = 'noopener'
  return link
}

function renderTorrent(torrent, mode) {
  const card = document.createElement('section')
  card.className = 'torrent'
  const title = document.createElement('strong')
  title.textContent = torrent.name || 'Torrent'
  const meta = document.createElement('div')
  meta.className = 'meta'
  const info = document.createElement('div')
  info.className = 'meta'
  const progress = document.createElement('progress')
  progress.max = 1
  progress.value = torrent.progress || 0
  const links = document.createElement('div')
  links.style.marginTop = '10px'
  card.append(title, meta, info, progress, links)
  downloads.prepend(card)

  const update = () => {
    progress.value = torrent.progress || 0
    meta.textContent = `${Math.round((torrent.progress || 0) * 100)}% · ${torrent.numPeers} peers · ↓ ${formatBytes(torrent.downloadSpeed)}/s · ↑ ${formatBytes(torrent.uploadSpeed)}/s`
    info.textContent = `${formatBytes(torrent.length)} · ${torrent.files.length} file(s)`
  }
  update()
  torrent.on('download', update)
  torrent.on('upload', update)
  torrent.on('wire', update)
  torrent.on('done', async () => {
    update()
    setStatus(`${mode === 'seed' ? 'Torrent created' : 'Torrent downloaded'}: ${torrent.name}`)
    links.replaceChildren()
    for (const file of torrent.files) {
      const blob = await file.blob()
      links.append(saveBlob(blob, file.name), document.createTextNode(' '))
    }
  })
  torrent.on('error', error => setStatus(`Torrent error: ${error.message}`))
  return card
}

client.on('error', error => setStatus(`WebTorrent error: ${error.message}`))

seedButton.addEventListener('click', () => {
  if (!seedFiles.files.length) {
    setStatus('Select at least one file first.')
    return
  }
  seedButton.disabled = true
  setStatus('Creating torrent and announcing to WebRTC trackers…')
  client.seed(Array.from(seedFiles.files), torrent => {
    seedResult.classList.remove('hidden')
    seedResult.replaceChildren()
    const title = document.createElement('strong')
    title.textContent = torrent.name
    const info = document.createElement('div')
    info.className = 'meta'
    info.textContent = `Info hash: ${torrent.infoHash}`
    const magnetInput = document.createElement('input')
    magnetInput.readOnly = true
    magnetInput.value = torrent.magnetURI
    const torrentLink = saveBlob(torrent.torrentFileBlob, `${torrent.name}.torrent`)
    torrentLink.style.display = 'inline-block'
    torrentLink.style.marginTop = '10px'
    seedResult.append(title, info, magnetInput, torrentLink)
    renderTorrent(torrent, 'seed')
    setStatus('Torrent is seeding. Keep this tab open while another peer downloads the files.')
    seedButton.disabled = false
  })
})

function addTorrent(source) {
  if (!source) return
  downloadMagnet.disabled = true
  downloadFile.disabled = true
  setStatus('Loading torrent metadata and looking for WebRTC peers…')
  const torrent = client.add(source, () => {
    renderTorrent(torrent, 'download')
    setStatus(`Connected to torrent: ${torrent.name}`)
  })
  torrent.on('error', error => setStatus(`Download error: ${error.message}`))
  torrent.on('noPeers', ({ announcement }) => {
    setStatus(`No peers found yet. Waiting for WebRTC peers (${announcement || 'tracker'})…`)
  })
  torrent.on('warning', warning => setStatus(`Torrent warning: ${warning.message || warning}`))
  torrent.on('done', () => {
    downloadMagnet.disabled = false
    downloadFile.disabled = false
  })
}

downloadMagnet.addEventListener('click', () => addTorrent(magnet.value.trim()))
downloadFile.addEventListener('click', async () => {
  const file = torrentFile.files[0]
  if (!file) {
    setStatus('Select a .torrent file first.')
    return
  }
  try {
    setStatus('Reading .torrent metadata…')
    const bytes = new Uint8Array(await file.arrayBuffer())
    addTorrent(bytes)
  } catch (error) {
    setStatus(`Unable to read .torrent file: ${error.message}`)
  }
})

window.addEventListener('beforeunload', () => {
  for (const url of objectUrls) URL.revokeObjectURL(url)
  client.destroy()
})

if (!WebTorrent.WEBRTC_SUPPORT) {
  seedButton.disabled = true
  downloadMagnet.disabled = true
  downloadFile.disabled = true
  setStatus('This browser does not provide WebRTC support required for browser WebTorrent.')
}
