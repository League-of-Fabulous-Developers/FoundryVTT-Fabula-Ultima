/**
 * Extend the base Actor document by defining a custom roll data structure
 * @extends {Actor}
 */
export class FUActor extends Actor {
  /** @override */
  prepareData () {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData()
  }

  /** @override */
  prepareBaseData () {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData () {
    const actorData = this
    const systemData = actorData.system;
    const flags = actorData.flags.fabulaultima || {};

    const disableAutomation = game.settings.get(
      'fabulaultima',
      'disableAutomation'
    )

    if (disableAutomation) {
      return // Exit early
    } 

    this._calculateResources(actorData)
    this._calculateTotalLevels(actorData)
    this._calculateCrafting(actorData)
    this._handleStatusEffects(actorData)
    this._calculateDefenses(actorData)
    this._calculateInitOrInitMod(actorData)

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData)
    this._prepareNpcData(actorData)
  }

  /**
   * Calculate and update the defenses/magical defenses of an actor based on equipped items and attributes.
   *
   * @param {Object} actorData
   */
  _calculateDefenses (actorData) {
    // Create an array to store equipped items
    const equipped = []

    // Iterate through each item in actorData
    actorData.items.forEach(item => {
      // Check if the item is equipped
      if (item.system.isEquipped?.value) {
        equipped.push(item)
      }
    })

    // Find the equipped armor
    const armor = equipped.find(item => item.type === 'armor')

    // Get the dexterity attribute value
    const dex = actorData.system.attributes.dex.current

    // Calculate the base defense
    const baseDef = armor
      ? armor.system.isMartial.value
        ? armor.system.def.value
        : armor.system.def.value + dex
      : dex

    // Filter equipped items for shields and accessories
    const otherArmors = equipped.filter(
      item => item.type === 'shield' || item.type === 'accessory'
    )

    // Calculate defense from other armors
    const otherDef = otherArmors.reduce((def, item) => {
      def += item.system.def.value
      return def
    }, 0)

    // Get bonus defense from derived attributes
    const bonusDef = actorData.system.derived.def.bonus ?? 0

    // Calculate total defense
    const def = baseDef + otherDef + bonusDef

    // Filter equipped items for non-weapons
    const nonWeapons = equipped.filter(item => item.type !== 'weapon')

    // Get the insight attribute value
    const ins = actorData.system.attributes.ins.current

    // Calculate defense against magic attacks (magical defense)
    const otherMDef = nonWeapons.reduce((mdef, item) => {
      mdef += item.system.mdef.value
      return mdef
    }, 0)

    // Get bonus magical defense from derived attributes
    const bonusMDef = actorData.system.derived.mdef.bonus ?? 0

    // Calculate total magical defense
    const mdef = ins + otherMDef + bonusMDef

    // Update derived defense values in actorData
    actorData.system.derived.def.value = def
    actorData.system.derived.mdef.value = mdef
  }

  /**
   * Calculate and update the resource attributes (health points, mind points, inventory points) of an actor based on their attributes, classes, and bonuses.
   *
   * @param {Object} actorData - The data object representing an actor in Foundry VTT.
   */
  _calculateResources (actorData) {
    // Extract system-specific data from actorData.
    const systemData = actorData.system

    // Filter classes and heroic skills for specific benefits.
    const classes = actorData.items.filter(item => item.type === 'class')
    const classesWithHp = classes.filter(item => item.system.benefits.hp.value)
    const classesWithMp = classes.filter(item => item.system.benefits.mp.value)
    const classesWithIp = classes.filter(item => item.system.benefits.ip.value)
    const heroicSkills = actorData.items.filter(
      item => item.type === 'heroicSkill'
    )
    const heroicSkillWithHp = heroicSkills.filter(
      item => item.system.benefits.hp.value
    )
    const heroicSkillWithMp = heroicSkills.filter(
      item => item.system.benefits.mp.value
    )
    const heroicSkillWithIp = heroicSkills.filter(
      item => item.system.benefits.ip.value
    )

    // Calculate multipliers based on actor type and attributes.
    const hpMultiplier =
      actorData.type !== 'npc'
        ? 1
        : systemData.isChampion.value !== 1
        ? systemData.isChampion.value
        : systemData.isElite.value
        ? 2
        : 1
    const mpMultiplier =
      actorData.type !== 'npc' ? 1 : systemData.isChampion.value !== 1 ? 2 : 1
    const levelVal =
      actorData.type === 'npc'
        ? systemData.level.value * 2
        : systemData.level.value

    // Calculate maximum health points (hp) based on various factors.
    systemData.resources.hp.max =
      (systemData.attributes.mig.base * 5 +
        levelVal +
        classesWithHp.length * 5 +
        systemData.resources.hp.bonus) *
      hpMultiplier

    // Calculate maximum mind points (mp) based on various factors.
    systemData.resources.mp.max =
      (systemData.attributes.wlp.base * 5 +
        systemData.level.value +
        classesWithMp.length * 5 +
        systemData.resources.mp.bonus) *
      mpMultiplier

    // Calculate maximum inventory points (ip) for characters.
    if (actorData.type === 'character') {
      systemData.resources.ip.max = 6 + classesWithIp.length * 2
    }

    // Apply heroic benefits to maximum hp and mp.
    systemData.resources.hp.max +=
      heroicSkillWithHp.length * (levelVal >= 40 ? 20 : 10)

    systemData.resources.mp.max +=
      heroicSkillWithMp.length * (levelVal >= 40 ? 20 : 10)

    // Apply heroic benefits to maximum ip for characters.
    if (actorData.type === 'character') {
      systemData.resources.ip.max += heroicSkillWithIp.length * 4
    }
  }

