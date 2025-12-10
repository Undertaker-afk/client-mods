// anticlient/src/core/Module.js
var Module = class {
  constructor(id, name, category, description, defaultSettings = {}, settingsMetadata = {}) {
    this.id = id;
    this.name = name;
    this.category = category;
    this.description = description;
    this.enabled = false;
    this.bind = null;
    this.uiElement = null;
    this.settingsMetadata = settingsMetadata;
    this.settings = new Proxy(defaultSettings, {
      set: (target, prop, value) => {
        const oldValue = target[prop];
        target[prop] = value;
        if (oldValue !== value && this.onSettingChanged) {
          this.onSettingChanged(prop, value, oldValue);
        }
        return true;
      }
    });
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
  onSettingChanged(key, newValue, oldValue) {
  }
};
var categories = {
  "Combat": [],
  "Movement": [],
  "Render": [],
  "Player": [],
  "World": [],
  "Settings": [],
  "Packets": [],
  "Scripting": []
};
var modules = {};
var registerModule = (module) => {
  if (!categories[module.category]) categories[module.category] = [];
  categories[module.category].push(module);
  modules[module.id] = module;
  return module;
};

// anticlient/src/modules/combat.js
var loadCombatModules = () => {
  const logger2 = window.anticlientLogger?.module("Combat") || console;
  let criticalsModule = null;
  const killaura = new Module("killaura", "Kill Aura", "Combat", "Automatically attacks entities around you", { range: 4.5, speed: 10 });
  killaura.onTick = (bot) => {
    if (!killaura.lastAttack) killaura.lastAttack = 0;
    const now = Date.now();
    if (now - killaura.lastAttack < 1e3 / killaura.settings.speed) return;
    const reachModule = modules["reach"];
    const attackRange = reachModule && reachModule.enabled ? reachModule.settings.reach : killaura.settings.range;
    const target = bot.nearestEntity((e) => (e.type === "player" || e.type === "mob") && e.position.distanceTo(bot.entity.position) < attackRange && e !== bot.entity);
    if (target) {
      bot.lookAt(target.position.offset(0, target.height * 0.85, 0));
      bot.attack(target);
      killaura.lastAttack = now;
    }
  };
  registerModule(killaura);
  const aimbot = new Module("aimbot", "Aimbot", "Combat", "Smooth aim towards nearest entity", {
    range: 6,
    smoothness: 0.3,
    // 0 = instant, 1 = very smooth
    target: "both"
    // 'players' | 'mobs' | 'both'
  });
  let currentYaw = 0;
  let currentPitch = 0;
  aimbot.onTick = (bot) => {
    if (!aimbot.enabled) return;
    const filter = aimbot.settings.target === "players" ? ((e) => e.type === "player") : aimbot.settings.target === "mobs" ? ((e) => e.type === "mob") : ((e) => e.type === "player" || e.type === "mob");
    const target = bot.nearestEntity(
      (e) => filter(e) && e.position.distanceTo(bot.entity.position) < aimbot.settings.range && e !== bot.entity
    );
    if (target) {
      const eyePos = bot.entity.position.offset(0, bot.entity.eyeHeight, 0);
      const delta = target.position.offset(0, target.height * 0.85, 0).minus(eyePos);
      const targetYaw = Math.atan2(-delta.x, -delta.z);
      const groundDistance = Math.sqrt(delta.x * delta.x + delta.z * delta.z);
      const targetPitch = Math.atan2(delta.y, groundDistance);
      const smooth = aimbot.settings.smoothness;
      currentYaw = bot.entity.yaw + (targetYaw - bot.entity.yaw) * (1 - smooth);
      currentPitch = bot.entity.pitch + (targetPitch - bot.entity.pitch) * (1 - smooth);
      bot.look(currentYaw, currentPitch, false);
    }
  };
  registerModule(aimbot);
  const reach = new Module("reach", "Reach", "Combat", "Extend attack range", { reach: 3.5 });
  reach.onTick = (bot) => {
  };
  registerModule(reach);
  const criticals = new Module("criticals", "Criticals", "Combat", "Deal critical hits", {
    mode: "Packet",
    jumpHeight: 1
  }, {
    mode: { type: "dropdown", options: ["Legit", "Packet"] }
  });
  criticalsModule = criticals;
  let lastCriticalAttack = 0;
  criticals.onEnable = (bot) => {
    if (!bot._client) return;
    logger2.info(`Criticals enabled - Mode: ${criticals.settings.mode}`);
    if (!criticals._originalAttack) {
      criticals._originalAttack = bot.attack.bind(bot);
    }
    bot.attack = (entity) => {
      if (criticals.enabled && criticals.settings.mode === "Packet") {
        logger2.debug("Sending critical packets");
        sendCriticalPackets(bot);
      } else if (criticals.enabled && criticals.settings.mode === "Legit") {
        if (bot.entity.onGround) {
          logger2.debug("Legit critical jump");
          bot.entity.velocity.y = 0.42 * criticals.settings.jumpHeight;
        }
      }
      criticals._originalAttack(entity);
    };
  };
  criticals.onDisable = (bot) => {
    logger2.info("Criticals disabled");
    if (criticals._originalAttack) {
      bot.attack = criticals._originalAttack;
    }
  };
  criticals.onSettingChanged = (key, newValue) => {
    if (key === "mode") {
      logger2.info(`Criticals mode changed to: ${newValue}`);
    }
  };
  const sendCriticalPackets = (bot) => {
    if (!bot._client) return;
    const pos = bot.entity.position;
    const offsets = [0.0625, 0, 0.0625, 0];
    offsets.forEach((offset) => {
      bot._client.write("position", {
        x: pos.x,
        y: pos.y + offset,
        z: pos.z,
        onGround: false
      });
    });
  };
  criticals.onTick = (bot) => {
  };
  registerModule(criticals);
  const velocity = new Module("velocity", "AntiKnockback", "Combat", "Cancel knockback", {
    horizontal: true,
    vertical: false,
    strength: 0
    // 0 = full cancel, 1 = no cancel
  });
  velocity.onTick = (bot) => {
    if (velocity.settings.horizontal && velocity.settings.strength < 1) {
      const reduction = 1 - velocity.settings.strength;
      bot.entity.velocity.x *= reduction;
      bot.entity.velocity.z *= reduction;
    }
    if (velocity.settings.vertical && velocity.settings.strength < 1) {
      const reduction = 1 - velocity.settings.strength;
      bot.entity.velocity.y *= reduction;
    }
  };
  registerModule(velocity);
  const autoTotem = new Module("autototem", "Auto Totem", "Combat", "Auto-equip totem in offhand", {
    healthThreshold: 16,
    // Half hearts
    checkInterval: 5
    // Ticks
  });
  let totemTick = 0;
  autoTotem.onTick = (bot) => {
    totemTick++;
    if (totemTick % autoTotem.settings.checkInterval !== 0) return;
    const needsTotem = bot.health <= autoTotem.settings.healthThreshold;
    const offhandItem = bot.inventory.slots[45];
    if (needsTotem && (!offhandItem || offhandItem.name !== "totem_of_undying")) {
      const totem = bot.inventory.items().find((item) => item.name === "totem_of_undying");
      if (totem) {
        bot.equip(totem, "off-hand").catch(() => {
        });
      }
    }
  };
  registerModule(autoTotem);
  const autoSoup = new Module("autosoup", "Auto Soup", "Combat", "Auto-consume soup/potions", {
    healthThreshold: 16,
    itemType: "soup"
    // 'soup' | 'potion' | 'both'
  });
  autoSoup.onTick = (bot) => {
    if (bot.health <= autoSoup.settings.healthThreshold && !autoSoup.eating) {
      let item = null;
      if (autoSoup.settings.itemType === "soup" || autoSoup.settings.itemType === "both") {
        item = bot.inventory.items().find((i) => i.name.includes("soup") || i.name.includes("stew"));
      }
      if (!item && (autoSoup.settings.itemType === "potion" || autoSoup.settings.itemType === "both")) {
        item = bot.inventory.items().find((i) => i.name.includes("potion") && (i.name.includes("healing") || i.name.includes("regeneration")));
      }
      if (item) {
        autoSoup.eating = true;
        bot.equip(item, "hand").then(() => bot.consume()).then(() => {
          autoSoup.eating = false;
        }).catch(() => {
          autoSoup.eating = false;
        });
      }
    }
  };
  registerModule(autoSoup);
  const autoArmor = new Module("autoarmor", "Auto Armor", "Combat", "Equip best armor", {
    checkInterval: 20
    // Ticks
  });
  let aaTick = 0;
  let equippingArmor = false;
  const armorSlots = {
    head: 5,
    torso: 6,
    legs: 7,
    feet: 8
  };
  const getArmorValue = (itemName) => {
    if (!itemName || itemName === "air") return 0;
    if (itemName.includes("diamond")) return 100;
    if (itemName.includes("netherite")) return 110;
    if (itemName.includes("iron")) return 80;
    if (itemName.includes("gold")) return 60;
    if (itemName.includes("chain")) return 50;
    if (itemName.includes("leather")) return 40;
    if (itemName.includes("helmet") || itemName.includes("cap")) return 20;
    if (itemName.includes("chestplate") || itemName.includes("tunic")) return 20;
    if (itemName.includes("leggings") || itemName.includes("pants")) return 20;
    if (itemName.includes("boots")) return 20;
    return 0;
  };
  autoArmor.onTick = async (bot) => {
    aaTick++;
    if (aaTick % autoArmor.settings.checkInterval !== 0 || equippingArmor) return;
    equippingArmor = true;
    try {
      for (const [slotName, slotId] of Object.entries(armorSlots)) {
        const currentArmor = bot.inventory.slots[slotId];
        const currentValue = getArmorValue(currentArmor?.name);
        const betterArmor = bot.inventory.items().find((item) => {
          if (item.slot === slotId) return false;
          if (item.slot < 9 || item.slot >= 36) return false;
          const itemValue = getArmorValue(item.name);
          if (itemValue <= currentValue) return false;
          if (slotName === "head" && !item.name.includes("helmet") && !item.name.includes("cap")) return false;
          if (slotName === "torso" && !item.name.includes("chestplate") && !item.name.includes("tunic")) return false;
          if (slotName === "legs" && !item.name.includes("leggings") && !item.name.includes("pants")) return false;
          if (slotName === "feet" && !item.name.includes("boots")) return false;
          return true;
        });
        if (betterArmor) {
          try {
            await bot.equip(betterArmor, slotName);
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (e) {
          }
        }
      }
    } catch (e) {
      console.error("Auto-armor error:", e);
    } finally {
      equippingArmor = false;
    }
  };
  registerModule(autoArmor);
};

// anticlient/src/modules/movement.js
var loadMovementModules = () => {
  const flight = new Module("flight", "Flight", "Movement", "Allows you to fly like in creative mode", {
    speed: 1,
    doubleJumpToggle: false
  });
  let lastSpacePress = 0;
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && flight.settings.doubleJumpToggle) {
      const now = Date.now();
      if (now - lastSpacePress < 300) {
        flight.toggle();
      }
      lastSpacePress = now;
    }
  });
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
  const speed = new Module("speed", "Speed", "Movement", "Moves faster on ground", {
    groundSpeedMultiplier: 1.5,
    airSpeedMultiplier: 1.2,
    mode: "strafe"
  }, {
    mode: { type: "dropdown", options: ["strafe", "forward"] }
  });
  speed.onTick = (bot) => {
    const controlStates = [
      bot.controlState.forward,
      bot.controlState.right,
      bot.controlState.back,
      bot.controlState.left
    ];
    if (!controlStates.some((state) => state === true)) return;
    if (speed.settings.mode === "strafe") {
      let yaw = bot.entity.yaw;
      const vel = bot.entity.velocity;
      if (!(controlStates[0] || controlStates[2])) {
        if (controlStates[1]) yaw += Math.PI / 2;
        else if (controlStates[3]) yaw -= Math.PI / 2;
      } else if (controlStates[0]) {
        yaw += Math.PI / 2;
        if (controlStates[1]) yaw += Math.PI / 4;
        else if (controlStates[3]) yaw -= Math.PI / 4;
      } else if (controlStates[2]) {
        yaw -= Math.PI / 2;
        if (controlStates[1]) yaw -= Math.PI / 4;
        else if (controlStates[3]) yaw += Math.PI / 4;
      }
      const newX = Math.sin(yaw + Math.PI / 2);
      const newZ = Math.cos(yaw + Math.PI / 2);
      if (bot.entity.onGround) {
        bot.entity.velocity = bot.entity.velocity.set(
          speed.settings.groundSpeedMultiplier * newX,
          vel.y,
          speed.settings.groundSpeedMultiplier * newZ
        );
      } else {
        bot.entity.velocity = bot.entity.velocity.set(
          speed.settings.airSpeedMultiplier * newX,
          vel.y,
          speed.settings.airSpeedMultiplier * newZ
        );
      }
    } else {
      if (bot.entity.onGround && (bot.controlState.forward || bot.controlState.left || bot.controlState.right || bot.controlState.back)) {
        bot.entity.velocity.x *= speed.settings.groundSpeedMultiplier;
        bot.entity.velocity.z *= speed.settings.groundSpeedMultiplier;
      }
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
    const log = window.anticlientLogger?.module("Step");
    if (!window.bot) {
      if (log) log.warning("Bot not available");
      return;
    }
    if (enabled) {
      originalStepHeight = window.bot.physics?.stepHeight || 0.6;
      if (window.bot.physics) {
        window.bot.physics.stepHeight = step.settings.height;
        if (log) log.info(`Step enabled: ${step.settings.height} blocks`);
      }
    } else {
      if (window.bot.physics) {
        window.bot.physics.stepHeight = originalStepHeight;
        if (log) log.info("Step disabled");
      }
    }
  };
  step.onSettingChanged = (key, newValue) => {
    const log = window.anticlientLogger?.module("Step");
    if (key === "height" && step.enabled && window.bot?.physics) {
      window.bot.physics.stepHeight = newValue;
      if (log) log.info(`Step height changed to ${newValue} blocks`);
    }
  };
  step.onTick = (bot) => {
    if (bot.physics && bot.physics.stepHeight !== step.settings.height) {
      bot.physics.stepHeight = step.settings.height;
    }
  };
  registerModule(step);
  const spider = new Module("spider", "Spider", "Movement", "Climb walls", {});
  spider.onTick = (bot) => {
    if (bot.entity && bot.entity.isCollidedHorizontally) {
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
  const highJump = new Module("highjump", "High Jump", "Movement", "Jump higher", { height: 1.5 });
  highJump.onTick = (bot) => {
    if (bot.controlState.jump && bot.entity.onGround) {
      bot.entity.velocity.y = 0.42 * highJump.settings.height;
    }
  };
  registerModule(highJump);
  const scaffold = new Module("scaffold", "Scaffold", "Movement", "Place blocks under you", {});
  scaffold.onTick = (bot) => {
    const pos = bot.entity.position;
    const blockBelow = bot.blockAt(pos.offset(0, -1, 0));
    if (blockBelow && blockBelow.boundingBox === "empty") {
      const item = bot.inventory.items().find((i) => i.name !== "air" && !i.name.includes("sword") && !i.name.includes("pickaxe"));
      if (item) {
        bot.equip(item, "hand").then(() => {
        }).catch(() => {
        });
      }
    }
  };
  registerModule(scaffold);
  const noSlow = new Module("noslow", "No Slow", "Movement", "No slowdown when eating", { enabled: true });
  let lastVelocity = null;
  noSlow.onTick = (bot) => {
    if (bot.usingHeldItem && noSlow.settings.enabled) {
      if (!lastVelocity) {
        lastVelocity = { x: bot.entity.velocity.x, z: bot.entity.velocity.z };
      }
      if (lastVelocity) {
        bot.entity.velocity.x = lastVelocity.x;
        bot.entity.velocity.z = lastVelocity.z;
      }
    } else {
      lastVelocity = null;
    }
  };
  registerModule(noSlow);
  const slowFall = new Module("slowfall", "Slow Fall", "Movement", "Limit fall velocity", { maxFallSpeed: -0.2 });
  slowFall.onTick = (bot) => {
    if (bot.entity.velocity.y < slowFall.settings.maxFallSpeed) {
      bot.entity.velocity.y = slowFall.settings.maxFallSpeed;
    }
  };
  registerModule(slowFall);
  const blink = new Module("blink", "Blink", "Movement", "Record positions and teleport back", {
    recordInterval: 50,
    // ms between position recordings
    maxRecordTime: 1e4
    // 10 seconds max
  });
  let positionHistory = [];
  let isRecording = false;
  let recordStartPos = null;
  let recordStartTime = 0;
  blink.onToggle = (enabled) => {
    const log = window.anticlientLogger?.module("Blink");
    if (!enabled) {
      positionHistory = [];
      isRecording = false;
      recordStartPos = null;
      if (window.anticlient?.blinkUI) {
        window.anticlient.blinkUI.active = false;
      }
      if (log) log.info("Blink disabled, history cleared");
    } else {
      if (log) log.info("Blink enabled - hold B to record path");
    }
  };
  blink.onTick = (bot) => {
    if (!bot || !bot.entity || !bot.entity.position) return;
    const now = Date.now();
    if (isRecording) {
      if (now - (positionHistory[positionHistory.length - 1]?.time || 0) >= blink.settings.recordInterval) {
        positionHistory.push({
          pos: bot.entity.position.clone(),
          time: now
        });
        const cutoffTime = now - blink.settings.maxRecordTime;
        positionHistory = positionHistory.filter((p) => p.time >= cutoffTime);
        if (window.anticlient?.blinkUI) {
          window.anticlient.blinkUI.positions = positionHistory.length;
          window.anticlient.blinkUI.duration = now - recordStartTime;
        }
      }
    }
  };
  window.addEventListener("keydown", (e) => {
    if (!blink.enabled || !window.bot) return;
    if (e.code === blink.bind && !isRecording) {
      const log = window.anticlientLogger?.module("Blink");
      isRecording = true;
      recordStartPos = window.bot.entity.position.clone();
      recordStartTime = Date.now();
      positionHistory = [{
        pos: recordStartPos.clone(),
        time: recordStartTime
      }];
      if (window.anticlient) {
        window.anticlient.blinkUI = {
          active: true,
          positions: 1,
          duration: 0
        };
      }
      if (log) log.info("Started recording positions");
    }
  });
  window.addEventListener("keyup", (e) => {
    if (!blink.enabled || !window.bot) return;
    if (e.code === blink.bind && isRecording) {
      const log = window.anticlientLogger?.module("Blink");
      isRecording = false;
      if (recordStartPos && positionHistory.length > 0) {
        const startPos = positionHistory[0].pos;
        window.bot.entity.position.set(startPos.x, startPos.y, startPos.z);
        if (log) log.info(`Teleported back ${positionHistory.length} positions (${((Date.now() - recordStartTime) / 1e3).toFixed(1)}s)`);
      }
      setTimeout(() => {
        positionHistory = [];
        if (window.anticlient?.blinkUI) {
          window.anticlient.blinkUI.active = false;
        }
      }, 100);
    }
  });
  registerModule(blink);
  const antiKnockback = new Module("antiknockback", "Anti-Knockback", "Movement", "Cancel knockback", {
    updateMineflayer: true,
    strength: 1
    // 0 = full cancel, 1 = no cancel
  });
  let lastVelocityBeforeHit = null;
  antiKnockback.onTick = (bot) => {
    if (antiKnockback.settings.strength < 1) {
      const currentVel = Math.sqrt(bot.entity.velocity.x ** 2 + bot.entity.velocity.z ** 2);
      if (currentVel < 0.1) {
        lastVelocityBeforeHit = { x: bot.entity.velocity.x, z: bot.entity.velocity.z };
      }
      if (lastVelocityBeforeHit && currentVel > 0.3) {
        const reduction = 1 - antiKnockback.settings.strength;
        bot.entity.velocity.x *= reduction;
        bot.entity.velocity.z *= reduction;
      }
    }
  };
  registerModule(antiKnockback);
  const elytraFly = new Module("elytrafly", "Elytra Fly", "Movement", "Auto-activate and control elytra", {
    autoActivate: true,
    speed: 1
  });
  elytraFly.onTick = (bot) => {
    if (elytraFly.settings.autoActivate && bot.entity.velocity.y < -0.5) {
      const chestplate = bot.inventory.slots[6];
      if (chestplate && chestplate.name === "elytra") {
        if (bot.elytraFly) {
          bot.elytraFly();
        }
      }
    }
    if (bot.entity.elytraFlying) {
      const yaw = bot.entity.yaw;
      const speed2 = elytraFly.settings.speed;
      if (bot.controlState.forward) {
        bot.entity.velocity.x = -Math.sin(yaw) * speed2;
        bot.entity.velocity.z = -Math.cos(yaw) * speed2;
      } else if (bot.controlState.back) {
        bot.entity.velocity.x = Math.sin(yaw) * speed2;
        bot.entity.velocity.z = Math.cos(yaw) * speed2;
      }
      if (bot.controlState.jump) {
        bot.entity.velocity.y = speed2 * 0.5;
      } else if (bot.controlState.sneak) {
        bot.entity.velocity.y = -speed2 * 0.5;
      }
    }
  };
  registerModule(elytraFly);
  scaffold.settings.range = 5;
  scaffold.settings.sneakOnly = false;
  scaffold.onTick = (bot) => {
    if (scaffold.settings.sneakOnly && !bot.controlState.sneak) return;
    const pos = bot.entity.position;
    const blockBelow = bot.blockAt(pos.offset(0, -1, 0));
    if (blockBelow && blockBelow.boundingBox === "empty") {
      const item = bot.inventory.items().find(
        (i) => i.name !== "air" && !i.name.includes("sword") && !i.name.includes("pickaxe") && !i.name.includes("axe") && !i.name.includes("shovel")
      );
      if (item) {
        bot.equip(item, "hand").then(() => {
          const referenceBlock = bot.blockAt(pos.offset(0, -2, 0));
          if (referenceBlock && referenceBlock.boundingBox !== "empty") {
            bot.placeBlock(referenceBlock, { x: 0, y: 1, z: 0 }).catch(() => {
            });
          }
        }).catch(() => {
        });
      }
    }
  };
  const invWalk = new Module("invwalk", "Inventory Walk", "Movement", "Move while inventory/GUI is open");
  let keyListeners = {};
  let activeKeys = {
    forward: false,
    back: false,
    left: false,
    right: false,
    jump: false,
    sneak: false
  };
  const keyMap = {
    "KeyW": "forward",
    "KeyS": "back",
    "KeyA": "left",
    "KeyD": "right",
    "Space": "jump",
    "ShiftLeft": "sneak"
  };
  const handleKeyDown = (e) => {
    const control = keyMap[e.code];
    if (!control) return;
    if (window.activeModalStack && window.activeModalStack.length > 0) {
      if (!activeKeys[control]) {
        activeKeys[control] = true;
        if (window.bot) {
          window.bot.setControlState(control, true);
        }
      }
    }
  };
  const handleKeyUp = (e) => {
    const control = keyMap[e.code];
    if (!control) return;
    if (activeKeys[control]) {
      activeKeys[control] = false;
      if (window.bot) {
        window.bot.setControlState(control, false);
      }
    }
  };
  invWalk.onToggle = (enabled) => {
    const log = window.anticlientLogger?.module("InvWalk");
    if (enabled) {
      keyListeners.down = handleKeyDown;
      keyListeners.up = handleKeyUp;
      window.addEventListener("keydown", keyListeners.down, true);
      window.addEventListener("keyup", keyListeners.up, true);
      if (log) log.info("Inventory Walk enabled - WASD works in GUIs");
    } else {
      window.removeEventListener("keydown", keyListeners.down, true);
      window.removeEventListener("keyup", keyListeners.up, true);
      keyListeners = {};
      if (window.bot) {
        for (const control in activeKeys) {
          if (activeKeys[control]) {
            window.bot.setControlState(control, false);
            activeKeys[control] = false;
          }
        }
      }
      if (log) log.info("Inventory Walk disabled");
    }
  };
  registerModule(invWalk);
  const portalGUI = new Module("portalgui", "Portal GUI", "Movement", "Open inventory in nether portals");
  let lastInPortal = false;
  let portalCheckInterval = null;
  portalGUI.onToggle = (enabled) => {
    const log = window.anticlientLogger?.module("PortalGUI");
    if (enabled) {
      if (log) log.info("Portal GUI enabled");
      portalCheckInterval = setInterval(() => {
        if (!window.bot) return;
        const inPortal = window.bot.entity?.isInPortal || false;
        if (inPortal && !lastInPortal) {
          if (window.openPlayerInventory) {
            window.openPlayerInventory();
            if (log) log.info("Opened inventory in portal");
          }
        }
        lastInPortal = inPortal;
      }, 100);
    } else {
      if (portalCheckInterval) {
        clearInterval(portalCheckInterval);
        portalCheckInterval = null;
      }
      lastInPortal = false;
      if (log) log.info("Portal GUI disabled");
    }
  };
  registerModule(portalGUI);
};

// anticlient/src/modules/render.js
var loadRenderModules = () => {
  const fullbright = new Module("fullbright", "Fullbright", "Render", "See in the dark", { gamma: 1 });
  registerModule(fullbright);
  const esp = new Module("esp", "ESP", "Render", "See entities through walls", {
    playerColor: "#00ffff",
    mobColor: "#ff0000",
    boxType: "3D",
    lineWidth: 2,
    showHealth: true,
    showDistance: true,
    glowEffect: true,
    chams: true,
    chamsColor: "#ff00ff",
    tightFit: true
  }, {
    boxType: { type: "dropdown", options: ["2D", "3D"] }
  });
  esp.onToggle = (enabled) => {
    if (!window.anticlient) window.anticlient = { visuals: {} };
    if (!window.anticlient.visuals) window.anticlient.visuals = {};
    window.anticlient.visuals.esp = enabled;
    window.anticlient.visuals.espSettings = esp.settings;
  };
  esp.onSettingChanged = (key, newValue) => {
    if (window.anticlient?.visuals) {
      window.anticlient.visuals.espSettings = esp.settings;
    }
  };
  registerModule(esp);
  const tracers = new Module("tracers", "Tracers", "Render", "Draw lines to entities", {
    color: "#ffffff",
    showDistance: true,
    maxDistance: 64
  });
  tracers.onToggle = (enabled) => {
    if (!window.anticlient) window.anticlient = { visuals: {} };
    if (!window.anticlient.visuals) window.anticlient.visuals = {};
    window.anticlient.visuals.tracers = enabled;
    window.anticlient.visuals.tracersSettings = tracers.settings;
  };
  tracers.onSettingChanged = () => {
    if (window.anticlient?.visuals) {
      window.anticlient.visuals.tracersSettings = tracers.settings;
    }
  };
  registerModule(tracers);
  const nameTags = new Module("nametags", "NameTags", "Render", "Show entity names above heads", {
    range: 64,
    showHealth: true,
    showDistance: true
  });
  nameTags.onToggle = (enabled) => {
    if (!window.anticlient) window.anticlient = { visuals: {} };
    if (!window.anticlient.visuals) window.anticlient.visuals = {};
    window.anticlient.visuals.nameTags = enabled;
    window.anticlient.visuals.nameTagsSettings = nameTags.settings;
  };
  nameTags.onSettingChanged = () => {
    if (window.anticlient?.visuals) {
      window.anticlient.visuals.nameTagsSettings = nameTags.settings;
    }
  };
  registerModule(nameTags);
  const blockEsp = new Module("blockesp", "Block ESP", "Render", "Highlight blocks through walls", {
    blocks: ["diamond_ore", "gold_ore", "iron_ore", "emerald_ore", "ancient_debris"],
    color: "#00ff00",
    range: 32
  });
  blockEsp.lastScan = 0;
  blockEsp.onToggle = (enabled) => {
    const log = window.anticlientLogger?.module("BlockESP");
    if (log) log.info(`Block ESP ${enabled ? "enabled" : "disabled"}`);
    if (!window.anticlient) window.anticlient = { visuals: {} };
    if (!window.anticlient.visuals) window.anticlient.visuals = {};
    window.anticlient.visuals.blockEsp = enabled;
    window.anticlient.visuals.blockEspSettings = blockEsp.settings;
    if (log && enabled) {
      log.info(`Searching for blocks: ${blockEsp.settings.blocks.join(", ")}`);
      log.info(`Range: ${blockEsp.settings.range} blocks`);
    }
  };
  blockEsp.onTick = (bot) => {
    if (!bot || !bot.entity || !bot.entity.position || !bot.findBlocks) return;
    if (Date.now() - blockEsp.lastScan > 1e3) {
      const log = window.anticlientLogger?.module("BlockESP");
      try {
        if (!bot.entity || !bot.entity.position) {
          blockEsp.lastScan = Date.now();
          return;
        }
        const blocks = bot.findBlocks({
          matching: (block) => blockEsp.settings.blocks.some((name) => block.name.includes(name)),
          maxDistance: blockEsp.settings.range,
          count: 200
        });
        if (log) log.debug(`Found ${blocks.length} blocks`);
        if (window.anticlient?.visuals) {
          window.anticlient.visuals.blockEspLocations = blocks;
        }
      } catch (e) {
        if (log && log.level <= 0) log.debug("Bot not ready for block scanning");
      }
      blockEsp.lastScan = Date.now();
    }
  };
  blockEsp.onSettingChanged = () => {
    if (window.anticlient?.visuals) {
      window.anticlient.visuals.blockEspSettings = blockEsp.settings;
    }
  };
  registerModule(blockEsp);
  const storageEsp = new Module("storageesp", "Storage ESP", "Render", "See chests and containers", { color: "#FFA500" });
  storageEsp.lastScan = 0;
  storageEsp.onToggle = (enabled) => {
    if (!window.anticlient?.visuals) return;
    window.anticlient.visuals.storageEsp = enabled;
    window.anticlient.visuals.storageEspSettings = storageEsp.settings;
  };
  storageEsp.onSettingChanged = () => {
    if (window.anticlient?.visuals) {
      window.anticlient.visuals.storageEspSettings = storageEsp.settings;
    }
  };
  storageEsp.onTick = (bot) => {
    if (!bot || !bot.entity || !bot.entity.position || !bot.findBlocks) return;
    if (Date.now() - storageEsp.lastScan > 1e3) {
      try {
        if (!bot.entity || !bot.entity.position) {
          storageEsp.lastScan = Date.now();
          return;
        }
        const chests = bot.findBlocks({
          matching: (block) => ["chest", "ender_chest", "trapped_chest", "shulker_box", "barrel", "furnace"].some((n) => block.name.includes(n)),
          maxDistance: 64,
          count: 100
        });
        if (window.anticlient?.visuals) {
          window.anticlient.visuals.storageLocations = chests;
        }
      } catch (e) {
      }
      storageEsp.lastScan = Date.now();
    }
  };
  registerModule(storageEsp);
};

// anticlient/src/modules/player.js
var loadPlayerModules = () => {
  const autoEat = new Module("autoeat", "Auto Eat", "Player", "Automatically eats food when hungry", {
    healthThreshold: 16,
    saturationThreshold: 10,
    preferGoldenApple: true
  });
  autoEat.onTick = (bot) => {
    const needsFood = bot.food < autoEat.settings.healthThreshold || bot.foodSaturation !== void 0 && bot.foodSaturation < autoEat.settings.saturationThreshold;
    if (needsFood && !autoEat.eating) {
      let food = null;
      if (autoEat.settings.preferGoldenApple && bot.health < 10) {
        food = bot.inventory.items().find(
          (item) => item.name === "golden_apple" || item.name === "enchanted_golden_apple"
        );
      }
      if (!food) {
        const foods = bot.inventory.items().filter(
          (item) => item.name.includes("cooked") || item.name.includes("apple") || item.name.includes("steak") || item.name.includes("bread") || item.name.includes("porkchop") || item.name.includes("chicken")
        );
        food = foods.find((item) => item.name.includes("golden_apple")) || foods.find((item) => item.name.includes("cooked")) || foods[0];
      }
      if (food) {
        autoEat.eating = true;
        bot.equip(food, "hand").then(() => bot.consume()).then(() => {
          autoEat.eating = false;
        }).catch(() => {
          autoEat.eating = false;
        });
      }
    }
  };
  registerModule(autoEat);
  const autoTotem = new Module("autototem", "Auto Totem", "Player", "Auto-equip totem in offhand", {
    healthThreshold: 16,
    checkInterval: 5
  });
  let totemTick = 0;
  autoTotem.onTick = (bot) => {
    totemTick++;
    if (totemTick % autoTotem.settings.checkInterval !== 0) return;
    const needsTotem = bot.health <= autoTotem.settings.healthThreshold;
    const offhandItem = bot.inventory.slots[45];
    if (needsTotem && (!offhandItem || offhandItem.name !== "totem_of_undying")) {
      const totem = bot.inventory.items().find((item) => item.name === "totem_of_undying");
      if (totem) {
        bot.equip(totem, "off-hand").catch(() => {
        });
      }
    }
  };
  registerModule(autoTotem);
  const inventorySorter = new Module("inventorysorter", "Inventory Sorter", "Player", "Auto-organize inventory", {
    enabled: false,
    sortBy: "type"
  }, {
    sortBy: { type: "dropdown", options: ["type", "value"] }
  });
  let sorting = false;
  inventorySorter.onTick = async (bot) => {
    if (!inventorySorter.settings.enabled || sorting || bot.currentWindow) return;
    sorting = true;
    try {
      const items = [];
      for (let slot = 9; slot < 36; slot++) {
        const item = bot.inventory.slots[slot];
        if (item && item.name !== "air") {
          items.push({ slot, item });
        }
      }
      if (items.length === 0) {
        sorting = false;
        return;
      }
      if (inventorySorter.settings.sortBy === "type") {
        items.sort((a, b) => {
          if (a.item.name < b.item.name) return -1;
          if (a.item.name > b.item.name) return 1;
          return 0;
        });
      }
      for (let i = 0; i < items.length; i++) {
        const targetSlot = 9 + i;
        const currentItem = items[i];
        if (currentItem.slot !== targetSlot) {
          const targetItem = bot.inventory.slots[targetSlot];
          if (!targetItem || targetItem.name === "air" || targetItem.name === currentItem.item.name) {
            try {
              await bot.moveSlotItem(currentItem.slot, targetSlot);
              await new Promise((resolve) => setTimeout(resolve, 50));
            } catch (e) {
            }
          }
        }
      }
    } catch (e) {
      console.error("Inventory sort error:", e);
    } finally {
      sorting = false;
    }
  };
  registerModule(inventorySorter);
  const autoRefill = new Module("autorefill", "Auto Refill", "Player", "Keep hotbar filled from inventory", {
    enabled: true,
    slots: [0, 1, 2, 3, 4, 5, 6, 7, 8]
    // All hotbar slots
  });
  let refillTick = 0;
  let refilling = false;
  autoRefill.onTick = async (bot) => {
    refillTick++;
    if (refillTick % 20 !== 0 || refilling || bot.currentWindow) return;
    refilling = true;
    try {
      for (const slotIndex of autoRefill.settings.slots) {
        const hotbarSlot = bot.inventory.slots[36 + slotIndex];
        if (!hotbarSlot || hotbarSlot.name === "air" || hotbarSlot.count === 0) {
          const itemType = hotbarSlot?.name;
          let replacement = null;
          if (itemType) {
            replacement = bot.inventory.items().find(
              (item) => item.name === itemType && item.slot >= 9 && item.slot < 36
            );
          }
          if (!replacement) {
            replacement = bot.inventory.items().find(
              (item) => item.slot >= 9 && item.slot < 36 && item.name !== "air"
            );
          }
          if (replacement) {
            try {
              await bot.moveSlotItem(replacement.slot, 36 + slotIndex);
              await new Promise((resolve) => setTimeout(resolve, 50));
            } catch (e) {
            }
          }
        }
      }
    } catch (e) {
      console.error("Auto-refill error:", e);
    } finally {
      refilling = false;
    }
  };
  registerModule(autoRefill);
  const chestStealer = new Module("cheststealer", "Chest Stealer", "Player", "Steal items from chests", {
    delay: 100,
    takeAll: true,
    filter: []
  });
  let chestWindow = null;
  let stealing = false;
  chestStealer.onToggle = (enabled) => {
    if (enabled && window.bot) {
      window.bot.on("windowOpen", (window2) => {
        if (window2.type === "chest" || window2.type === "generic_9x3" || window2.type === "generic_9x6") {
          chestWindow = window2;
          stealing = true;
          stealFromChest(window2.bot, window2);
        }
      });
      window.bot.on("windowClose", () => {
        chestWindow = null;
        stealing = false;
      });
    }
  };
  const stealFromChest = async (bot, window2) => {
    if (!chestStealer.enabled || !stealing) return;
    const chestSlots = window2.inventoryStart || 54;
    for (let slot = 0; slot < chestSlots; slot++) {
      const item = window2.slots[slot];
      if (!item || item.name === "air") continue;
      if (chestStealer.settings.filter.length > 0) {
        const matches = chestStealer.settings.filter.some((f) => item.name.includes(f));
        if (!matches) continue;
      }
      try {
        await new Promise((resolve) => setTimeout(resolve, chestStealer.settings.delay));
        bot.clickWindow(slot, 0, 0);
        if (!chestStealer.settings.takeAll) break;
      } catch (e) {
      }
    }
  };
  registerModule(chestStealer);
  const packetMine = new Module("packetmine", "Packet Mine", "Player", "Mine blocks without holding mouse button", {
    enabled: false,
    showProgress: true,
    autoSwitch: false
    // Auto switch to next block
  });
  let miningBlock = null;
  let miningStartTime = null;
  let miningProgress = 0;
  let miningInterval = null;
  packetMine.onToggle = (enabled) => {
    if (!window.anticlient) window.anticlient = { mining: {} };
    if (!window.anticlient.mining) window.anticlient.mining = {};
    if (!enabled) {
      if (miningBlock && window.bot) {
        try {
          window.bot._client.write("block_dig", {
            status: 1,
            // cancel digging
            location: miningBlock.position,
            face: 1
          });
        } catch (e) {
        }
      }
      miningBlock = null;
      miningStartTime = null;
      miningProgress = 0;
      window.anticlient.mining.active = false;
      window.anticlient.mining.block = null;
      window.anticlient.mining.progress = 0;
      if (miningInterval) {
        clearInterval(miningInterval);
        miningInterval = null;
      }
    } else {
      if (!miningInterval) {
        miningInterval = setInterval(() => {
          if (!window.bot) return;
          const mouseState = window.bot.controlState?.leftClick;
          if (mouseState && !miningBlock) {
            const block = window.bot.blockAtCursor(5);
            if (block && window.bot.canDigBlock(block)) {
              startMining(block);
            }
          }
        }, 50);
      }
    }
  };
  const startMining = (block) => {
    if (!window.bot || !window.bot._client) return;
    miningBlock = block;
    miningStartTime = Date.now();
    miningProgress = 0;
    const log = window.anticlientLogger?.module("PacketMine");
    if (log) log.info("Started mining block at", block.position);
    try {
      window.bot._client.write("block_dig", {
        status: 0,
        // start digging
        location: block.position,
        face: 1
        // top face
      });
      window.bot.swingArm();
    } catch (e) {
      if (log) log.error("Failed to send start digging packet:", e);
    }
  };
  packetMine.onTick = (bot) => {
    if (!bot || !bot._client) return;
    if (miningBlock) {
      const currentBlock = bot.blockAt(miningBlock.position);
      if (!currentBlock || currentBlock.type === 0) {
        const log = window.anticlientLogger?.module("PacketMine");
        if (log) log.debug("Block broken successfully");
        miningBlock = null;
        miningStartTime = null;
        miningProgress = 0;
        if (window.anticlient && window.anticlient.mining) {
          window.anticlient.mining.active = false;
          window.anticlient.mining.block = null;
          window.anticlient.mining.progress = 0;
        }
        return;
      }
      const digTime = bot.digTime(miningBlock);
      const elapsed = Date.now() - miningStartTime;
      miningProgress = Math.min(elapsed / digTime, 1);
      if (window.anticlient && window.anticlient.mining) {
        window.anticlient.mining.active = true;
        window.anticlient.mining.block = {
          x: miningBlock.position.x,
          y: miningBlock.position.y,
          z: miningBlock.position.z
        };
        window.anticlient.mining.progress = miningProgress;
      }
      if (miningProgress >= 1) {
        const log = window.anticlientLogger?.module("PacketMine");
        if (log) log.debug("Mining complete, sending finish packet");
        try {
          bot._client.write("block_dig", {
            status: 2,
            // finish digging
            location: miningBlock.position,
            face: 1
          });
        } catch (e) {
          if (log) log.error("Failed to send finish digging packet:", e);
        }
      }
    }
  };
  registerModule(packetMine);
};

// anticlient/src/modules/world.js
var loadWorldModules = () => {
  const nuker = new Module("nuker", "Nuker", "World", "Break blocks around you", {
    range: 4,
    filter: [],
    mode: "all"
  }, {
    mode: { type: "dropdown", options: ["all", "filter"] }
  });
  nuker.onTick = (bot) => {
    if (bot.targetDigBlock) return;
    const target = bot.findBlock({
      matching: (block) => {
        if (block.name === "air" || block.name === "bedrock" || block.hardness >= 100) return false;
        if (nuker.settings.mode === "filter" && nuker.settings.filter.length > 0) {
          return nuker.settings.filter.some((f) => block.name.includes(f));
        }
        return true;
      },
      maxDistance: nuker.settings.range
    });
    if (target) {
      bot.dig(target).catch((e) => {
      });
    }
  };
  registerModule(nuker);
  const fastPlace = new Module("fastplace", "Fast Place", "World", "Place blocks faster", { delay: 0 });
  let originalPlaceBlock = null;
  fastPlace.onToggle = (enabled) => {
    if (!window.bot) return;
    if (enabled && !originalPlaceBlock) {
      originalPlaceBlock = window.bot.placeBlock.bind(window.bot);
      window.bot.placeBlock = async function(referenceBlock, faceVector) {
        return originalPlaceBlock(referenceBlock, faceVector);
      };
    } else if (!enabled && originalPlaceBlock) {
      window.bot.placeBlock = originalPlaceBlock;
      originalPlaceBlock = null;
    }
  };
  registerModule(fastPlace);
  const fastBreak = new Module("fastbreak", "Fast Break", "World", "Break blocks faster", { multiplier: 0.5 });
  let originalDigTime = null;
  fastBreak.onToggle = (enabled) => {
    if (!window.bot) return;
    if (enabled && !originalDigTime) {
      originalDigTime = window.bot.digTime.bind(window.bot);
      window.bot.digTime = function(block) {
        const originalTime = originalDigTime(block);
        return originalTime * fastBreak.settings.multiplier;
      };
    } else if (!enabled && originalDigTime) {
      window.bot.digTime = originalDigTime;
      originalDigTime = null;
    }
  };
  fastBreak.onTick = (bot) => {
  };
  registerModule(fastBreak);
  const xray = new Module("xray", "X-Ray", "World", "Highlight ores and valuable blocks", {
    blocks: ["diamond_ore", "gold_ore", "iron_ore", "emerald_ore", "ancient_debris", "nether_gold_ore"],
    color: "#00ff00",
    range: 32
  });
  xray.lastScan = 0;
  xray.onToggle = (enabled) => {
    if (!window.anticlient) window.anticlient = { visuals: {} };
    if (!window.anticlient.visuals) window.anticlient.visuals = {};
    window.anticlient.visuals.xray = enabled;
    window.anticlient.visuals.xraySettings = xray.settings;
  };
  xray.onTick = (bot) => {
    if (Date.now() - xray.lastScan > 1e3) {
      const blocks = bot.findBlocks({
        matching: (block) => xray.settings.blocks.some((name) => block.name.includes(name)),
        maxDistance: xray.settings.range,
        count: 200
      });
      if (window.anticlient?.visuals) {
        window.anticlient.visuals.xrayBlocks = blocks;
      }
      xray.lastScan = Date.now();
    }
  };
  xray.settings = new Proxy(xray.settings, {
    set: (target, prop, value) => {
      target[prop] = value;
      if (window.anticlient?.visuals) window.anticlient.visuals.xraySettings = target;
      return true;
    }
  });
  registerModule(xray);
  const autoMine = new Module("automine", "Auto Mine", "World", "Automatically mine target blocks", {
    blocks: ["diamond_ore", "gold_ore", "iron_ore", "emerald_ore"],
    range: 16,
    pathfind: false
  });
  autoMine.onTick = (bot) => {
    if (bot.targetDigBlock) return;
    const target = bot.findBlock({
      matching: (block) => autoMine.settings.blocks.some((name) => block.name.includes(name)),
      maxDistance: autoMine.settings.range
    });
    if (target) {
      const distance = bot.entity.position.distanceTo(target.position);
      if (distance < 5) {
        bot.dig(target).catch(() => {
        });
      } else if (!autoMine.settings.pathfind) {
        bot.lookAt(target.position);
        bot.setControlState("forward", true);
        setTimeout(() => bot.setControlState("forward", false), 100);
      }
    }
  };
  registerModule(autoMine);
};

// anticlient/src/modules/client.js
var loadClientModules = () => {
  const settings = new Module("client_settings", "Client Settings", "Settings", "Client configuration", {
    theme: "Default",
    repo: "Undertaker-afk/client-mods"
    // For display mainly
  });
  settings.actions = {
    update: async () => {
      try {
        if (window.mcraft && window.mcraft.installModByName) {
          let repoUrl = settings.settings.repo;
          if (window.getAllRepositories) {
            try {
              const repos = await window.getAllRepositories();
              const repo = repos.find(
                (r) => r.packages && r.packages.some((p) => p.name === "anticlient")
              );
              if (repo) {
                repoUrl = repo.url;
              } else {
                repoUrl = settings.settings.repo;
              }
            } catch (e) {
              console.warn("Could not fetch repositories, using default:", e);
            }
          }
          await window.mcraft.installModByName(repoUrl, "anticlient");
          if (window.mcraft && window.mcraft.showNotification) {
            window.mcraft.showNotification("Mod updated", "Please reload the page to apply changes", false);
          } else {
            alert("Mod updated! Please reload the page to apply changes.");
          }
        } else {
          const repoUrl = "https://github.com/" + settings.settings.repo;
          window.open(repoUrl, "_blank");
          alert("Update API not available. Please use the Mod Manager UI to update, or visit the GitHub repository.");
        }
      } catch (error) {
        console.error("Failed to update mod:", error);
        alert("Failed to update mod: " + (error.message || String(error)));
      }
    },
    unload: async () => {
      try {
        if (window.mcraft && window.mcraft.setEnabledModAction) {
          const modName = "anticlient";
          await window.mcraft.setEnabledModAction(modName, false);
        } else {
          if (window.anticlient && window.anticlient.cleanup) {
            window.anticlient.cleanup();
          }
        }
      } catch (error) {
        console.error("Failed to unload mod:", error);
        alert("Failed to unload mod: " + error.message);
      }
    }
  };
  let lastTheme = settings.settings.theme;
  settings.onTick = (bot) => {
    const currentTheme = settings.settings.theme;
    if (currentTheme !== lastTheme) {
      lastTheme = currentTheme;
      if (window.anticlient && window.anticlient.ui && window.anticlient.ui.setTheme) {
        window.anticlient.ui.setTheme(currentTheme);
      }
    }
  };
  registerModule(settings);
};

// anticlient/src/modules/packets.js
var loadPacketsModules = () => {
  const packetViewer = new Module("packetviewer", "Packet Viewer", "Packets", "View all Minecraft network packets", {
    enabled: false,
    maxPackets: 100,
    filter: "",
    direction: "both"
    // 'incoming' | 'outgoing' | 'both'
  });
  packetViewer.packets = [];
  let packetListeners = [];
  packetViewer.onToggle = (enabled) => {
    if (enabled && (!window.bot || !window.bot._client)) {
      const checkBot = setInterval(() => {
        if (window.bot && window.bot._client) {
          clearInterval(checkBot);
          packetViewer.onToggle(true);
        }
      }, 100);
      setTimeout(() => clearInterval(checkBot), 1e4);
      return;
    }
    if (!window.bot || !window.bot._client) return;
    if (enabled) {
      packetViewer.packets = [];
      const originalWrite = window.bot._client.write.bind(window.bot._client);
      window.bot._client.write = function(name, params) {
        if (packetViewer.enabled && (packetViewer.settings.direction === "both" || packetViewer.settings.direction === "outgoing")) {
          addPacket("outgoing", name, params);
        }
        return originalWrite(name, params);
      };
      packetViewer._originalWrite = originalWrite;
      const commonEvents = [
        "position",
        "look",
        "chat",
        "entity_velocity",
        "entity_metadata",
        "entity_equipment",
        "entity_status",
        "update_health",
        "experience",
        "block_change",
        "multi_block_change",
        "chunk_data",
        "map_chunk",
        "unload_chunk",
        "window_items",
        "set_slot",
        "open_window",
        "close_window",
        "player_list_item",
        "player_info",
        "spawn_entity",
        "spawn_entity_living",
        "entity_destroy",
        "entity_move",
        "entity_look",
        "entity_head_rotation",
        "entity_teleport",
        "entity_properties",
        "entity_effect",
        "remove_entity_effect"
      ];
      commonEvents.forEach((eventName) => {
        const listener = (...args) => {
          if (packetViewer.enabled && (packetViewer.settings.direction === "both" || packetViewer.settings.direction === "incoming")) {
            addPacket("incoming", eventName, args);
          }
        };
        window.bot._client.on(eventName, listener);
        packetListeners.push({ event: eventName, listener });
      });
    } else {
      if (packetViewer._originalWrite) {
        window.bot._client.write = packetViewer._originalWrite;
        packetViewer._originalWrite = null;
      }
      packetListeners.forEach(({ event, listener }) => {
        window.bot._client.removeListener(event, listener);
      });
      packetListeners = [];
    }
  };
  const addPacket = (direction, name, data) => {
    const packet = {
      direction,
      name,
      data: JSON.stringify(data, null, 2),
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    };
    if (packetViewer.settings.filter && packetViewer.settings.filter.trim() !== "") {
      const filter = packetViewer.settings.filter.toLowerCase();
      if (!name.toLowerCase().includes(filter) && !packet.data.toLowerCase().includes(filter)) {
        return;
      }
    }
    packetViewer.packets.unshift(packet);
    if (packetViewer.packets.length > packetViewer.settings.maxPackets) {
      packetViewer.packets.pop();
    }
    if (window.anticlient && window.anticlient.ui && window.anticlient.ui.updatePacketViewer) {
      window.anticlient.ui.updatePacketViewer();
    }
  };
  registerModule(packetViewer);
};

// anticlient/src/ui/index.js
var initUI = () => {
  const existingRoot = document.getElementById("anticlient-root");
  if (existingRoot) existingRoot.remove();
  const existingStyle = document.getElementById("anticlient-style");
  if (existingStyle) existingStyle.remove();
  const uiRoot = document.createElement("div");
  uiRoot.id = "anticlient-root";
  uiRoot.style.position = "fixed";
  uiRoot.style.top = "100px";
  uiRoot.style.left = "100px";
  uiRoot.style.zIndex = "10000";
  uiRoot.style.fontFamily = "'Consolas', 'Monaco', monospace";
  uiRoot.style.userSelect = "none";
  uiRoot.style.display = "none";
  const toggleUi = () => {
    uiRoot.style.display = uiRoot.style.display === "none" ? "block" : "none";
  };
  const keydownHandler = (e) => {
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
  };
  window.addEventListener("keydown", keydownHandler);
  const style = document.createElement("style");
  style.id = "anticlient-style";
  document.head.appendChild(style);
  const themes = {
    Default: `
            .ac-window {
                background-color: #0f0f13;
                border: 2px solid #7c4dff;
                border-radius: 8px;
                box-shadow: 0 0 15px rgba(124, 77, 255, 0.3);
                color: #e0e0e0;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                height: 500px;
                width: 650px;
                transition: width 0.3s ease;
                font-family: 'Consolas', 'Monaco', monospace;
            }
            .ac-window.expanded { width: 950px; }
            .ac-header {
                background-color: #1a1a20;
                padding: 10px 15px;
                border-bottom: 2px solid #7c4dff;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                flex-shrink: 0;
            }
            .ac-title { font-weight: bold; color: #b388ff; font-size: 1.1em; letter-spacing: 1px; }
            .ac-sidebar {
                width: 150px;
                background-color: #15151a;
                display: flex;
                flex-direction: column;
                border-right: 1px solid #333;
                flex-shrink: 0;
            }
            .ac-tab {
                text-align: left;
                padding: 15px 20px;
                cursor: pointer;
                background-color: transparent;
                transition: background-color 0.2s, color 0.2s;
                border-left: 3px solid transparent;
                color: #777;
                font-weight: 500;
            }
            .ac-tab:hover { background-color: #20202a; color: #fff; }
            .ac-tab.active { color: #b388ff; border-left: 3px solid #b388ff; background-color: #1e1e24; }
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
            .ac-module.enabled { border-left: 3px solid #00e676; }
            .ac-setting-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.9em; }
            .ac-input-number, .ac-input-text { background: #000; border: 1px solid #444; color: white; padding: 2px; border-radius: 2px; }
            .ac-checkbox { accent-color: #7c4dff; }
            .ac-preview-panel {
                background-color: #111;
                border-left: 1px solid #333;
            }
        `,
    Arwes: `
            .ac-window {
                background-color: rgba(0, 20, 20, 0.9);
                border: 1px solid #26dafd;
                box-shadow: 0 0 20px rgba(38, 218, 253, 0.2);
                color: #a9fdff;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                height: 500px;
                width: 650px;
                transition: width 0.3s ease;
                font-family: 'Titillium Web', sans-serif;
                clip-path: polygon(
                    0 0, 100% 0, 
                    100% calc(100% - 20px), calc(100% - 20px) 100%, 
                    0 100%
                );
            }
            .ac-window.expanded { width: 950px; }
            .ac-header {
                background-color: rgba(6, 61, 68, 0.6);
                padding: 10px 15px;
                border-bottom: 1px solid #26dafd;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                flex-shrink: 0;
                text-shadow: 0 0 5px rgba(38, 218, 253, 0.5);
            }
            .ac-title { font-weight: bold; color: #26dafd; font-size: 1.2em; letter-spacing: 2px; }
            .ac-sidebar {
                width: 150px;
                background-color: rgba(0, 10, 10, 0.5);
                display: flex;
                flex-direction: column;
                border-right: 1px solid #1b90a8;
                flex-shrink: 0;
            }
            .ac-tab {
                text-align: left;
                padding: 15px 20px;
                cursor: pointer;
                background-color: transparent;
                transition: all 0.2s;
                border-left: 2px solid transparent;
                color: #1b90a8;
                font-weight: 500;
                opacity: 0.7;
            }
            .ac-tab:hover { background-color: rgba(38, 218, 253, 0.1); color: #a9fdff; opacity: 1; text-shadow: 0 0 8px rgba(38, 218, 253, 0.6); }
            .ac-tab.active { color: #26dafd; border-left: 2px solid #26dafd; background-color: rgba(38, 218, 253, 0.15); opacity: 1; box-shadow: 0 0 10px rgba(38, 218, 253, 0.1) inset; }
            .ac-module {
                background-color: rgba(6, 61, 68, 0.3);
                margin-bottom: 8px;
                padding: 10px;
                border: 1px solid rgba(38, 218, 253, 0.3);
                display: flex;
                flex-direction: column;
                transition: all 0.2s;
            }
            .ac-module:hover { border-color: #26dafd; }
            .ac-module.enabled {
                border: 1px solid #26dafd;
                box-shadow: 0 0 10px rgba(38, 218, 253, 0.2) inset; 
                background-color: rgba(38, 218, 253, 0.1);
            }
            .ac-setting-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.9em; color: #a9fdff; }
            .ac-input-number, .ac-input-text { 
                background: rgba(0,0,0,0.5); 
                border: 1px solid #1b90a8; 
                color: #26dafd; 
                padding: 2px; 
                font-family: inherit;
            }
            .ac-checkbox { accent-color: #26dafd; }
            .ac-preview-panel {
                background-color: rgba(0,20,20,0.8);
                border-left: 1px solid #26dafd;
            }
        `
  };
  const applyTheme = (themeName) => {
    style.textContent = themes[themeName] || themes["Default"];
    style.textContent += `
            .ac-content { padding: 15px; flex: 1; overflow-y: auto; min-width: 0; }
            .ac-body { display: flex; flex: 1; overflow: hidden; }
            .ac-module-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
            .ac-module-name { font-weight: bold; }
            .ac-module-settings { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); display: none; }
            .ac-module-settings.open { display: flex; flex-direction: column; gap: 8px; }
            .ac-preview-panel { width: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; flex-shrink: 0; }
            .ac-preview-title { margin-bottom: 10px; color: inherit; opacity: 0.7; font-size: 0.9em; }
            .ac-content::-webkit-scrollbar { width: 8px; }
            .ac-content::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
            .ac-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        `;
  };
  applyTheme("Default");
  if (!window.anticlient) window.anticlient = {};
  window.anticlient.ui = { setTheme: applyTheme };
  const windowEl = document.createElement("div");
  windowEl.className = "ac-window";
  uiRoot.appendChild(windowEl);
  const header = document.createElement("div");
  header.className = "ac-header";
  header.innerHTML = '<span class="ac-title">ANTICLIENT</span> <span style="font-size: 0.8em; color: gray">v1.4</span>';
  windowEl.appendChild(header);
  const bodyEl = document.createElement("div");
  bodyEl.className = "ac-body";
  windowEl.appendChild(bodyEl);
  const sidebar = document.createElement("div");
  sidebar.className = "ac-sidebar";
  bodyEl.appendChild(sidebar);
  const contentContainer = document.createElement("div");
  contentContainer.className = "ac-content";
  bodyEl.appendChild(contentContainer);
  const previewPanel = document.createElement("div");
  previewPanel.className = "ac-preview-panel";
  previewPanel.style.display = "none";
  previewPanel.innerHTML = '<div class="ac-preview-title">VISUAL PREVIEW</div>';
  const canvas = document.createElement("canvas");
  canvas.width = 280;
  canvas.height = 400;
  canvas.style.display = "block";
  previewPanel.appendChild(canvas);
  bodyEl.appendChild(previewPanel);
  document.body.appendChild(uiRoot);
  const blockSelectorModal = document.createElement("div");
  blockSelectorModal.id = "ac-block-selector-modal";
  blockSelectorModal.style.display = "none";
  blockSelectorModal.style.position = "fixed";
  blockSelectorModal.style.top = "0";
  blockSelectorModal.style.left = "0";
  blockSelectorModal.style.width = "100%";
  blockSelectorModal.style.height = "100%";
  blockSelectorModal.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  blockSelectorModal.style.zIndex = "20000";
  blockSelectorModal.style.display = "none";
  blockSelectorModal.style.alignItems = "center";
  blockSelectorModal.style.justifyContent = "center";
  const blockSelectorContent = document.createElement("div");
  blockSelectorContent.style.backgroundColor = "#0f0f13";
  blockSelectorContent.style.border = "2px solid #7c4dff";
  blockSelectorContent.style.borderRadius = "8px";
  blockSelectorContent.style.padding = "20px";
  blockSelectorContent.style.maxWidth = "600px";
  blockSelectorContent.style.maxHeight = "80vh";
  blockSelectorContent.style.width = "90%";
  blockSelectorContent.style.display = "flex";
  blockSelectorContent.style.flexDirection = "column";
  blockSelectorContent.style.gap = "15px";
  const blockSelectorTitle = document.createElement("div");
  blockSelectorTitle.textContent = "Select Blocks";
  blockSelectorTitle.style.fontSize = "1.2em";
  blockSelectorTitle.style.fontWeight = "bold";
  blockSelectorTitle.style.color = "#7c4dff";
  blockSelectorTitle.style.textAlign = "center";
  blockSelectorContent.appendChild(blockSelectorTitle);
  const blockSearchInput = document.createElement("input");
  blockSearchInput.type = "text";
  blockSearchInput.placeholder = "Search blocks...";
  blockSearchInput.style.padding = "8px";
  blockSearchInput.style.backgroundColor = "#1a1a20";
  blockSearchInput.style.color = "#e0e0e0";
  blockSearchInput.style.border = "1px solid #444";
  blockSearchInput.style.borderRadius = "4px";
  blockSearchInput.style.fontSize = "0.9em";
  blockSelectorContent.appendChild(blockSearchInput);
  const blockListContainer = document.createElement("div");
  blockListContainer.style.overflowY = "auto";
  blockListContainer.style.maxHeight = "400px";
  blockListContainer.style.display = "flex";
  blockListContainer.style.flexDirection = "column";
  blockListContainer.style.gap = "5px";
  blockSelectorContent.appendChild(blockListContainer);
  const blockSelectorButtons = document.createElement("div");
  blockSelectorButtons.style.display = "flex";
  blockSelectorButtons.style.gap = "10px";
  blockSelectorButtons.style.justifyContent = "flex-end";
  const blockSelectorClose = document.createElement("button");
  blockSelectorClose.textContent = "Close";
  blockSelectorClose.style.padding = "8px 16px";
  blockSelectorClose.style.backgroundColor = "#333";
  blockSelectorClose.style.color = "white";
  blockSelectorClose.style.border = "none";
  blockSelectorClose.style.borderRadius = "4px";
  blockSelectorClose.style.cursor = "pointer";
  blockSelectorClose.onclick = () => {
    blockSelectorModal.style.display = "none";
    renderModules();
  };
  blockSelectorButtons.appendChild(blockSelectorClose);
  blockSelectorContent.appendChild(blockSelectorButtons);
  blockSelectorModal.appendChild(blockSelectorContent);
  document.body.appendChild(blockSelectorModal);
  let currentBlockModule = null;
  const openBlockSelector = (module) => {
    currentBlockModule = module;
    blockSelectorModal.style.display = "flex";
    blockSearchInput.value = "";
    renderBlockList();
  };
  const createBlockTextureCanvas = (blockName) => {
    try {
      const resourcesManager = window.resourcesManager || window.globalThis?.resourcesManager;
      if (!resourcesManager?.currentResources?.blocksAtlasJson) {
        return null;
      }
      const atlas = resourcesManager.currentResources.blocksAtlasJson;
      const atlasImage = resourcesManager.currentResources.blocksAtlasImage;
      if (!atlas || !atlasImage) return null;
      const textureInfo = atlas.textures[blockName];
      if (!textureInfo) return null;
      const canvas2 = document.createElement("canvas");
      const tileSize = atlas.tileSize || 16;
      canvas2.width = tileSize;
      canvas2.height = tileSize;
      const ctx = canvas2.getContext("2d");
      if (!ctx) return null;
      const sx = textureInfo.u * atlasImage.width;
      const sy = textureInfo.v * atlasImage.height;
      const sw = (textureInfo.su || atlas.suSv) * atlasImage.width;
      const sh = (textureInfo.sv || atlas.suSv) * atlasImage.height;
      ctx.drawImage(atlasImage, sx, sy, sw, sh, 0, 0, tileSize, tileSize);
      return canvas2;
    } catch (err) {
      console.debug("Failed to get texture for block:", blockName, err);
      return null;
    }
  };
  const renderBlockList = () => {
    blockListContainer.innerHTML = "";
    if (!window.bot || !window.bot.registry || !window.bot.registry.blocksByName) {
      const errorMsg = document.createElement("div");
      errorMsg.textContent = "Please connect to a server first to load block data.";
      errorMsg.style.color = "#ff5555";
      errorMsg.style.textAlign = "center";
      errorMsg.style.padding = "20px";
      blockListContainer.appendChild(errorMsg);
      return;
    }
    const searchTerm = blockSearchInput.value.toLowerCase();
    const blockNames = Object.keys(window.bot.registry.blocksByName).filter((name) => name.includes(searchTerm)).sort();
    if (blockNames.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.textContent = "No blocks found.";
      emptyMsg.style.color = "#777";
      emptyMsg.style.textAlign = "center";
      emptyMsg.style.padding = "20px";
      blockListContainer.appendChild(emptyMsg);
      return;
    }
    blockNames.forEach((blockName) => {
      const blockItem = document.createElement("div");
      blockItem.style.padding = "8px 12px";
      blockItem.style.backgroundColor = "#1a1a20";
      blockItem.style.borderRadius = "4px";
      blockItem.style.cursor = "pointer";
      blockItem.style.display = "flex";
      blockItem.style.alignItems = "center";
      blockItem.style.gap = "10px";
      blockItem.style.transition = "background-color 0.2s";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = currentBlockModule && currentBlockModule.settings.blocks.includes(blockName);
      checkbox.style.cursor = "pointer";
      checkbox.onclick = (e) => {
        e.stopPropagation();
        toggleBlock(blockName, checkbox.checked);
      };
      const contentContainer2 = document.createElement("div");
      contentContainer2.style.display = "flex";
      contentContainer2.style.alignItems = "center";
      contentContainer2.style.gap = "10px";
      contentContainer2.style.flex = "1";
      const textureCanvas = createBlockTextureCanvas(blockName);
      if (textureCanvas) {
        textureCanvas.style.width = "32px";
        textureCanvas.style.height = "32px";
        textureCanvas.style.imageRendering = "pixelated";
        contentContainer2.appendChild(textureCanvas);
      }
      const label = document.createElement("span");
      label.textContent = blockName;
      label.style.color = "#e0e0e0";
      label.style.flex = "1";
      contentContainer2.appendChild(label);
      blockItem.onclick = () => {
        checkbox.checked = !checkbox.checked;
        toggleBlock(blockName, checkbox.checked);
      };
      blockItem.onmouseenter = () => {
        blockItem.style.backgroundColor = "#252530";
      };
      blockItem.onmouseleave = () => {
        blockItem.style.backgroundColor = "#1a1a20";
      };
      blockItem.appendChild(checkbox);
      blockItem.appendChild(contentContainer2);
      blockListContainer.appendChild(blockItem);
    });
  };
  const toggleBlock = (blockName, isChecked) => {
    if (!currentBlockModule) return;
    if (isChecked) {
      if (!currentBlockModule.settings.blocks.includes(blockName)) {
        currentBlockModule.settings.blocks.push(blockName);
      }
    } else {
      const index = currentBlockModule.settings.blocks.indexOf(blockName);
      if (index > -1) {
        currentBlockModule.settings.blocks.splice(index, 1);
      }
    }
  };
  blockSearchInput.oninput = () => {
    renderBlockList();
  };
  let activeTab = "Movement";
  let previewScene = null;
  let previewCamera = null;
  let previewRenderer = null;
  let previewPlayerWrapper = null;
  let previewPlayerObject = null;
  let previewESPBox = null;
  let previewStorageBox = null;
  let previewAnimationId = null;
  const init3DPreview = () => {
    if (!window.THREE) {
      console.warn("[Anticlient] THREE.js not available, falling back to 2D preview");
      return false;
    }
    try {
      const THREE = window.THREE;
      previewScene = new THREE.Scene();
      previewScene.background = new THREE.Color(986899);
      previewCamera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.1, 100);
      previewCamera.position.set(0, 1.5, 3.5);
      previewCamera.lookAt(0, 1, 0);
      previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      previewRenderer.setSize(canvas.width, canvas.height);
      previewRenderer.setPixelRatio(window.devicePixelRatio);
      const ambientLight = new THREE.AmbientLight(16777215, 0.6);
      previewScene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(16777215, 0.8);
      directionalLight.position.set(5, 10, 5);
      previewScene.add(directionalLight);
      if (window.skinview3d?.PlayerObject) {
        const PlayerObject = window.skinview3d.PlayerObject;
        previewPlayerObject = new PlayerObject();
        previewPlayerObject.position.set(0, 16, 0);
        previewPlayerWrapper = new THREE.Group();
        previewPlayerWrapper.add(previewPlayerObject);
        const scale = 1 / 16;
        previewPlayerWrapper.scale.set(scale, scale, scale);
        previewPlayerWrapper.rotation.set(0, Math.PI, 0);
        previewPlayerWrapper.position.set(0, 0, 0);
        previewScene.add(previewPlayerWrapper);
      } else {
        const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
        const material = new THREE.MeshStandardMaterial({ color: 8947848 });
        const playerMesh = new THREE.Mesh(geometry, material);
        playerMesh.position.set(0, 0.9, 0);
        previewScene.add(playerMesh);
        previewPlayerWrapper = playerMesh;
      }
      const espGeometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
      const espEdges = new THREE.EdgesGeometry(espGeometry);
      const espMaterial = new THREE.LineBasicMaterial({ color: 65535, linewidth: 2 });
      previewESPBox = new THREE.LineSegments(espEdges, espMaterial);
      previewESPBox.position.set(0, 0.9, 0);
      previewESPBox.visible = false;
      previewScene.add(previewESPBox);
      const storageGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      const storageEdges = new THREE.EdgesGeometry(storageGeometry);
      const storageMaterial = new THREE.LineBasicMaterial({ color: 16753920, linewidth: 2 });
      previewStorageBox = new THREE.LineSegments(storageEdges, storageMaterial);
      previewStorageBox.position.set(1.2, 0.15, 0);
      previewStorageBox.visible = false;
      previewScene.add(previewStorageBox);
      return true;
    } catch (err) {
      console.error("[Anticlient] Failed to initialize 3D preview:", err);
      return false;
    }
  };
  const render3DPreview = () => {
    if (!previewRenderer || !previewScene || !previewCamera) return;
    if (activeTab !== "Render") return;
    const esp = modules["esp"];
    if (esp && previewESPBox) {
      previewESPBox.visible = esp.enabled;
      if (esp.enabled) {
        const color = esp.settings.playerColor || "#00ffff";
        previewESPBox.material.color.setStyle(color);
      }
    }
    const storageEsp = modules["storageesp"];
    if (storageEsp && previewStorageBox) {
      previewStorageBox.visible = storageEsp.enabled;
      if (storageEsp.enabled) {
        const color = storageEsp.settings.color || "#FFA500";
        previewStorageBox.material.color.setStyle(color);
      }
    }
    if (previewPlayerWrapper) {
      previewPlayerWrapper.rotation.y += 0.01;
    }
    previewRenderer.render(previewScene, previewCamera);
  };
  const start3DPreview = () => {
    if (!previewRenderer) {
      if (!init3DPreview()) return;
    }
    const animate = () => {
      if (activeTab !== "Render") {
        previewAnimationId = null;
        return;
      }
      render3DPreview();
      previewAnimationId = requestAnimationFrame(animate);
    };
    animate();
  };
  const stop3DPreview = () => {
    if (previewAnimationId) {
      cancelAnimationFrame(previewAnimationId);
      previewAnimationId = null;
    }
  };
  let previewInterval = null;
  const updateLayout = () => {
    if (activeTab === "Render") {
      windowEl.classList.add("expanded");
      previewPanel.style.display = "flex";
      start3DPreview();
    } else {
      windowEl.classList.remove("expanded");
      previewPanel.style.display = "none";
      stop3DPreview();
    }
  };
  const renderModules = () => {
    contentContainer.innerHTML = "";
    if (activeTab === "Packets") {
      renderPackets();
      return;
    }
    if (activeTab === "Scripting") {
      renderScripting();
      return;
    }
    const catMods = categories[activeTab] || [];
    if (!catMods.length) {
      const emptyMsg = document.createElement("div");
      emptyMsg.textContent = "No modules in this category.";
      emptyMsg.style.color = "#555";
      emptyMsg.style.textAlign = "center";
      emptyMsg.style.marginTop = "20px";
      contentContainer.appendChild(emptyMsg);
      return;
    }
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
        const val = mod.settings[key];
        if (key === "blocks" && Array.isArray(val)) {
          return;
        }
        const row = document.createElement("div");
        row.className = "ac-setting-row";
        const label = document.createElement("span");
        label.textContent = key;
        row.appendChild(label);
        const metadata = mod.settingsMetadata?.[key];
        if (key === "logLevel" && mod.id === "loggersettings") {
          const select = document.createElement("select");
          select.style.background = "#1a1a20";
          select.style.color = "white";
          select.style.border = "1px solid #444";
          select.style.padding = "4px";
          select.style.borderRadius = "4px";
          select.style.cursor = "pointer";
          const levels = [
            { value: 0, label: "Debug" },
            { value: 1, label: "Info" },
            { value: 2, label: "Warning" },
            { value: 3, label: "Error" },
            { value: 4, label: "None" }
          ];
          levels.forEach((level) => {
            const option = document.createElement("option");
            option.value = level.value;
            option.textContent = level.label;
            option.selected = val === level.value;
            select.appendChild(option);
          });
          select.onchange = (e) => {
            mod.settings[key] = parseInt(e.target.value);
          };
          row.appendChild(select);
        } else if (metadata?.type === "dropdown" && metadata.options) {
          const select = document.createElement("select");
          select.style.background = "#1a1a20";
          select.style.color = "white";
          select.style.border = "1px solid #444";
          select.style.padding = "4px";
          select.style.borderRadius = "4px";
          select.style.cursor = "pointer";
          metadata.options.forEach((option) => {
            const optionEl = document.createElement("option");
            optionEl.value = option;
            optionEl.textContent = option;
            optionEl.selected = val === option;
            select.appendChild(optionEl);
          });
          select.onchange = (e) => {
            mod.settings[key] = e.target.value;
          };
          row.appendChild(select);
        } else if (typeof val === "number") {
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
        } else if (typeof val === "string" && val.startsWith("#")) {
          const input = document.createElement("input");
          input.type = "color";
          input.style.background = "none";
          input.style.border = "none";
          input.style.width = "30px";
          input.style.height = "30px";
          input.value = val;
          input.onchange = (e) => mod.settings[key] = e.target.value;
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
      if (mod.settings.blocks && Array.isArray(mod.settings.blocks)) {
        const blocksRow = document.createElement("div");
        blocksRow.className = "ac-setting-row";
        const blocksLabel = document.createElement("span");
        blocksLabel.textContent = "blocks";
        blocksRow.appendChild(blocksLabel);
        const configBtn = document.createElement("button");
        configBtn.textContent = `Config Blocks (${mod.settings.blocks.length})`;
        configBtn.style.background = "#7c4dff";
        configBtn.style.color = "white";
        configBtn.style.border = "none";
        configBtn.style.cursor = "pointer";
        configBtn.style.padding = "4px 12px";
        configBtn.style.borderRadius = "4px";
        configBtn.style.fontSize = "0.85em";
        configBtn.onclick = () => {
          openBlockSelector(mod);
        };
        blocksRow.appendChild(configBtn);
        settingsDiv.appendChild(blocksRow);
      }
      if (mod.id === "client_settings") {
        if (mod.actions && mod.actions.update) {
          const updateRow = document.createElement("div");
          updateRow.className = "ac-setting-row";
          const updateLabel = document.createElement("span");
          updateLabel.textContent = "Update";
          updateRow.appendChild(updateLabel);
          const updateBtn = document.createElement("button");
          updateBtn.style.background = "#333";
          updateBtn.style.color = "white";
          updateBtn.style.border = "1px solid #444";
          updateBtn.style.cursor = "pointer";
          updateBtn.style.padding = "4px 12px";
          updateBtn.textContent = "Update";
          updateBtn.onclick = async () => {
            updateBtn.disabled = true;
            updateBtn.textContent = "Updating...";
            try {
              await mod.actions.update();
            } catch (error) {
              console.error("Update failed:", error);
            } finally {
              updateBtn.disabled = false;
              updateBtn.textContent = "Update";
            }
          };
          updateRow.appendChild(updateBtn);
          settingsDiv.appendChild(updateRow);
        }
        if (mod.actions && mod.actions.unload) {
          const unloadRow = document.createElement("div");
          unloadRow.className = "ac-setting-row";
          const unloadLabel = document.createElement("span");
          unloadLabel.textContent = "Unload";
          unloadRow.appendChild(unloadLabel);
          const unloadBtn = document.createElement("button");
          unloadBtn.style.background = "#333";
          unloadBtn.style.color = "white";
          unloadBtn.style.border = "1px solid #444";
          unloadBtn.style.cursor = "pointer";
          unloadBtn.style.padding = "4px 12px";
          unloadBtn.textContent = "Unload";
          unloadBtn.onclick = async () => {
            unloadBtn.disabled = true;
            unloadBtn.textContent = "Unloading...";
            try {
              await mod.actions.unload();
            } catch (error) {
              console.error("Unload failed:", error);
              unloadBtn.disabled = false;
              unloadBtn.textContent = "Unload";
            }
          };
          unloadRow.appendChild(unloadBtn);
          settingsDiv.appendChild(unloadRow);
        }
      } else {
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
      }
      modEl.appendChild(settingsDiv);
      contentContainer.appendChild(modEl);
    });
  };
  const renderScripting = () => {
    contentContainer.style.padding = "15px";
    const title = document.createElement("div");
    title.textContent = "Scripting & Custom Packets";
    title.style.fontSize = "1.2em";
    title.style.fontWeight = "bold";
    title.style.color = "#b388ff";
    title.style.marginBottom = "15px";
    contentContainer.appendChild(title);
    const tabsContainer = document.createElement("div");
    tabsContainer.style.display = "flex";
    tabsContainer.style.gap = "10px";
    tabsContainer.style.marginBottom = "15px";
    tabsContainer.style.borderBottom = "1px solid #333";
    let activeScriptTab = "editor";
    const editorTab = document.createElement("div");
    editorTab.textContent = "Script Editor";
    editorTab.style.padding = "8px 16px";
    editorTab.style.cursor = "pointer";
    editorTab.style.borderBottom = "2px solid #b388ff";
    editorTab.style.color = "#b388ff";
    const packetTab = document.createElement("div");
    packetTab.textContent = "Packet Sender";
    packetTab.style.padding = "8px 16px";
    packetTab.style.cursor = "pointer";
    packetTab.style.borderBottom = "2px solid transparent";
    packetTab.style.color = "#777";
    const switchTab = (tab) => {
      activeScriptTab = tab;
      if (tab === "editor") {
        editorTab.style.borderBottom = "2px solid #b388ff";
        editorTab.style.color = "#b388ff";
        packetTab.style.borderBottom = "2px solid transparent";
        packetTab.style.color = "#777";
        editorSection.style.display = "block";
        packetSection.style.display = "none";
      } else {
        editorTab.style.borderBottom = "2px solid transparent";
        editorTab.style.color = "#777";
        packetTab.style.borderBottom = "2px solid #b388ff";
        packetTab.style.color = "#b388ff";
        editorSection.style.display = "none";
        packetSection.style.display = "block";
      }
    };
    editorTab.onclick = () => switchTab("editor");
    packetTab.onclick = () => switchTab("packet");
    tabsContainer.appendChild(editorTab);
    tabsContainer.appendChild(packetTab);
    contentContainer.appendChild(tabsContainer);
    const editorSection = document.createElement("div");
    const editorLabel = document.createElement("div");
    editorLabel.textContent = "JavaScript Code (has access to window.bot):";
    editorLabel.style.color = "#e0e0e0";
    editorLabel.style.marginBottom = "8px";
    editorSection.appendChild(editorLabel);
    const codeEditor = document.createElement("textarea");
    codeEditor.style.width = "100%";
    codeEditor.style.height = "250px";
    codeEditor.style.background = "#000";
    codeEditor.style.color = "#0f0";
    codeEditor.style.border = "1px solid #444";
    codeEditor.style.padding = "10px";
    codeEditor.style.fontFamily = "'Consolas', 'Monaco', monospace";
    codeEditor.style.fontSize = "12px";
    codeEditor.style.resize = "vertical";
    codeEditor.style.borderRadius = "4px";
    codeEditor.placeholder = '// Example:\n// bot.chat("Hello from script!")\n// console.log(bot.entity.position)';
    codeEditor.value = localStorage.getItem("anticlient_script") || "";
    codeEditor.oninput = () => {
      localStorage.setItem("anticlient_script", codeEditor.value);
    };
    editorSection.appendChild(codeEditor);
    const editorButtons = document.createElement("div");
    editorButtons.style.display = "flex";
    editorButtons.style.gap = "10px";
    editorButtons.style.marginTop = "10px";
    const runBtn = document.createElement("button");
    runBtn.textContent = "Run Script";
    runBtn.style.padding = "8px 16px";
    runBtn.style.background = "#2e7d32";
    runBtn.style.color = "white";
    runBtn.style.border = "none";
    runBtn.style.cursor = "pointer";
    runBtn.style.borderRadius = "4px";
    runBtn.style.fontWeight = "bold";
    runBtn.onclick = () => {
      try {
        const result = eval(codeEditor.value);
        console.log("Script result:", result);
        alert("Script executed successfully! Check console for output.");
      } catch (err) {
        console.error("Script error:", err);
        alert("Script error: " + err.message);
      }
    };
    editorButtons.appendChild(runBtn);
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear";
    clearBtn.style.padding = "8px 16px";
    clearBtn.style.background = "#333";
    clearBtn.style.color = "white";
    clearBtn.style.border = "none";
    clearBtn.style.cursor = "pointer";
    clearBtn.style.borderRadius = "4px";
    clearBtn.onclick = () => {
      codeEditor.value = "";
      localStorage.removeItem("anticlient_script");
    };
    editorButtons.appendChild(clearBtn);
    const apiBtn = document.createElement("button");
    apiBtn.textContent = "API Docs";
    apiBtn.style.padding = "8px 16px";
    apiBtn.style.background = "#1976d2";
    apiBtn.style.color = "white";
    apiBtn.style.border = "none";
    apiBtn.style.cursor = "pointer";
    apiBtn.style.borderRadius = "4px";
    apiBtn.onclick = () => {
      window.open("https://github.com/PrismarineJS/mineflayer/blob/master/docs/api.md", "_blank");
    };
    editorButtons.appendChild(apiBtn);
    editorSection.appendChild(editorButtons);
    contentContainer.appendChild(editorSection);
    const packetSection = document.createElement("div");
    packetSection.style.display = "none";
    const packetLabel = document.createElement("div");
    packetLabel.textContent = "Packet Name:";
    packetLabel.style.color = "#e0e0e0";
    packetLabel.style.marginBottom = "8px";
    packetSection.appendChild(packetLabel);
    const packetNameInput = document.createElement("input");
    packetNameInput.type = "text";
    packetNameInput.placeholder = "e.g., chat, position, arm_animation";
    packetNameInput.style.width = "100%";
    packetNameInput.style.background = "#000";
    packetNameInput.style.color = "white";
    packetNameInput.style.border = "1px solid #444";
    packetNameInput.style.padding = "8px";
    packetNameInput.style.borderRadius = "4px";
    packetNameInput.style.marginBottom = "15px";
    packetNameInput.style.fontFamily = "'Consolas', 'Monaco', monospace";
    packetSection.appendChild(packetNameInput);
    const dataLabel = document.createElement("div");
    dataLabel.textContent = "Packet Data (JSON):";
    dataLabel.style.color = "#e0e0e0";
    dataLabel.style.marginBottom = "8px";
    packetSection.appendChild(dataLabel);
    const packetDataInput = document.createElement("textarea");
    packetDataInput.style.width = "100%";
    packetDataInput.style.height = "200px";
    packetDataInput.style.background = "#000";
    packetDataInput.style.color = "#0f0";
    packetDataInput.style.border = "1px solid #444";
    packetDataInput.style.padding = "10px";
    packetDataInput.style.fontFamily = "'Consolas', 'Monaco', monospace";
    packetDataInput.style.fontSize = "12px";
    packetDataInput.style.resize = "vertical";
    packetDataInput.style.borderRadius = "4px";
    packetDataInput.placeholder = '{\n  "message": "Hello World"\n}';
    packetDataInput.value = localStorage.getItem("anticlient_packet_data") || "";
    packetDataInput.oninput = () => {
      localStorage.setItem("anticlient_packet_data", packetDataInput.value);
    };
    packetSection.appendChild(packetDataInput);
    const packetButtons = document.createElement("div");
    packetButtons.style.display = "flex";
    packetButtons.style.gap = "10px";
    packetButtons.style.marginTop = "10px";
    const sendBtn = document.createElement("button");
    sendBtn.textContent = "Send Packet";
    sendBtn.style.padding = "8px 16px";
    sendBtn.style.background = "#1976d2";
    sendBtn.style.color = "white";
    sendBtn.style.border = "none";
    sendBtn.style.cursor = "pointer";
    sendBtn.style.borderRadius = "4px";
    sendBtn.style.fontWeight = "bold";
    sendBtn.onclick = () => {
      if (!window.bot || !window.bot._client) {
        alert("Bot not connected!");
        return;
      }
      const packetName = packetNameInput.value.trim();
      if (!packetName) {
        alert("Please enter a packet name!");
        return;
      }
      try {
        const packetData = packetDataInput.value.trim() ? JSON.parse(packetDataInput.value) : {};
        window.bot._client.write(packetName, packetData);
        console.log("Sent packet:", packetName, packetData);
        alert("Packet sent successfully!");
      } catch (err) {
        console.error("Packet send error:", err);
        alert("Error: " + err.message);
      }
    };
    packetButtons.appendChild(sendBtn);
    const clearPacketBtn = document.createElement("button");
    clearPacketBtn.textContent = "Clear";
    clearPacketBtn.style.padding = "8px 16px";
    clearPacketBtn.style.background = "#333";
    clearPacketBtn.style.color = "white";
    clearPacketBtn.style.border = "none";
    clearPacketBtn.style.cursor = "pointer";
    clearPacketBtn.style.borderRadius = "4px";
    clearPacketBtn.onclick = () => {
      packetNameInput.value = "";
      packetDataInput.value = "";
      localStorage.removeItem("anticlient_packet_data");
    };
    packetButtons.appendChild(clearPacketBtn);
    const templatesBtn = document.createElement("button");
    templatesBtn.textContent = "Templates";
    templatesBtn.style.padding = "8px 16px";
    templatesBtn.style.background = "#7c4dff";
    templatesBtn.style.color = "white";
    templatesBtn.style.border = "none";
    templatesBtn.style.cursor = "pointer";
    templatesBtn.style.borderRadius = "4px";
    templatesBtn.onclick = () => {
      const templates = {
        "chat": '{\n  "message": "Hello World"\n}',
        "position": '{\n  "x": 0,\n  "y": 64,\n  "z": 0,\n  "onGround": true\n}',
        "arm_animation": "{}",
        "entity_action": '{\n  "entityId": 0,\n  "actionId": 0,\n  "jumpBoost": 0\n}'
      };
      const templateName = prompt("Choose template:\n- chat\n- position\n- arm_animation\n- entity_action");
      if (templateName && templates[templateName]) {
        packetNameInput.value = templateName;
        packetDataInput.value = templates[templateName];
      }
    };
    packetButtons.appendChild(templatesBtn);
    packetSection.appendChild(packetButtons);
    contentContainer.appendChild(packetSection);
  };
  const renderPackets = () => {
    contentContainer.innerHTML = "";
    const packetViewer = modules["packetviewer"];
    if (!packetViewer) {
      const emptyMsg = document.createElement("div");
      emptyMsg.textContent = "Packet Viewer module not found.";
      emptyMsg.style.color = "#555";
      emptyMsg.style.textAlign = "center";
      emptyMsg.style.marginTop = "20px";
      contentContainer.appendChild(emptyMsg);
      return;
    }
    const controlsDiv = document.createElement("div");
    controlsDiv.style.marginBottom = "10px";
    controlsDiv.style.padding = "10px";
    controlsDiv.style.backgroundColor = "#1a1a20";
    controlsDiv.style.borderRadius = "4px";
    controlsDiv.style.display = "flex";
    controlsDiv.style.gap = "10px";
    controlsDiv.style.alignItems = "center";
    controlsDiv.style.flexWrap = "wrap";
    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = packetViewer.enabled ? "Disable" : "Enable";
    toggleBtn.style.padding = "4px 12px";
    toggleBtn.style.background = packetViewer.enabled ? "#d32f2f" : "#2e7d32";
    toggleBtn.style.color = "white";
    toggleBtn.style.border = "none";
    toggleBtn.style.cursor = "pointer";
    toggleBtn.style.borderRadius = "2px";
    toggleBtn.onclick = () => {
      packetViewer.toggle();
      toggleBtn.textContent = packetViewer.enabled ? "Disable" : "Enable";
      toggleBtn.style.background = packetViewer.enabled ? "#d32f2f" : "#2e7d32";
    };
    controlsDiv.appendChild(toggleBtn);
    const filterLabel = document.createElement("span");
    filterLabel.textContent = "Filter:";
    filterLabel.style.color = "#e0e0e0";
    controlsDiv.appendChild(filterLabel);
    const filterInput = document.createElement("input");
    filterInput.type = "text";
    filterInput.placeholder = "Packet name...";
    filterInput.value = packetViewer.settings.filter || "";
    filterInput.style.background = "#000";
    filterInput.style.color = "white";
    filterInput.style.border = "1px solid #444";
    filterInput.style.padding = "4px 8px";
    filterInput.style.borderRadius = "2px";
    filterInput.style.width = "150px";
    filterInput.oninput = (e) => {
      packetViewer.settings.filter = e.target.value;
    };
    controlsDiv.appendChild(filterInput);
    const directionLabel = document.createElement("span");
    directionLabel.textContent = "Direction:";
    directionLabel.style.color = "#e0e0e0";
    controlsDiv.appendChild(directionLabel);
    const directionSelect = document.createElement("select");
    directionSelect.style.background = "#000";
    directionSelect.style.color = "white";
    directionSelect.style.border = "1px solid #444";
    directionSelect.style.padding = "4px 8px";
    directionSelect.style.borderRadius = "2px";
    directionSelect.innerHTML = '<option value="both">Both</option><option value="incoming">Incoming</option><option value="outgoing">Outgoing</option>';
    directionSelect.value = packetViewer.settings.direction || "both";
    directionSelect.onchange = (e) => {
      packetViewer.settings.direction = e.target.value;
    };
    controlsDiv.appendChild(directionSelect);
    const clearBtn2 = document.createElement("button");
    clearBtn2.textContent = "Clear";
    clearBtn2.style.padding = "4px 12px";
    clearBtn2.style.background = "#333";
    clearBtn2.style.color = "white";
    clearBtn2.style.border = "1px solid #444";
    clearBtn2.style.cursor = "pointer";
    clearBtn2.style.borderRadius = "2px";
    clearBtn2.onclick = () => {
      packetViewer.packets = [];
      renderPackets();
    };
    controlsDiv.appendChild(clearBtn2);
    contentContainer.appendChild(controlsDiv);
    const packetList = document.createElement("div");
    packetList.style.maxHeight = "400px";
    packetList.style.overflowY = "auto";
    packetList.style.display = "flex";
    packetList.style.flexDirection = "column";
    packetList.style.gap = "5px";
    if (!packetViewer.packets || packetViewer.packets.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.textContent = "No packets captured. Enable packet viewer to start capturing.";
      emptyMsg.style.color = "#555";
      emptyMsg.style.textAlign = "center";
      emptyMsg.style.marginTop = "20px";
      packetList.appendChild(emptyMsg);
    } else {
      const packetsToShow = packetViewer.packets.slice(0, 100);
      packetsToShow.forEach((packet) => {
        const packetEl = document.createElement("div");
        packetEl.style.backgroundColor = "#1a1a20";
        packetEl.style.padding = "8px";
        packetEl.style.borderRadius = "4px";
        packetEl.style.borderLeft = `3px solid ${packet.direction === "incoming" ? "#4caf50" : "#2196f3"}`;
        packetEl.style.fontSize = "0.85em";
        packetEl.style.cursor = "pointer";
        const header2 = document.createElement("div");
        header2.style.display = "flex";
        header2.style.justifyContent = "space-between";
        header2.style.marginBottom = "5px";
        header2.style.color = packet.direction === "incoming" ? "#4caf50" : "#2196f3";
        header2.style.fontWeight = "bold";
        const nameSpan = document.createElement("span");
        nameSpan.textContent = packet.name;
        header2.appendChild(nameSpan);
        const timeSpan = document.createElement("span");
        timeSpan.textContent = new Date(packet.timestamp).toLocaleTimeString();
        timeSpan.style.color = "#777";
        timeSpan.style.fontSize = "0.9em";
        header2.appendChild(timeSpan);
        packetEl.appendChild(header2);
        const dataPre = document.createElement("pre");
        dataPre.style.margin = "0";
        dataPre.style.color = "#ccc";
        dataPre.style.fontSize = "0.8em";
        dataPre.style.maxHeight = "100px";
        dataPre.style.overflow = "auto";
        dataPre.style.whiteSpace = "pre-wrap";
        dataPre.style.wordBreak = "break-all";
        dataPre.textContent = packet.data.length > 500 ? packet.data.substring(0, 500) + "..." : packet.data;
        packetEl.appendChild(dataPre);
        let expanded = false;
        packetEl.onclick = () => {
          expanded = !expanded;
          if (expanded) {
            dataPre.textContent = packet.data;
            dataPre.style.maxHeight = "300px";
          } else {
            dataPre.textContent = packet.data.length > 500 ? packet.data.substring(0, 500) + "..." : packet.data;
            dataPre.style.maxHeight = "100px";
          }
        };
        packetList.appendChild(packetEl);
      });
    }
    contentContainer.appendChild(packetList);
    if (!window.anticlient) window.anticlient = {};
    if (!window.anticlient.ui) window.anticlient.ui = {};
    window.anticlient.ui.updatePacketViewer = renderPackets;
  };
  const renderTabs = () => {
    sidebar.innerHTML = "";
    Object.keys(categories).forEach((cat) => {
      const tab = document.createElement("div");
      tab.className = "ac-tab" + (cat === activeTab ? " active" : "");
      tab.textContent = cat;
      tab.onclick = () => {
        activeTab = cat;
        updateLayout();
        renderTabs();
        renderModules();
      };
      sidebar.appendChild(tab);
    });
  };
  updateLayout();
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
  const blinkIndicator = document.createElement("div");
  blinkIndicator.id = "blink-indicator";
  blinkIndicator.style.position = "fixed";
  blinkIndicator.style.top = "50%";
  blinkIndicator.style.left = "50%";
  blinkIndicator.style.transform = "translate(-50%, 100px)";
  blinkIndicator.style.padding = "15px 30px";
  blinkIndicator.style.background = "rgba(124, 77, 255, 0.9)";
  blinkIndicator.style.border = "2px solid #7c4dff";
  blinkIndicator.style.borderRadius = "8px";
  blinkIndicator.style.color = "white";
  blinkIndicator.style.fontFamily = "'Consolas', 'Monaco', monospace";
  blinkIndicator.style.fontSize = "16px";
  blinkIndicator.style.fontWeight = "bold";
  blinkIndicator.style.zIndex = "99999";
  blinkIndicator.style.display = "none";
  blinkIndicator.style.textAlign = "center";
  blinkIndicator.style.boxShadow = "0 0 20px rgba(124, 77, 255, 0.6)";
  blinkIndicator.innerHTML = `
        <div style="margin-bottom: 5px;">\u{1F52E} RECORDING BACKTRACK</div>
        <div id="blink-stats" style="font-size: 14px; opacity: 0.9;">
            Positions: <span id="blink-positions">0</span> |
            Time: <span id="blink-time">0.0</span>s
        </div>
        <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">Release B to teleport back</div>
    `;
  document.body.appendChild(blinkIndicator);
  const blinkUpdateInterval = setInterval(() => {
    if (window.anticlient?.blinkUI?.active) {
      blinkIndicator.style.display = "block";
      const positions = window.anticlient.blinkUI.positions || 0;
      const duration = (window.anticlient.blinkUI.duration || 0) / 1e3;
      document.getElementById("blink-positions").textContent = positions;
      document.getElementById("blink-time").textContent = duration.toFixed(1);
    } else {
      blinkIndicator.style.display = "none";
    }
  }, 50);
  return () => {
    stop3DPreview();
    if (previewRenderer) {
      previewRenderer.dispose();
      previewRenderer = null;
    }
    if (previewScene) {
      previewScene.clear();
      previewScene = null;
    }
    if (uiRoot && uiRoot.parentNode) uiRoot.parentNode.removeChild(uiRoot);
    if (blockSelectorModal && blockSelectorModal.parentNode) blockSelectorModal.parentNode.removeChild(blockSelectorModal);
    if (blinkIndicator && blinkIndicator.parentNode) blinkIndicator.parentNode.removeChild(blinkIndicator);
    if (style && style.parentNode) style.parentNode.removeChild(style);
    if (previewInterval) clearInterval(previewInterval);
    if (blinkUpdateInterval) clearInterval(blinkUpdateInterval);
    window.removeEventListener("keydown", keydownHandler);
    window.removeEventListener("mouseup", dragEnd);
    window.removeEventListener("mousemove", drag);
  };
};

