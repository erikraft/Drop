// Font Awesome Free 6.7.2 by @fontawesome, volume-high and volume-xmark.
// CC BY 4.0: https://fontawesome.com/license/free
const volumeHighPath =
  "M533.6 32.5C598.5 85.2 640 165.8 640 256s-41.5 170.7-106.4 223.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C557.5 398.2 592 331.2 592 256s-34.5-142.2-88.7-186.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM473.1 107c43.2 35.2 70.9 88.9 70.9 149s-27.7 113.8-70.9 149c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C475.3 341.3 496 301.1 496 256s-20.7-85.3-53.2-111.8c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm-60.5 74.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM301.1 34.8C312.6 40 320 51.4 320 64l0 384c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352 64 352c-35.3 0-64-28.7-64-64l0-64c0-35.3 28.7-64 64-64l67.8 0L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3z";
const volumeXmarkPath =
  "M301.1 34.8C312.6 40 320 51.4 320 64l0 384c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352 64 352c-35.3 0-64-28.7-64-64l0-64c0-35.3 28.7-64 64-64l67.8 0L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3zM425 167l55 55 55-55c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-55 55 55 55c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-55-55-55 55c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l55-55-55-55c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0z";

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
};

const createButton = (label, text) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sstv-audio-player__button";
  button.setAttribute("aria-label", label);
  button.textContent = text;
  return button;
};

const createVolumeIcon = (muted) => {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.classList.add("sstv-audio-player__icon");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  const path = document.createElementNS(namespace, "path");
  svg.append(path);

  const update = (isMuted) => {
    svg.setAttribute("viewBox", isMuted ? "0 0 576 512" : "0 0 640 512");
    path.setAttribute("d", isMuted ? volumeXmarkPath : volumeHighPath);
  };
  update(muted);

  return { svg, update };
};

function initPlayer(player) {
  const audio = player.querySelector("audio");
  if (!audio) return;

  audio.className = "sstv-audio-player__audio";
  audio.controls = false;

  const controls = document.createElement("div");
  controls.className = "sstv-audio-player__controls";

  const playButton = createButton("Play audio", "Play");
  const main = document.createElement("div");
  main.className = "sstv-audio-player__main";
  const seek = document.createElement("input");
  seek.type = "range";
  seek.className = "sstv-audio-player__range";
  seek.min = "0";
  seek.max = "100";
  seek.value = "0";
  seek.setAttribute("aria-label", "Audio progress");
  const meta = document.createElement("div");
  meta.className = "sstv-audio-player__meta";
  const elapsed = document.createElement("span");
  const duration = document.createElement("span");
  elapsed.textContent = "0:00";
  duration.textContent = "0:00";
  meta.append(elapsed, duration);
  main.append(seek, meta);

  const volume = document.createElement("div");
  volume.className = "sstv-audio-player__volume";
  const muteButton = createButton("Mute audio", "");
  const volumeIcon = createVolumeIcon(audio.muted);
  muteButton.append(volumeIcon.svg);
  const volumeRange = document.createElement("input");
  volumeRange.type = "range";
  volumeRange.className = "sstv-audio-player__range";
  volumeRange.min = "0";
  volumeRange.max = "1";
  volumeRange.step = "0.01";
  volumeRange.value = String(audio.volume);
  volumeRange.setAttribute("aria-label", "Audio volume");
  volume.append(muteButton, volumeRange);
  controls.append(playButton, main, volume);
  player.append(controls);

  const syncPlayState = () => {
    const playing = !audio.paused && !audio.ended;
    playButton.textContent = playing ? "Pause" : "Play";
    playButton.setAttribute("aria-label", playing ? "Pause audio" : "Play audio");
  };
  const syncProgress = () => {
    const percent = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    seek.value = String(percent);
    seek.style.setProperty("--audio-progress", `${percent}%`);
    elapsed.textContent = formatTime(audio.currentTime);
    duration.textContent = formatTime(audio.duration);
  };
  const syncMuteState = () => {
    muteButton.setAttribute("aria-label", audio.muted ? "Unmute audio" : "Mute audio");
    volumeIcon.update(audio.muted);
    volumeRange.value = String(audio.volume);
    volumeRange.style.setProperty(
      "--audio-progress",
      `${(audio.muted ? 0 : audio.volume) * 100}%`,
    );
  };

  playButton.addEventListener("click", () => {
    if (audio.paused) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  });
  muteButton.addEventListener("click", () => {
    audio.muted = !audio.muted;
    syncMuteState();
  });
  seek.addEventListener("input", () => {
    if (audio.duration) audio.currentTime = (Number(seek.value) / 100) * audio.duration;
  });
  volumeRange.addEventListener("input", () => {
    audio.volume = Number(volumeRange.value);
    audio.muted = audio.volume === 0;
    syncMuteState();
  });
  audio.addEventListener("play", syncPlayState);
  audio.addEventListener("pause", syncPlayState);
  audio.addEventListener("ended", syncPlayState);
  audio.addEventListener("timeupdate", syncProgress);
  audio.addEventListener("loadedmetadata", syncProgress);
  audio.addEventListener("volumechange", syncMuteState);

  const syncVisibility = () => {
    player.hidden = audio.hidden;
  };
  new MutationObserver(syncVisibility).observe(audio, {
    attributes: true,
    attributeFilter: ["hidden"],
  });
  syncVisibility();
  syncMuteState();
  syncProgress();
}

const initializedPlayers = new WeakSet();

export function initializeAudioPlayer(player) {
  if (!(player instanceof Element) || initializedPlayers.has(player)) return;
  initializedPlayers.add(player);
  initPlayer(player);
}

export function initializeAudioPlayers(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  root.querySelectorAll("[data-audio-player]").forEach(initializeAudioPlayer);
}
