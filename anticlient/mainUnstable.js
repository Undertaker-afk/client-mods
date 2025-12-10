// anticlient/src/core/Module.js
var Module = class {
  constructor(id, name, category, description, defaultSettings = {}) {
    this.id = id;
    this.name = name;
    this.category = category;
    this.description = description;
    this.enabled = false;
    this.settings = defaultSettings;
    this.bind = null;
    this.uiElement = null;
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.uiElement) {
      if (this.enabled) this.uiElement.classList.add("enabled");
      else this.uiElement.classList.remove("enabled");
    }
    this.onToggle(this.enabled);
  }
  onToggle(enabled) {
  }
  onTick(bot) {
  }
  onRender(bot) {
  }
};
var categories = {
  "Combat": [],
  "Movement": [],
  "Render": [],
  "Player": []
};
var modules = {};
var registerModule = (module) => {
  if (!categories[module.category]) categories[module.category] = [];
  categories[module.category].push(module);
  modules[module.id] = module;
};

// anticlient/src/modules/combat.js
var loadCombatModules = () => {
  const killaura = new Module("killaura", "Kill Aura", "Combat", "Automatically attacks entities around you", { range: 4.5, speed: 10 });
  killaura.onTick = (bot) => {
    if (!killaura.lastAttack) killaura.lastAttack = 0;
    const now = Date.now();
    if (now - killaura.lastAttack < 1e3 / killaura.settings.speed) return;
    const target = bot.nearestEntity((e) => (e.type === "player" || e.type === "mob") && e.position.distanceTo(bot.entity.position) < killaura.settings.range && e !== bot.entity);
    if (target) {
      bot.lookAt(target.position.offset(0, target.height * 0.85, 0));
      bot.attack(target);
      killaura.lastAttack = now;
    }
  };
  registerModule(killaura);
};

// anticlient/src/modules/movement.js
var loadMovementModules = () => {
  const flight = new Module("flight", "Flight", "Movement", "Allows you to fly like in creative mode", { speed: 1 });
  flight.onTick = (bot) => {
    bot.entity.velocity.y = 0;
    const speed2 = flight.settings.speed;
    if (bot.controlState.jump) bot.entity.velocity.y = speed2;
    if (bot.controlState.sneak) bot.entity.velocity.y = -speed2;
    const yaw = bot.entity.yaw;
    if (bot.controlState.forward) {
      bot.entity.velocity.x = -Math.sin(yaw) * speed2;
      bot.entity.velocity.z = -Math.cos(yaw) * speed2;
    } else if (bot.controlState.back) {
      bot.entity.velocity.x = Math.sin(yaw) * speed2;
      bot.entity.velocity.z = Math.cos(yaw) * speed2;
    }
  };
  registerModule(flight);
  const speed = new Module("speed", "Speed", "Movement", "Moves faster on ground", { multiplier: 1.5 });
  speed.onTick = (bot) => {
    if (bot.entity.onGround && (bot.controlState.forward || bot.controlState.left || bot.controlState.right || bot.controlState.back)) {
      bot.entity.velocity.x *= speed.settings.multiplier;
      bot.entity.velocity.z *= speed.settings.multiplier;
    }
  };
  registerModule(speed);
  const jesus = new Module("jesus", "Jesus", "Movement", "Walk on water", {});
  jesus.onTick = (bot) => {
    const inLiquid = bot.blockAt(bot.entity.position)?.name.includes("water") || bot.entity.isInWater;
    if (inLiquid) {
      bot.entity.velocity.y = 0.1;
      bot.entity.onGround = true;
    }
  };
  registerModule(jesus);
  const step = new Module("step", "Step", "Movement", "Instantly step up blocks", { height: 2 });
  let originalStepHeight = 0.6;
  step.onToggle = (enabled) => {
    if (!window.bot) return;
    if (enabled) {
      originalStepHeight = window.bot.physics?.stepHeight || 0.6;
      if (window.bot.physics) window.bot.physics.stepHeight = step.settings.height;
    } else {
      if (window.bot.physics) window.bot.physics.stepHeight = originalStepHeight;
    }
  };
  registerModule(step);
  const spider = new Module("spider", "Spider", "Movement", "Climb walls", {});
  spider.onTick = (bot) => {
    if (bot.entity.isCollidedHorizontally) {
      bot.entity.velocity.y = 0.2;
    }
  };
  registerModule(spider);
  const nofall = new Module("nofall", "NoFall", "Movement", "Avoid fall damage", {});
  nofall.onTick = (bot) => {
    if (bot.entity.velocity.y < -0.5) {
      bot.entity.onGround = true;
    }
  };
  registerModule(nofall);
};