// anticlient/src/logger.js
var LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  NONE: 4
};
var Logger = class {
  constructor() {
    this.level = LogLevel.INFO;
    this.prefix = "[Anticlient]";
    this.colors = {
      DEBUG: "#888888",
      INFO: "#00ffff",
      WARNING: "#ffaa00",
      ERROR: "#ff5555"
    };
  }
  setLevel(level) {
    this.level = level;
    this.info(`Log level set to: ${this.getLevelName(level)}`);
  }
  getLevelName(level) {
    const names = ["DEBUG", "INFO", "WARNING", "ERROR", "NONE"];
    return names[level] || "UNKNOWN";
  }
  debug(...args) {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`%c${this.prefix} [DEBUG]`, `color: ${this.colors.DEBUG}`, ...args);
    }
  }
  info(...args) {
    if (this.level <= LogLevel.INFO) {
      console.log(`%c${this.prefix} [INFO]`, `color: ${this.colors.INFO}`, ...args);
    }
  }
  warning(...args) {
    if (this.level <= LogLevel.WARNING) {
      console.warn(`%c${this.prefix} [WARNING]`, `color: ${this.colors.WARNING}`, ...args);
    }
  }
  error(...args) {
    if (this.level <= LogLevel.ERROR) {
      console.error(`%c${this.prefix} [ERROR]`, `color: ${this.colors.ERROR}`, ...args);
    }
  }
  // Module-specific logger
  module(moduleName) {
    return {
      debug: (...args) => this.debug(`[${moduleName}]`, ...args),
      info: (...args) => this.info(`[${moduleName}]`, ...args),
      warning: (...args) => this.warning(`[${moduleName}]`, ...args),
      error: (...args) => this.error(`[${moduleName}]`, ...args)
    };
  }
};
var logger = new Logger();
if (typeof window !== "undefined") {
  window.anticlientLogger = logger;
}

