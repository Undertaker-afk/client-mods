var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// anticlient-dev/src/utils.js
var utils_exports = {};
__export(utils_exports, {
  dumpWorldInfo: () => dumpWorldInfo,
  getBlockStateIds: () => getBlockStateIds,
  getMcData: () => getMcData,
  inspectSection: () => inspectSection,
  listSections: () => listSections,
  logger: () => logger,
  parseColor: () => parseColor,
  waitForBot: () => waitForBot,
  waitForWorld: () => waitForWorld
});
function waitForWorld(timeoutMs = 15e3) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const world = window.world;
      if (world && world.sectionObjects && world.scene && world.material) {
        resolve(world);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Timed out waiting for window.world"));
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });
}
function waitForBot(timeoutMs = 15e3) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (window.bot && window.bot.entity) {
        resolve(window.bot);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Timed out waiting for window.bot"));
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });
}
function getMcData() {
  return window.loadedData || window.mcData || globalThis?.mcData;
}
function getBlockStateIds(blockName) {
  const mcData = getMcData();
  if (!mcData?.blocksByName) return [];
  const block = mcData.blocksByName[blockName];
  if (!block) return [];
  const ids = [];
  if (block.minStateId !== void 0 && block.maxStateId !== void 0) {
    for (let id = block.minStateId; id <= block.maxStateId; id++) {
      ids.push(id);
    }
  } else if (block.defaultState !== void 0) {
    ids.push(block.defaultState);
  }
  return ids;
}
function parseColor(str) {
  if (typeof str === "number") return str;
  return parseInt(str.replace("#", "0x"), 16);
}
var logger = {
  log: (...args) => console.log("[AC-Dev]", ...args),
  warn: (...args) => console.warn("[AC-Dev]", ...args),
  error: (...args) => console.error("[AC-Dev]", ...args),
  info: (...args) => console.info("[AC-Dev]", ...args),
  debug: (...args) => console.debug("[AC-Dev]", ...args)
};
function dumpWorldInfo() {
  const world = window.world;
  if (!world) {
    logger.warn("World not available yet. Call waitForWorld() first.");
    return null;
  }
  const info = {
    hasScene: !!world.scene,
    hasMaterial: !!world.material,
    hasCamera: !!world.camera,
    sectionCount: Object.keys(world.sectionObjects || {}).length,
    onRenderCount: (world.onRender || []).length,
    materialType: world.material?.type,
    materialTransparent: world.material?.transparent,
    materialOpacity: world.material?.opacity
  };
  logger.log("World Info:", info);
  return info;
}
function listSections() {
  const world = window.world;
  if (!world?.sectionObjects) {
    logger.warn("World not available");
    return [];
  }
  const keys = Object.keys(world.sectionObjects);
  logger.log(`Found ${keys.length} sections`);
  return keys;
}
function inspectSection(key) {
  const world = window.world;
  if (!world?.sectionObjects) {
    logger.warn("World not available");
    return null;
  }
  const section = world.sectionObjects[key];
  if (!section) {
    logger.warn(`Section ${key} not found`);
    return null;
  }
  const info = {
    key,
    type: section.type,
    childCount: section.children?.length || 0,
    visible: section.visible,
    position: section.position ? { x: section.position.x, y: section.position.y, z: section.position.z } : null,
    meshes: []
  };
  section.traverse((child) => {
    if (child.isMesh) {
      info.meshes.push({
        name: child.name,
        materialType: child.material?.type,
        vertexCount: child.geometry?.attributes?.position?.count
      });
    }
  });
  logger.log("Section Info:", info);
  return info;
}

// anticlient-dev/src/test.js
async function init(ctx) {
  logger.log("Test code initializing...");
  try {
    const world = await waitForWorld();
    ctx.world = world;
    logger.log("World ready!");
    logger.log("Scene children:", world.scene.children.length);
    logger.log("Material type:", world.material.type);
  } catch (err) {
    logger.error("Test init failed:", err);
  }
}
function cleanup(ctx) {
  logger.log("Test code cleaning up...");
}