// anticlient/src/modules/render.js
var loadRenderModules = () => {
  const fullbright = new Module("fullbright", "Fullbright", "Render", "See in the dark", { gamma: 1 });
  registerModule(fullbright);
  const esp = new Module("esp", "ESP", "Render", "See entities through walls", { color: "#00ff00" });
  esp.onToggle = (enabled) => {
    if (!window.anticlient) window.anticlient = { visuals: {} };
    if (!window.anticlient.visuals) window.anticlient.visuals = {};
    window.anticlient.visuals.esp = enabled;
  };
  registerModule(esp);
};

// anticlient/src/modules/player.js
var loadPlayerModules = () => {
  const autoEat = new Module("autoeat", "Auto Eat", "Player", "Automatically eats food when hungry", {});
  autoEat.onTick = (bot) => {
    if (bot.food < 16 && !autoEat.eating) {
      const food = bot.inventory.items().find((item) => item.name.includes("cooked") || item.name.includes("apple") || item.name.includes("steak"));
      if (food) {
        autoEat.eating = true;
        bot.equip(food, "hand").then(() => bot.consume()).then(() => autoEat.eating = false).catch(() => autoEat.eating = false);
      }
    }
  };
  registerModule(autoEat);
};

// anticlient/src/ui/index.js
var initUI = () => {
  const uiRoot = document.createElement("div");
  uiRoot.id = "anticlient-root";
  uiRoot.style.position = "fixed";
  uiRoot.style.top = "20px";
  uiRoot.style.left = "20px";
  uiRoot.style.zIndex = "10000";
  uiRoot.style.fontFamily = "'Consolas', 'Monaco', monospace";
  uiRoot.style.userSelect = "none";
  uiRoot.style.display = "none";
  const toggleUi = () => {
    uiRoot.style.display = uiRoot.style.display === "none" ? "block" : "none";
  };
  window.addEventListener("keydown", (e) => {
    if (e.code === "ShiftRight" && !document.activeElement.tagName.match(/INPUT|TEXTAREA/)) {
      toggleUi();
    }
    if (!document.activeElement.tagName.match(/INPUT|TEXTAREA/)) {
      Object.values(modules).forEach((mod) => {
        if (mod.bind && e.code === mod.bind) {
          mod.toggle();
        }
      });
    }
  });
  const style = document.createElement("style");
  style.textContent = `
    .ac-window {
        background-color: #0f0f13;
        border: 2px solid #7c4dff;
        border-radius: 8px;
        width: 450px;
        box-shadow: 0 0 15px rgba(124, 77, 255, 0.3);
        color: #e0e0e0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    .ac-header {
        background-color: #1a1a20;
        padding: 10px 15px;
        border-bottom: 2px solid #7c4dff;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
    }
    .ac-title {
        font-weight: bold;
        color: #b388ff;
        font-size: 1.1em;
        letter-spacing: 1px;
    }
    .ac-tabs {
        display: flex;
        background-color: #15151a;
        margin: 0;
        padding: 0;
    }
    .ac-tab {
        flex: 1;
        text-align: center;
        padding: 10px 0;
        cursor: pointer;
        background-color: #15151a;
        transition: background-color 0.2s, color 0.2s;
        border-bottom: 2px solid transparent;
        color: #777;
    }
    .ac-tab:hover {
        background-color: #20202a;
        color: #fff;
    }
    .ac-tab.active {
        color: #b388ff;
        border-bottom: 2px solid #b388ff;
        background-color: #252530;
    }
    .ac-content {
        padding: 15px;
        max-height: 400px;
        overflow-y: auto;
        background-color: #0f0f13;
    }
    .ac-module {
        background-color: #1a1a20;
        margin-bottom: 8px;
        padding: 10px;
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        border-left: 3px solid #333;
        transition: border-left-color 0.2s;
    }
    .ac-module.enabled {
        border-left: 3px solid #00e676;
    }
    .ac-module-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
    }
    .ac-module-name {
        font-weight: bold;
    }
    .ac-module-settings {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #333;
        display: none;
    }
    .ac-module-settings.open {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .ac-setting-row { 
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.9em;
    }
    .ac-input-number {
        background: #000;
        border: 1px solid #444;
        color: white;
        width: 50px;
        padding: 2px;
        border-radius: 2px;
    }
    .ac-checkbox {
       accent-color: #7c4dff;
    }
    .ac-content::-webkit-scrollbar {
        width: 8px;
    }
    .ac-content::-webkit-scrollbar-track {
        background: #0f0f13;
    }
    .ac-content::-webkit-scrollbar-thumb {
        background: #333;
        border-radius: 4px;
    }
    `;
  document.head.appendChild(style);
  const windowEl = document.createElement("div");
  windowEl.className = "ac-window";
  uiRoot.appendChild(windowEl);
  const header = document.createElement("div");
  header.className = "ac-header";
  header.innerHTML = '<span class="ac-title">ANTICLIENT</span> <span style="font-size: 0.8em; color: gray">v1.3</span>';
  windowEl.appendChild(header);
  const tabsContainer = document.createElement("div");
  tabsContainer.className = "ac-tabs";
  windowEl.appendChild(tabsContainer);
  const contentContainer = document.createElement("div");
  contentContainer.className = "ac-content";
  windowEl.appendChild(contentContainer);
  document.body.appendChild(uiRoot);
  let activeTab = "Movement";
  const renderModules = () => {
    contentContainer.innerHTML = "";
    const catMods = categories[activeTab] || [];
    catMods.forEach((mod) => {
      const modEl = document.createElement("div");
      modEl.className = "ac-module" + (mod.enabled ? " enabled" : "");
      mod.uiElement = modEl;
      const header2 = document.createElement("div");
      header2.className = "ac-module-header";
      header2.innerHTML = `<span class="ac-module-name">${mod.name}</span> <span style="font-size:0.8em; color: #555">\u25BC</span>`;
      header2.onclick = () => mod.toggle();
      header2.oncontextmenu = (e) => {
        e.preventDefault();
        const settingsEl = modEl.querySelector(".ac-module-settings");
        settingsEl.classList.toggle("open");
      };
      modEl.appendChild(header2);
      const settingsDiv = document.createElement("div");
      settingsDiv.className = "ac-module-settings";
      Object.keys(mod.settings).forEach((key) => {
        const row = document.createElement("div");
        row.className = "ac-setting-row";
        const label = document.createElement("span");
        label.textContent = key;
        row.appendChild(label);
        const val = mod.settings[key];
        if (typeof val === "number") {
          const input = document.createElement("input");
          input.type = "number";
          input.className = "ac-input-number";
          input.value = val;
          input.step = 0.1;
          input.onchange = (e) => mod.settings[key] = parseFloat(e.target.value);
          row.appendChild(input);
        } else if (typeof val === "boolean") {
          const input = document.createElement("input");
          input.type = "checkbox";
          input.className = "ac-checkbox";
          input.checked = val;
          input.onchange = (e) => mod.settings[key] = e.target.checked;
          row.appendChild(input);
        } else {
          const input = document.createElement("input");
          input.value = val;
          input.style.background = "black";
          input.style.color = "white";
          input.style.border = "1px solid #444";
          input.onchange = (e) => mod.settings[key] = e.target.value;
          row.appendChild(input);
        }
        settingsDiv.appendChild(row);
      });
      const bindRow = document.createElement("div");
      bindRow.className = "ac-setting-row";
      const bindLabel = document.createElement("span");
      bindLabel.textContent = "Bind";
      bindRow.appendChild(bindLabel);
      const bindBtn = document.createElement("button");
      bindBtn.style.background = "#333";
      bindBtn.style.color = "white";
      bindBtn.style.border = "1px solid #444";
      bindBtn.style.cursor = "pointer";
      bindBtn.textContent = mod.bind || "None";
      bindBtn.onclick = () => {
        bindBtn.textContent = "Press Key...";
        const handler = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.code === "Escape") {
            mod.bind = null;
            bindBtn.textContent = "None";
          } else {
            mod.bind = e.code;
            bindBtn.textContent = e.code;
          }
          window.removeEventListener("keydown", handler, { capture: true });
        };
        window.addEventListener("keydown", handler, { capture: true });
      };
      bindRow.appendChild(bindBtn);
      settingsDiv.appendChild(bindRow);
      modEl.appendChild(settingsDiv);
      contentContainer.appendChild(modEl);
    });
  };
  const renderTabs = () => {
    tabsContainer.innerHTML = "";
    Object.keys(categories).forEach((cat) => {
      const tab = document.createElement("div");
      tab.className = "ac-tab" + (cat === activeTab ? " active" : "");
      tab.textContent = cat;
      tab.onclick = () => {
        activeTab = cat;
        renderTabs();
        renderModules();
      };
      tabsContainer.appendChild(tab);
    });
  };
  renderTabs();
  renderModules();
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;
  header.addEventListener("mousedown", dragStart);
  window.addEventListener("mouseup", dragEnd);
  window.addEventListener("mousemove", drag);
  function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    if (e.target === header || e.target.closest(".ac-header")) {
      isDragging = true;
    }
  }
  function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
  }
  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      xOffset = currentX;
      yOffset = currentY;
      setTranslate(currentX, currentY, uiRoot);
    }
  }
  function setTranslate(xPos, yPos, el) {
    el.style.transform = "translate3d(" + xPos + "px, " + yPos + "px, 0)";
  }
};

// anticlient/entry.js
var entry_default = (mod) => {
  console.log("[Anticlient] Initializing Modular Architecture...");
  loadCombatModules();
  loadMovementModules();
  loadRenderModules();
  loadPlayerModules();
  initUI();
  let bot = void 0;
  const loop = () => {
    if (!bot && window.bot) bot = window.bot;
    if (bot) {
      Object.values(modules).forEach((mod2) => {
        if (mod2.enabled) mod2.onTick(bot);
      });
    }
    requestAnimationFrame(loop);
  };
  loop();
};
export {
  entry_default as default
};