  /**
   * Calculate the total levels for classes, skills, and heroic max levels,
   * and update the derived values in the actor's system data.
   *
   * @param {object} actorData - The actor's data object.
   */
  _calculateTotalLevels(actorData) {
    const systemData = actorData.system;

    /**
     * Calculate the total levels for a specific type of items.
     *
     * @param {object[]} items - An array of items to calculate levels from.
     * @param {string} itemType - The type of items to calculate levels for (e.g., 'class' or 'skill').
     * @returns {number} The total levels for the specified item type.
     */
    const calculateTotal = (items, itemType) => {
        return items.reduce((sum, item) => {
            // Validate the data before using parseInt
            const level = parseInt(item.system?.level?.value || 0);
            return sum + level;
        }, 0);
    };

    // Filter class and skill items from the actor's items
    const classes = actorData.items.filter(item => item.type === 'class');
    const skills = actorData.items.filter(item => item.type === 'skill');

    // Calculate total levels for classes and skills
    const totalClassLevels = calculateTotal(classes, 'class');
    const totalSkillLevels = calculateTotal(skills, 'skill');

    // Calculate the total count of classes with level >= 10 (heroic max)
    const totalHeroicMax = classes.reduce((count, item) => {
        if (parseInt(item.system?.level?.value || 0) >= 10) {
            return count + 1;
        }
        return count;
    }, 0);

    // Update the derived values in the system data
    systemData.derived.classmax.value = totalClassLevels;
    systemData.derived.skillmax.value = totalSkillLevels;
    systemData.derived.heroicmax.value = totalHeroicMax;
  }

  /**
   * Calculate and update ritual and project data based on certain factors.
   * @param {object} actorData - The actor's data object containing items to be processed.
   */
  _calculateCrafting(actorData) {
    // Define constant objects for various factors
    const constants = {
        potencyMPs: { minor: 20, medium: 30, major: 40, extreme: 50 },
        potencyDLs: { minor: 7, medium: 10, major: 13, extreme: 16 },
        potencyClocks: { minor: 4, medium: 6, major: 6, extreme: 8 },
        areaMPs: { individual: 1, small: 2, large: 3, huge: 4 },
        potencyCosts: { minor: 100, medium: 200, major: 400, extreme: 800 },
        areaCosts: { individual: 1, small: 2, large: 3, huge: 4 },
        usesCosts: { consumable: 1, permanent: 5 },
    };

    // Filter rituals and projects
    const rituals = actorData.items.filter(item => item.type === 'ritual');
    const projects = actorData.items.filter(item => item.type === 'project');

    // Function to calculate and update an item's system values
    function calculateAndUpdateItem(item, constants) {
        const { potency, area, mpCost, dLevel, clock } = item.system;

        const potencyVal = potency.value;
        const areaVal = area.value;

        const calcMP = constants.potencyMPs[potencyVal] * constants.areaMPs[areaVal];
        const calcDL = constants.potencyDLs[potencyVal];
        const calcClock = constants.potencyClocks[potencyVal];

        mpCost.value = calcMP;
        dLevel.value = calcDL;
        clock.value = calcClock;
    }

    // Process rituals
    rituals.forEach(ritual => {
        calculateAndUpdateItem(ritual, constants);
    });

    // Process projects
    projects.forEach(project => {
        const { potency, area, use, numTinker, numHelper, lvlVision, cost, progress, progressPerDay, days, isFlawed, discount } = project.system;

        const potencyVal = potency.value;
        const areaVal = area.value;
        const usesVal = use.value;

        // Autocalculations
        let discountValue = lvlVision.value * 100;
        const flawedMod = isFlawed.value ? 0.75 : 1;
        const costValue = constants.potencyCosts[potencyVal] * constants.areaCosts[areaVal] * constants.usesCosts[usesVal] * flawedMod;
        const progressValue = Math.max(Math.ceil(costValue / 100), 1);
        const progPDayValue = numTinker.value * 2 + numHelper.value + lvlVision.value;
        const daysValue = Math.ceil(progressValue / progPDayValue);

        // Ensure lvlVision is within the range [0, 5]
        lvlVision.value = Math.min(Math.max(lvlVision.value, 0), 5);

        // Calculate discount.value within the range [0, 500]
        discountValue = Math.min(Math.max(discountValue, 0), 500);

        // Update system values
        discount.value = discountValue;
        cost.value = costValue;
        progress.value = progressValue;
        progressPerDay.value = progPDayValue;
        days.value = daysValue;
    });
  }