// anticlient-dev/src/entry.js
var entry_default = (mod) => {
  console.log("[Anticlient-Dev] Debug mod loaded");
  const { logger: logger2 } = utils_exports;
  const state = {
    world: null,
    bot: null,
    testObjects: [],
    renderCallbacks: [],
    originalMaterials: /* @__PURE__ */ new Map()
  };
  const ctx = {
    state,
    world: null,
    bot: null,
    THREE: window.THREE
  };
  async function testGlassXray(options = {}) {
    const { opacity = 0.3, depthWrite = false } = options;
    const world = await waitForWorld().catch((err) => {
      logger2.error("Failed to get world:", err);
      return null;
    });
    if (!world) return;
    if (!state.originalMaterials.has("main")) {
      state.originalMaterials.set("main", {
        transparent: world.material.transparent,
        opacity: world.material.opacity,
        depthWrite: world.material.depthWrite
      });
    }
    world.material.transparent = true;
    world.material.opacity = opacity;
    world.material.depthWrite = depthWrite;
    world.material.needsUpdate = true;
    for (const [key, section] of Object.entries(world.sectionObjects)) {
      if (!section) continue;
      section.traverse((child) => {
        if (child.isMesh && child.material) {
          if (!child.userData._acDevOrig) {
            child.userData._acDevOrig = {
              transparent: child.material.transparent,
              opacity: child.material.opacity,
              depthWrite: child.material.depthWrite
            };
          }
          child.material.transparent = true;
          child.material.opacity = opacity;
          child.material.depthWrite = depthWrite;
          child.material.needsUpdate = true;
        }
      });
    }
    logger2.log(`Glass Xray enabled: opacity=${opacity}`);
  }
  async function restore() {
    const world = await waitForWorld().catch(() => null);
    if (!world) return;
    const mainOrig = state.originalMaterials.get("main");
    if (mainOrig) {
      world.material.transparent = mainOrig.transparent;
      world.material.opacity = mainOrig.opacity;
      world.material.depthWrite = mainOrig.depthWrite;
      world.material.needsUpdate = true;
      state.originalMaterials.delete("main");
    }
    for (const section of Object.values(world.sectionObjects)) {
      if (!section) continue;
      section.traverse((child) => {
        if (child.isMesh && child.material && child.userData._acDevOrig) {
          const orig = child.userData._acDevOrig;
          child.material.transparent = orig.transparent;
          child.material.opacity = orig.opacity;
          child.material.depthWrite = orig.depthWrite;
          child.material.needsUpdate = true;
          delete child.userData._acDevOrig;
        }
      });
    }
    logger2.log("Materials restored");
  }
  async function addTestBox(options = {}) {
    const { color = 65280, size = 1, offset = { x: 0, y: 2, z: 0 } } = options;
    const world = await waitForWorld().catch(() => null);
    if (!world?.scene || !window.THREE) {
      logger2.warn("World or THREE not available");
      return null;
    }
    const THREE = window.THREE;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      depthTest: false
    });
    const box = new THREE.Mesh(geometry, material);
    const playerPos = window.bot?.entity?.position;
    if (playerPos) {
      box.position.set(playerPos.x + offset.x, playerPos.y + offset.y, playerPos.z + offset.z);
    }
    box.frustumCulled = false;
    box.renderOrder = 999;
    box.userData._acDevTest = true;
    world.scene.add(box);
    state.testObjects.push(box);
    logger2.log("Added test box at:", box.position);
    return box;
  }
  async function clearTestObjects() {
    const world = await waitForWorld().catch(() => null);
    if (!world?.scene) return;
    for (const obj of state.testObjects) {
      world.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
    state.testObjects = [];
    logger2.log("Test objects cleared");
  }
  async function addRenderCallback(name, fn) {
    const world = await waitForWorld().catch(() => null);
    if (!world?.onRender) {
      logger2.warn("world.onRender not available");
      return;
    }
    const wrapped = () => {
      try {
        fn(world);
      } catch (e) {
        logger2.error(`Callback "${name}" error:`, e);
      }
    };
    wrapped._name = name;
    world.onRender.push(wrapped);
    state.renderCallbacks.push(wrapped);
    logger2.log(`Added render callback: ${name}`);
  }
  async function clearRenderCallbacks() {
    const world = await waitForWorld().catch(() => null);
    if (!world?.onRender) return;
    for (const cb of state.renderCallbacks) {
      const idx = world.onRender.indexOf(cb);
      if (idx !== -1) world.onRender.splice(idx, 1);
    }
    state.renderCallbacks = [];
    logger2.log("Render callbacks cleared");
  }
  const api = {
    // Utilities (from utils.js)
    ...utils_exports,
    // Built-in tools
    testGlassXray,
    restore,
    addTestBox,
    clearTestObjects,
    addRenderCallback,
    clearRenderCallbacks,
    // Access to state and context
    get state() {
      return state;
    },
    get ctx() {
      return ctx;
    },
    get world() {
      return ctx.world || window.world;
    },
    get bot() {
      return ctx.bot || window.bot;
    },
    // Re-run test init (useful after editing test.js and hot-reloading)
    async reloadTest() {
      if (cleanup) cleanup(ctx);
      if (init) await init(ctx);
    }
  };
  window.acDev = api;
  if (init) {
    init(ctx).catch((err) => logger2.error("Test init error:", err));
  }
  logger2.log("Debug API ready! Access via window.acDev");
  logger2.log("Edit src/test.js and rebuild to test new features");
  return {
    deactivate: () => {
      if (cleanup) {
        try {
          cleanup(ctx);
        } catch (e) {
          logger2.error("Test cleanup error:", e);
        }
      }
      restore();
      clearTestObjects();
      clearRenderCallbacks();
      delete window.acDev;
      logger2.log("Anticlient-Dev deactivated");
    }
  };
};
export {
  entry_default as default
};
