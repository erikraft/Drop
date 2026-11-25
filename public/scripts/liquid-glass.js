(() => {
  "use strict";

  // Browser recreation of the Kube.io optics study: a convex squircle bezel,
  // Snell-based ray offsets, an R/G displacement map, and a specular rim map.
  const SVG_NS = "http://www.w3.org/2000/svg";
  const XLINK_NS = "http://www.w3.org/1999/xlink";
  const RAY_SAMPLES = 127;
  const MAX_MAP_EDGE = 384;
  const MAX_MAP_PIXELS = 65536;
  const REFRACTIVE_INDEX = 1.5;
  const LIGHT_ANGLE = -Math.PI / 3;
  const REDUCED_TRANSPARENCY = window.matchMedia
    ? window.matchMedia("(prefers-reduced-transparency: reduce)")
    : null;
  const TARGETS = [
    "[data-liquid-glass]",
    "body > header",
    "header.site-header",
    ".header-container",
    "header.topbar",
    ".site-header",
    ".site-nav",
    ".nav-shell",
    ".glass-card",
    ".social-card",
    ".hero-card-main",
    ".app-panel",
    ".panel",
    ".chat-panel",
    ".modal-card",
    ".modal-content",
    ".confirm-dialog__panel",
    ".feature-card",
    ".security-strip",
    ".result-stage",
    ".download-card",
    ".project-card",
    ".lang-dropdown",
    ".mobile-menu",
    ".menu-dropdown"
  ].join(",");

  const isChromium = /(?:Chrome|Chromium|Edg|OPR|Brave)/i.test(navigator.userAgent || "");
  const supportsBackdropBlur = window.CSS && CSS.supports
    && (CSS.supports("backdrop-filter", "blur(1px)")
      || CSS.supports("-webkit-backdrop-filter", "blur(1px)"));

  if (!isChromium || !supportsBackdropBlur || REDUCED_TRANSPARENCY?.matches) return;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
  const defs = document.createElementNS(SVG_NS, "defs");
  svg.appendChild(defs);
  (document.body || document.documentElement).appendChild(svg);

  let nextFilterId = 0;
  const states = new Map();

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const setImageHref = (node, value) => {
    node.setAttribute("href", value);
    node.setAttributeNS(XLINK_NS, "xlink:href", value);
  };

  function readRadius(element, width, height) {
    const computed = getComputedStyle(element);
    const raw = computed.borderTopLeftRadius || computed.borderRadius || "16px";
    const parts = raw.split(/[ /]+/);
    const parsed = Number.parseFloat(parts[0]) || 0;
    const radius = raw.includes("%") ? parsed * Math.min(width, height) / 100 : parsed;
    return clamp(radius, 0, Math.min(width, height) / 2);
  }

  function buildRayProfile(glassThickness) {
    const offsets = new Float32Array(RAY_SAMPLES);
    let maximum = 0;
    const epsilon = 1 / RAY_SAMPLES;

    for (let index = 0; index < RAY_SAMPLES; index += 1) {
      const distance = (index + 0.5) / RAY_SAMPLES;
      const left = Math.max(0, distance - epsilon);
      const right = Math.min(1, distance + epsilon);
      const leftHeight = Math.pow(Math.max(0, 1 - Math.pow(1 - left, 4)), 0.25);
      const rightHeight = Math.pow(Math.max(0, 1 - Math.pow(1 - right, 4)), 0.25);
      const slope = Math.abs((rightHeight - leftHeight) / Math.max(epsilon, right - left));
      const incidence = Math.atan(slope);
      const refraction = Math.asin(clamp(Math.sin(incidence) / REFRACTIVE_INDEX, -1, 1));
      const offset = glassThickness * Math.tan(Math.max(0, incidence - refraction));
      offsets[index] = Number.isFinite(offset) ? offset : 0;
      maximum = Math.max(maximum, offsets[index]);
    }

    return { offsets, maximum };
  }

  // Signed distance to a rounded rectangle, plus its outward unit normal.
  function roundedRectSample(x, y, width, height, radius) {
    const centeredX = x - width / 2;
    const centeredY = y - height / 2;
    const qx = Math.abs(centeredX) - (width / 2 - radius);
    const qy = Math.abs(centeredY) - (height / 2 - radius);
    const outsideX = Math.max(qx, 0);
    const outsideY = Math.max(qy, 0);
    const outsideLength = Math.hypot(outsideX, outsideY);
    const signedDistance = outsideLength + Math.min(Math.max(qx, qy), 0) - radius;

    let normalX = 0;
    let normalY = 0;
    if (outsideLength > 0.0001) {
      normalX = Math.sign(centeredX || 1) * outsideX / outsideLength;
      normalY = Math.sign(centeredY || 1) * outsideY / outsideLength;
    } else if (qx > qy) {
      normalX = Math.sign(centeredX || 1);
    } else {
      normalY = Math.sign(centeredY || 1);
    }

    return { edgeDistance: -signedDistance, normalX, normalY };
  }

  function makeMaps(width, height, radius, bezelWidth, profile) {
    const ratio = Math.min(
      1,
      MAX_MAP_EDGE / Math.max(width, height),
      Math.sqrt(MAX_MAP_PIXELS / Math.max(1, width * height))
    );
    const mapWidth = Math.max(1, Math.round(width * ratio));
    const mapHeight = Math.max(1, Math.round(height * ratio));
    const scaleX = mapWidth / width;
    const scaleY = mapHeight / height;
    const displacementCanvas = document.createElement("canvas");
    const highlightCanvas = document.createElement("canvas");
    displacementCanvas.width = highlightCanvas.width = mapWidth;
    displacementCanvas.height = highlightCanvas.height = mapHeight;

    const displacementContext = displacementCanvas.getContext("2d", { willReadFrequently: true });
    const highlightContext = highlightCanvas.getContext("2d", { willReadFrequently: true });
    if (!displacementContext || !highlightContext) return null;

    const displacementImage = displacementContext.createImageData(mapWidth, mapHeight);
    const highlightImage = highlightContext.createImageData(mapWidth, mapHeight);
    const displacementPixels = displacementImage.data;
    const highlightPixels = highlightImage.data;
    const lightX = Math.cos(LIGHT_ANGLE);
    const lightY = Math.sin(LIGHT_ANGLE);
    const maxOffset = Math.max(profile.maximum, 0.0001);

    for (let y = 0; y < mapHeight; y += 1) {
      for (let x = 0; x < mapWidth; x += 1) {
        const cssX = (x + 0.5) / scaleX;
        const cssY = (y + 0.5) / scaleY;
        const sample = roundedRectSample(cssX, cssY, width, height, radius);
        const offset = (y * mapWidth + x) * 4;
        let red = 128;
        let green = 128;
        let highlightAlpha = 0;

        if (sample.edgeDistance >= 0 && sample.edgeDistance < bezelWidth) {
          const progress = sample.edgeDistance / bezelWidth;
          const sampleIndex = Math.min(RAY_SAMPLES - 1, Math.floor(progress * RAY_SAMPLES));
          const magnitude = profile.offsets[sampleIndex] / maxOffset;
          // A convex bezel bends samples toward the interior of the glass.
          red = Math.round(128 - sample.normalX * magnitude * 127);
          green = Math.round(128 - sample.normalY * magnitude * 127);

          const lightFacing = Math.max(0, sample.normalX * lightX + sample.normalY * lightY);
          const rim = Math.pow(lightFacing, 6) * Math.pow(1 - progress, 0.55);
          highlightAlpha = Math.round(clamp(rim * 42, 0, 42));
        }

        displacementPixels[offset] = clamp(red, 0, 255);
        displacementPixels[offset + 1] = clamp(green, 0, 255);
        displacementPixels[offset + 2] = 128;
        displacementPixels[offset + 3] = 255;
        highlightPixels[offset] = 255;
        highlightPixels[offset + 1] = 255;
        highlightPixels[offset + 2] = 255;
        highlightPixels[offset + 3] = highlightAlpha;
      }
    }

    displacementContext.putImageData(displacementImage, 0, 0);
    highlightContext.putImageData(highlightImage, 0, 0);
    return {
      displacement: displacementCanvas.toDataURL("image/png"),
      highlight: highlightCanvas.toDataURL("image/png"),
      maximumDisplacement: profile.maximum
    };
  }

  function createFilter(state) {
    const filter = document.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", state.id);
    filter.setAttribute("filterUnits", "objectBoundingBox");
    filter.setAttribute("primitiveUnits", "userSpaceOnUse");
    filter.setAttribute("x", "-0.06");
    filter.setAttribute("y", "-0.06");
    filter.setAttribute("width", "1.12");
    filter.setAttribute("height", "1.12");
    filter.setAttribute("color-interpolation-filters", "sRGB");

    const displacementImage = document.createElementNS(SVG_NS, "feImage");
    displacementImage.setAttribute("result", "liquid-displacement-map");
    displacementImage.setAttribute("preserveAspectRatio", "none");

    const displacement = document.createElementNS(SVG_NS, "feDisplacementMap");
    displacement.setAttribute("in", "SourceGraphic");
    displacement.setAttribute("in2", "liquid-displacement-map");
    displacement.setAttribute("xChannelSelector", "R");
    displacement.setAttribute("yChannelSelector", "G");
    displacement.setAttribute("result", "liquid-refracted");

    const highlightImage = document.createElementNS(SVG_NS, "feImage");
    highlightImage.setAttribute("result", "liquid-specular-highlight");
    highlightImage.setAttribute("preserveAspectRatio", "none");

    const blend = document.createElementNS(SVG_NS, "feBlend");
    blend.setAttribute("in", "liquid-refracted");
    blend.setAttribute("in2", "liquid-specular-highlight");
    blend.setAttribute("mode", "screen");

    filter.append(displacementImage, displacement, highlightImage, blend);
    defs.appendChild(filter);
    state.filter = filter;
    state.displacementImage = displacementImage;
    state.displacement = displacement;
    state.highlightImage = highlightImage;
  }

  function render(state) {
    const element = state.element;
    if (!element.isConnected) return;
    const rect = element.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width < 20 || height < 20) return;
    if (width === state.width && height === state.height) return;

    const radius = readRadius(element, width, height);
    const bezelWidth = Math.min(14, Math.max(5, Math.min(width, height) * 0.07));
    const glassThickness = Math.min(8, Math.max(3.5, bezelWidth * 0.62));
    const profile = buildRayProfile(glassThickness);
    const maps = makeMaps(width, height, radius, bezelWidth, profile);
    if (!maps) return;

    state.displacementImage.setAttribute("x", "0");
    state.displacementImage.setAttribute("y", "0");
    state.displacementImage.setAttribute("width", String(width));
    state.displacementImage.setAttribute("height", String(height));
    setImageHref(state.displacementImage, maps.displacement);
    state.displacement.setAttribute("scale", String(maps.maximumDisplacement));

    state.highlightImage.setAttribute("x", "0");
    state.highlightImage.setAttribute("y", "0");
    state.highlightImage.setAttribute("width", String(width));
    state.highlightImage.setAttribute("height", String(height));
    setImageHref(state.highlightImage, maps.highlight);

    const filterReference = "url(#" + state.id + ")";
    element.style.setProperty("backdrop-filter", filterReference);
    element.style.setProperty("-webkit-backdrop-filter", filterReference);
    element.classList.add("erikraft-liquid-glass-optical");
    state.width = width;
    state.height = height;
  }

  function schedule(state) {
    if (state.pending) return;
    state.pending = true;
    requestAnimationFrame(() => {
      state.pending = false;
      render(state);
    });
  }

  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(entries => {
      entries.forEach(entry => {
        const state = states.get(entry.target);
        if (state) schedule(state);
      });
    })
    : null;

  function register(element) {
    if (!(element instanceof HTMLElement) || states.has(element)) return;
    const state = {
      element,
      id: "erikraft-liquid-glass-" + (++nextFilterId),
      width: 0,
      height: 0,
      pending: false
    };
    createFilter(state);
    states.set(element, state);
    if (resizeObserver) resizeObserver.observe(element);
    schedule(state);
  }

  function scan(root) {
    if (root instanceof Element && root.matches(TARGETS)) register(root);
    if (root && typeof root.querySelectorAll === "function") {
      root.querySelectorAll(TARGETS).forEach(register);
    }
  }

  function removeDisconnected() {
    for (const [element, state] of states) {
      if (!element.isConnected) {
        state.filter?.remove();
        states.delete(element);
      }
    }
  }

  function start() {
    scan(document);
    const mutationObserver = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(node => {
          if (node instanceof Element) scan(node);
        });
      });
      removeDisconnected();
    });
    mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  if (REDUCED_TRANSPARENCY?.addEventListener) {
    REDUCED_TRANSPARENCY.addEventListener("change", event => {
      if (event.matches) {
        for (const [element, state] of states) {
          element.style.removeProperty("backdrop-filter");
          element.style.removeProperty("-webkit-backdrop-filter");
          element.classList.remove("erikraft-liquid-glass-optical");
          state.filter?.remove();
        }
        states.clear();
      } else {
        scan(document);
      }
    });
  }
})();