// anticlient/entry.js
var entry_default = (mod) => {
  if (window.anticlient && window.anticlient.cleanup) {
    try {
      window.anticlient.cleanup();
    } catch (e) {
      console.error(e);
    }
  }
  logger.info("Initializing Modular Architecture...");
  loadCombatModules();
  loadMovementModules();
  loadRenderModules();
  loadPlayerModules();
  loadWorldModules();
  loadClientModules();
  loadPacketsModules();
  const loggerSettings = new Module(
    "loggersettings",
    "Logger Settings",
    "Settings",
    "Configure logging level (0=Debug, 1=Info, 2=Warning, 3=Error, 4=None)",
    { logLevel: 0 }
    // DEBUG by default
  );
  loggerSettings.enabled = true;
  loggerSettings.onToggle = () => {
  };
  loggerSettings.onTick = () => {
  };
  loggerSettings.onSettingChanged = (key, newValue) => {
    if (key === "logLevel") {
      logger.setLevel(newValue);
      logger.info(`Log level changed to ${newValue}`);
    }
  };
  registerModule(loggerSettings);
  logger.info(`Modules loaded. Total: ${Object.keys(modules).length}`);
  const cleanupUI = initUI();
  let bot = void 0;
  let loopRunning = true;
  const loop = () => {
    if (!loopRunning) return;
    if (!bot && window.bot) bot = window.bot;
    if (bot) {
      Object.values(modules).forEach((mod2) => {
        if (mod2.enabled) mod2.onTick(bot);
      });
    }
    requestAnimationFrame(loop);
  };
  loop();
  if (!window.anticlient) window.anticlient = {};
  window.anticlient.cleanup = () => {
    cleanupUI();
    loopRunning = false;
    console.log("[Anticlient] Cleaned up.");
  };
  return {
    deactivate: () => {
      window.anticlient.cleanup();
    }
  };
};
export {
  entry_default as default
};