  /**
   * Handles the calculation of attribute modifiers based on applied status effects for an actor.
   *
   * @param {object} actorData - The data object representing an actor in Foundry VTT.
   */
  _handleStatusEffects (actorData) {
    // Extract the system-specific data from actorData.
    const systemData = actorData.system

    // Initialize an object to store attribute modifiers.
    const statMods = {}

    // Initialize attribute modifiers to 0 for each attribute key.
    Object.keys(systemData.attributes).forEach(
      attrKey => (statMods[attrKey] = 0)
    )

    // Iterate through each temporary effect applied to the actor.
    actorData.temporaryEffects.forEach(effect => {
      // Get the status associated with the effect, if it exists.
      if (effect.flags.core) {
        const status = CONFIG.statusEffects.find(
          status => status.id === effect.flags.core.statusId
        )

        // If a valid status is found, apply its modifiers to the corresponding attributes.
        if (status) {
          const stats = status.stats || []
          const mod = status.mod || 0

          stats.forEach(attrKey => (statMods[attrKey] += mod))
        }
      }
    })

    // Calculate new attribute values with the applied modifiers.
    for (let [key, attr] of Object.entries(systemData.attributes)) {
      let newVal = attr.base + statMods[key]
      if (newVal > 12) {
        newVal = 12
      }
      if (newVal < 6) {
        newVal = 6
      }

      // Update the current attribute value with the calculated new value.
      attr.current = newVal
    }
  }

  _calculateInitOrInitMod (actorData) {
    const equipped = actorData.items.filter(
      item =>
        item.system.isEquipped?.value &&
        ['armor', 'shield', 'accessory'].includes(item.type)
    )
    const initMod = equipped.reduce((mod, item) => {
      const itemMod = item.system.init?.value ?? 0
      return (mod += itemMod)
    }, 0)
    const initBonus = actorData.system.derived.init?.bonus ?? 0
    const eliteOrChampBonus =
      actorData.type !== 'npc'
        ? 0
        : actorData.system.isChampion.value !== 1
        ? actorData.system.isChampion.value
        : actorData.system.isElite.value
        ? 2
        : 0

    actorData.system.derived.init.value =
      actorData.type === 'npc'
        ? initMod +
          (actorData.system.attributes.dex.base +
            actorData.system.attributes.ins.base) /
            2 +
          initBonus +
          eliteOrChampBonus
        : initMod + initBonus
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData (actorData) {
    if (actorData.type !== 'character') return

    // Make modifications to data here. For example:
    const systemData = actorData.system

    // Loop through ability scores, and add their modifiers to our sheet output.
    // for (let [key, ability] of Object.entries(systemData.abilities)) {
    // Calculate the modifier using d20 rules.
    // ability.mod = Math.floor((ability.value - 10) / 2);
    // }
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData (actorData) {
    if (actorData.type !== 'npc') return

    // Make modifications to data here. For example:
    const systemData = actorData.system
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData () {
    const data = super.getRollData()

    // Prepare character roll data.
    this._getCharacterRollData(data)
    this._getNpcRollData(data)

    return data
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData (data) {
    if (this.type !== 'character') return

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    // if (data.abilities) {
    //   for (let [k, v] of Object.entries(data.abilities)) {
    //     data[k] = foundry.utils.deepClone(v);
    //   }
    // }

    // Add level for easier access, or fall back to 0.
    // if (data.attributes.level) {
    //   data.lvl = data.attributes.level.value ?? 0;
    // }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData (data) {
    if (this.type !== 'npc') return

    // Process additional NPC data here.
  }

  async _preUpdate (changed, options, user) {
    const changedHP = changed.system?.resources?.hp
    const currentHP = this.system.resources.hp
    if (typeof changedHP?.value === 'number' && currentHP) {
      const hpChange = changedHP.value - currentHP.value
      const levelChanged = !!changed.system && 'level' in changed.system
      if (hpChange !== 0 && !levelChanged) options.damageTaken = hpChange * -1
    }

    await super._preUpdate(changed, options, user)
  }

  _onUpdate (changed, options, userId) {
    super._onUpdate(changed, options, userId)

    console.log(changed)

    if (options.damageTaken) {
      this.showFloatyText(options.damageTaken)
    }
  }

  async showFloatyText (input) {
    let scrollingTextArgs

    if (!canvas.scene) return;

    const gridSize = canvas.scene.grid.size

    if (_token && typeof input === 'number') {
      scrollingTextArgs = [
        { x: _token.x + gridSize / 2, y: _token.y + gridSize - 20 },
        Math.abs(input),
        {
          fill: input < 0 ? 'lightgreen' : 'white',
          fontSize: 32,
          stroke: 0x000000,
          strokeThickness: 4
        }
      ]
    }

    if (!scrollingTextArgs) return

    await _token._animation
    await canvas.interface?.createScrollingText(...scrollingTextArgs)
  }
}
