/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class FUItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   * This method is automatically called when an item is created or updated.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  /**
   * Prepare a data object which is passed to any Roll formulas that are created related to this Item.
   * @private
   * @returns {object|null} The roll data object, or null if no actor is associated with this item.
   */
  getRollData() {
    // If present, return the actor's roll data.
    if (!this.actor) return null;
    const rollData = this.actor.getRollData();

    // Grab the item's system data as well.
    rollData.item = foundry.utils.deepClone(this.system);

    return rollData;
  }

  /**
   * Get the display data for a weapon item.
   *
   * @returns {object|boolean} An object containing weapon display information, or false if this is not a weapon.
   * @property {string} attackString - The weapon's attack description.
   * @property {string} damageString - The weapon's damage description.
   * @property {string} qualityString - The weapon's quality description.
   */
  getWeaponDisplayData() {
    const isWeaponOrShieldWithDual =
      this.type === "weapon" ||
      (this.type === "shield" && this.system.isDualShield?.value);

    // Check if this item is not a weapon or not a weapon/shield with dual
    if (this.type !== "weapon" && !isWeaponOrShieldWithDual) {
      return false;
    }

    function capitalizeFirst(string) {
      if (typeof string !== "string") {
        // Handle the case where string is not a valid string
        return string;
      }
      return string.charAt(0).toUpperCase() + string.slice(1);
    }

    const hrZeroText = this.system.rollInfo?.useWeapon?.hrZero?.value ? "HR0" : "HR";
    const qualText = this.system.quality?.value || "No Quality";

    const qualityString = [
      capitalizeFirst(this.system.type.value),
      capitalizeFirst(this.system.category.value),
      capitalizeFirst(this.system.hands.value),
      qualText,
    ]
      .filter(Boolean)
      .join(" ⬩ ");

    const attackAttributes = [
      this.system.attributes.primary.value.toUpperCase(),
      this.system.attributes.secondary.value.toUpperCase(),
    ].join(" + ");

    const attackString = `[${attackAttributes}]${
      this.system.accuracy.value > 0 ? ` +${this.system.accuracy.value}` : ""
    }`;

    const damageString = `[${hrZeroText} + ${this.system.damage.value}] ${this.system.damageType.value}`;

    return {
      attackString,
      damageString,
      qualityString: `[${qualityString}]`,
    };
  }

  //【】
  /**
   * Asynchronously calculates and retrieves the single roll information for an item.
   *
   * @param {Item|null} usedItem - The item to be used for the roll, or null to use the current item.
   * @param {boolean} addName - Whether to add the item's name to the output.
   * @param {boolean} isShiftPressed - Whether the Shift key is pressed.
   * @returns {Promise<string>} A formatted HTML string containing the roll information.
   * @throws {Error} Throws an error if the roll cannot be evaluated.
   */
  async getSingleRollForItem(
    usedItem = null,
    addName = false,
    isShiftPressed = false
  ) {
    const item = usedItem || this;
    let content = "";

    const hasImpDamage =
      ["ritual"].includes(item.type) &&
      item.system.rollInfo?.impdamage?.hasImpDamage?.value;
    const isWeapon =
      item.type === "weapon" ||
      (item.type === "shield" && item.system.isDualShield?.value);
    const hasDamage =
      isWeapon ||
      (["spell", "skill", "miscAbility"].includes(item.type) &&
        item.system.rollInfo?.damage?.hasDamage?.value);

    const attrs = isWeapon
      ? item.system.attributes
      : item.system.rollInfo.attributes;
    const accVal = isWeapon
      ? item.system.accuracy.value
      : item.system.rollInfo.accuracy.value || 0;
    const primary = this.actor.system.attributes[attrs.primary.value].current;
    const secondary =
      this.actor.system.attributes[attrs.secondary.value].current;
    const roll = new Roll("1d@prim + 1d@sec + @mod", {
      prim: primary,
      sec: secondary,
      mod: accVal,
    });
    await roll.evaluate({ async: true });

    // Check if the 'dice-so-nice' module is active
    if (game.modules.get("dice-so-nice")?.active) {
      await game.dice3d.showForRoll(
        roll,
        game.user,
        false,
        null,
        false,
        null,
        null
      );
    }

    const bonusAccVal = usedItem ? this.system.rollInfo.accuracy.value : 0;
    const bonusAccValString = bonusAccVal
      ? ` + ${bonusAccVal} (${this.type})`
      : "";
    const acc = roll.total + bonusAccVal;
    const diceResults = roll.terms
      .filter((term) => term.results)
      .map((die) => die.results[0].result);

    // Save the original value of hrZero
    const originalHrZero = item.system.rollInfo?.useWeapon?.hrZero?.value;

    // Temporarily set hrZero to true if Shift is pressed
    if (isShiftPressed) {
      item.system.rollInfo.useWeapon.hrZero.value = true;
    }

    const hr = item.system.rollInfo?.useWeapon?.hrZero?.value
      ? 0
      : Math.max(...diceResults);
    const isFumble = diceResults[0] === 1 && diceResults[1] === 1;
    const isCrit =
      !isFumble && diceResults[0] === diceResults[1] && diceResults[0] >= 6;

    const accString = `${
      diceResults[0]
    } (${attrs.primary.value.toUpperCase()}) + ${
      diceResults[1]
    } (${attrs.secondary.value.toUpperCase()}) + ${accVal} (${
      item.type
    })${bonusAccValString}`;
    const fumbleString = isFumble ? "<strong>FUMBLE!</strong><br />" : "";
    const critString = isCrit ? "<strong>CRITICAL HIT!</strong><br />" : "";

    if (addName) {
      content += `<strong>${item.name}</strong><br />`;
    }

    content += `
    <div class="accuracy-desc align-left">
      <span class="result-text">${critString}${fumbleString}</span>
      <div class="accuracy-box">
        <span class="accuracy-title">Accuracy</span>
      </div>
      <div class="accuracy-details">
        <span class="accuracy-detail-text">
          ${
            diceResults[0]
          } <strong>(${attrs.primary.value.toUpperCase()})</strong>
          + ${
            diceResults[1]
          } <strong>(${attrs.secondary.value.toUpperCase()})</strong>
          + ${accVal}
        </span>
      </div>
      <div class="float-box acc-float">
        <span class="float-text" style="">${acc}</span> to hit!
      </div>
    </div>
  `;

    if (hasDamage) {
      let damVal = isWeapon
        ? item.system.damage.value
        : item.system.rollInfo.damage.value;
      damVal = damVal || 0;
      const bonusDamVal = usedItem ? this.system.rollInfo.damage.value : 0;
      const bonusDamValString = bonusDamVal
        ? ` + ${bonusDamVal} (${this.type})`
        : "";
      const damage = hr + damVal + bonusDamVal;
      const damType = isWeapon
        ? item.system.damageType.value
        : item.system.rollInfo.damage.type.value;

      content += `
      <div class="damage-desc align-left">
        <div class="damage-box">
          <span class="damage-title">Damage</span>
        </div>
        <div class="damage-details">
          <span class="damage-detail-text">
            ${hr} <strong>(HR)</strong> + ${damVal}
          </span>
        </div>
        <div class="float-box dam-float">
          <span class="float-text" style="">${damage}</span> ${damType}!
        </div>
      </div>
    `;
    }

    if (hasImpDamage) {
      const damageTable = {
        5: { minor: 10, heavy: 30, massive: 40 },
        20: { minor: 20, heavy: 40, massive: 60 },
        40: { minor: 30, heavy: 50, massive: 80 },
      };
      const level = item.actor.system.level.value;
      const improvType =
        item.type === "ritual"
          ? item.system.rollInfo.impdamage.impType.value
          : "";
      const damage =
        damageTable[level >= 40 ? 40 : level >= 20 ? 20 : 5][improvType] || 0;
      const damType =
        item.type === "ritual" ? item.system.rollInfo.impdamage.type.value : "";

      content += `
      <div class="damage-desc align-left">
        <div class="damage-box">
          <span class="damage-title">Improvise</span>
        </div>
        <div class="damage-details">
          <span class="damage-detail-text">
            <strong>${improvType}</strong> damage
          </span>
        </div>
        <div class="float-box dam-float">
          <span class="float-text" style="">${damage}</span> ${damType}!
        </div>
      </div>
    `;
    }

    // Restore the original value of hrZero if it was changed
    if (isShiftPressed) {
      item.system.rollInfo.useWeapon.hrZero.value = originalHrZero;
    }

    return content;
  }

  async getRollString(isShiftPressed) {
    const isSpellOrSkill = ["spell", "skill", "miscAbility", "ritual"].includes(
      this.type
    );

    const isWeaponOrShieldWithDual =
      this.type === "weapon" ||
      (this.type === "shield" && this.system.isDualShield?.value);

    const hasRoll =
      isWeaponOrShieldWithDual ||
      (isSpellOrSkill && this.system.hasRoll?.value);

    let mainHandContent = "";
    let offHandContent = "";
    let otherContent = "";

    if (hasRoll) {
      const usesWeapons =
        isSpellOrSkill &&
        (this.system.rollInfo?.useWeapon?.accuracy?.value ||
          this.system.rollInfo?.useWeapon?.damage?.value);

      if (usesWeapons) {
        const equippedWeapons = this.actor.items.filter(
          (singleItem) =>
            (singleItem.type === "weapon" ||
              (singleItem.type === "shield" &&
                singleItem.system.isDualShield?.value)) &&
            singleItem.system.isEquipped?.value
        );

        for (const equippedWeapon of equippedWeapons) {
          // Pass isShiftPressed to getSingleRollForItem
          const data = await this.getSingleRollForItem(
            equippedWeapon,
            true,
            isShiftPressed
          );
          if (equippedWeapon.system.isEquipped.slot === "mainHand") {
            mainHandContent += data;
          } else if (equippedWeapon.system.isEquipped.slot === "offHand") {
            offHandContent += data;
          }
        }

        if (mainHandContent === "" && offHandContent === "") {
          mainHandContent = "<div style='display:none;'>";
          offHandContent = "<div style='display:none;'>";
        } else {
          mainHandContent =
            mainHandContent || "<strong>No Main-Hand Equipped!</strong>";
          offHandContent =
            offHandContent || "<strong>No Off-Hand Equipped!</strong>";
        }

        mainHandContent = `<p class="mainhand-header">Main: ${mainHandContent}</p>`;
        offHandContent = `<p class="offhand-header">Off: ${offHandContent}</p>`;
      } else {
        // Pass isShiftPressed to getSingleRollForItem
        otherContent = await this.getSingleRollForItem(
          null,
          false,
          isShiftPressed
        );
      }
    }

    // Conditional rendering for otherContent can be added here if needed.
    // Example:
    // if (otherContent !== null) {
    //   otherContent = `<p class="other-header">${otherContent}</p>`;
    // }

    return mainHandContent + offHandContent + otherContent;
  }

  getDescriptionString() {
    const item = this;
    const summary = item.system.summary.value;
    const hasSummary = summary && summary.trim() !== "";
    const description = item.system.description;
    const hasDescription = description && description.trim() !== "";

    if (hasSummary || hasDescription) {
      return `<div class="chat-desc">
        ${
          hasSummary
            ? `<blockquote class="summary quote">${summary}</blockquote>`
            : ""
        }
        ${hasDescription ? `<span>${description}</span>` : ""}
      </div>`;
    } else {
      return "";
    }
  }

  getQualityString() {
    if (!["weapon", "shield", "armor", "accessory"].includes(this.type)) {
      return "";
    }
    const DEF = game.i18n.localize("FU.DefenseAbbr");
    const MDEF = game.i18n.localize("FU.MagicDefenseAbbr");
    const INIT = game.i18n.localize("FU.InitiativeAbbr");
    const hasQualityValue = this.system.quality.value.trim() !== "";
    function capitalizeFirst(string) {
      if (typeof string !== "string") {
        return string;
      }
      return string.charAt(0).toUpperCase() + string.slice(1);
    }

    let content = "";

    if (["weapon", "shield", "armor", "accessory"].includes(this.type)) {
      content += `
        <div class="detail-desc flex-group-center grid grid-3col">
          ${
            ["weapon", "shield"].includes(this.type) && this.system.type
              ? `<div class="summary">${capitalizeFirst(
                  this.system.type.value
                )}</div>`
              : ""
          }
          ${
            ["weapon", "shield"].includes(this.type)
              ? `<div class="summary">${capitalizeFirst(
                  this.system.hands.value
                )}</div>`
              : ""
          }
          ${
            ["weapon", "shield"].includes(this.type) && this.system.category
              ? `<div class="summary">${capitalizeFirst(
                  this.system.category.value
                )}</div>`
              : ""
          }
          ${
            ["shield", "armor", "accessory"].includes(this.type)
              ? `<div class="summary">${DEF} ${this.system.def.value}</div>`
              : ""
          }
          ${
            ["shield", "armor", "accessory"].includes(this.type)
              ? `<div class="summary">${MDEF} ${this.system.mdef.value}</div>`
              : ""
          }
          ${
            ["shield", "armor", "accessory"].includes(this.type)
              ? `<div class="summary">${INIT} ${this.system.init.value}</div>`
              : ""
          }
        </div>`;

      if (hasQualityValue) {
        content += `
          <div class="detail-desc flexrow" style="padding: 0 2px;">
            <div class="summary">Quality: ${this.system.quality.value}</div>
          </div>`;
      }
    }
    return content;
  }

  getSpellDataString() {
    const item = this;
    if (item.type !== "spell") {
      return "";
    }
    if (item.type === "spell") {
      const { mpCost, target, duration } = item.system;
      return `<div class="spell-desc flex-group-center grid grid-3col">
                <div>${duration.value}</div>
                <div>${target.value}</div>
                <div>${mpCost.value} MP</div>
              </div>`;
    }
    return "";
  }

  getRitualDataString() {
    const item = this;
    if (this.type !== "ritual") {
      return "";
    }

    if (item.type === "ritual") {
      const { mpCost, dLevel, clock } = this.system;
      return `<div class="spell-desc flex-group-center grid grid-3col">
                <div>${mpCost.value} MP</div>
                <div>${dLevel.value} DL</div>
                <div>Clock ${clock.value}</div>
              </div>`;
    }
    return "";
  }

  getProjectDataString() {
    const item = this;
    if (item.type !== "project") {
      return "";
    }

    if (item.type === "project") {
      const { cost, discount, progress, progressPerDay, days } = item.system;

      const discountText = discount.value
        ? `<span><br>-${discount.value} Discount</span>`
        : "";

      return `<div class="spell-desc flex-group-center grid grid-3col">
                <div>
                  <span>${cost.value} Zenith</span>
                  ${discountText}
                </div>
                <div>${progress.value} Progress</div>
                <div>${progressPerDay.value} progress per day / ${days.value} days</div>
              </div>`;
    }
    return "";
  }

  getHeroicDataString() {
    if (this.type !== "heroic") {
      return "";
    }

    const { class: heroicClass, requirement, heroicStyle } = this.system;

    if (
      (heroicClass && heroicClass.value.trim()) ||
      (requirement && requirement.value.trim()) ||
      (heroicStyle && heroicStyle.value.trim())
    ) {
      return `<div class="spell-desc flex-group-center">
                ${
                  heroicClass && heroicClass.value.trim()
                    ? `<div>Class: ${heroicClass.value}</div>`
                    : ""
                }
                ${
                  requirement && requirement.value.trim()
                    ? `<div>Requirements: ${requirement.value}</div>`
                    : ""
                }
              </div>`;
    }

    return "";
  }

  getZeroDataString() {
    if (this.type !== "zeroPower") {
      return "";
    }
    const {
      system: { zeroTrigger, zeroEffect, trigger },
    } = this;
    const hasZeroTrigger = zeroTrigger.description?.trim();
    const hasZeroEffect = zeroEffect.description?.trim();

    if (hasZeroTrigger || hasZeroEffect) {
      return `
        <div class="spell-desc flex-group-center grid grid-3col"> 
          <div class="summary">${zeroTrigger.value}</div>
          <div class="summary">${zeroEffect.value}</div>
          <div class="summary">Clock <br> ${trigger.current} / ${
            trigger.max
          } </div>
        </div>
        <div class="chat-desc">
          ${
            hasZeroTrigger
              ? `<div class="resource-label">${zeroTrigger.value}</div><div>${zeroTrigger.description}</div>`
              : ""
          }
          ${
            hasZeroEffect
              ? `<div class="resource-label">${zeroEffect.value}</div><div>${zeroEffect.description}</div>`
              : ""
          }
        </div>`;
    }
    return "";
  }

  /**
   * Get the target description based on the provided number.
   * @param {number} num - The number to determine the target description.
   * @returns {string} The target description.
   */
  /* 
  getTargetFromNumber(num) {
    if (num <= 6) {
      return "You <b>or</b> one ally you can see that is present on the scene";
    } else if (num <= 11) {
      return "One enemy you can see that is present on the scene";
    } else if (num <= 16) {
      return "You <b>and</b> every ally present on the scene";
    } else {
      return "Every enemy present on the scene";
    }
  }
  */
  /**
   * Get the effect description based on the provided number and level.
   * @param {number} num - The number to determine the effect description.
   * @param {number} level - The level to determine damage value.
   * @returns {string} The effect description.
   */
  /* 
  getEffectFromNumber(num, level) {
    // Calculate damage value based on level
    const damageVal = level >= 40 ? 40 : level >= 20 ? 30 : 20;

    // Switch to determine effect based on the provided number
    switch (num) {
      case 1:
        return "treats their <b>Dexterity</b> and <b>Might</b> dice as if they were one size higher (up to a maximum of <b>d12</b>) until the end of your next turn.";
      case 2:
        return "treats their <b>Insight</b> and <b>Willpower</b> dice as if they were one size higher (up to a maximum of <b>d12</b>) until the end of your next turn.";
      case 3:
        return `suffers ${damageVal} <b>air</b> damage.`;
      case 4:
        return `suffers ${damageVal} <b>bolt</b> damage.`;
      case 5:
        return `suffers ${damageVal} <b>dark</b> damage.`;
      case 6:
        return `suffers ${damageVal} <b>earth</b> damage.`;
      case 7:
        return `suffers ${damageVal} <b>fire</b> damage.`;
      case 8:
        return `suffers ${damageVal} <b>ice</b> damage.`;
      case 9:
        return `gains Resistance to <b>air</b> and <b>fire</b> damage until the end of the scene.`;
      case 10:
        return `gains Resistance to <b>bolt</b> and <b>ice</b> damage until the end of the scene.`;
      case 11:
        return `gains Resistance to <b>dark</b> and <b>earth</b> damage until the end of the scene.`;
      case 12:
        return "suffers <b>enraged</b>.";
      case 13:
        return "suffers <b>poisoned</b>.";
      case 14:
        return "suffers <b>dazed</b>, <b>shaken</b>, <b>slow</b>, and <b>weak</b>.";
      case 15:
        return "recovers from all status effects.";
      case 16:
      case 17:
        return "recovers 50 Hit Points and 50 Mind Points.";
      case 18:
        return "recovers 100 Hit Points.";
      case 19:
        return "recovers 100 Mind Points.";
      case 20:
        return "recovers 100 Hit Points and 100 Mind Points.";
      default:
        return "Unknown effect"; // Handle cases beyond the provided cases
    }
 */
  /**
   * Generate an Alchemy description string based on the provided item's properties.
   * @returns {string} The Alchemy description string.
   */
/*   async getAlchemyString() {
    const item = this; // The current item context
    let string = ""; // The generated Alchemy description string
    const level = item.actor.system.level.value; // The level of the actor using the item

    // Check if the item is an Alchemy-related miscAbility
    if (item.type === "miscAbility" && item.name.includes("Alchemy")) {
      const numRolls = item.name.includes("Superior")
        ? 4
        : item.name.includes("Advanced")
        ? 3
        : 2;
      const shouldTrim = !item.name.includes("(all)");
      const rollParts = [];

      // Create the dice roll expression for the number of rolls
      for (let i = 0; i < numRolls; i++) {
        rollParts.push("1d20");
      }
      const roll = new Roll(rollParts.join(" + "), {});

      // Evaluate the dice roll asynchronously
      await roll.evaluate({ async: true });
      // Show the dice roll results to the user using 3D dice
      if (game.modules.get("dice-so-nice")?.active) {
        await game.dice3d.showForRoll(
          roll,
          game.user,
          false,
          null,
          false,
          null,
          null
        );
      }
      // Extract the results of individual dice from the roll
      const diceResults = roll.terms
        .filter((term) => term.results)
        .map((die) => die.results[0].result);

      const allEffects = [];
      const allEffectsOutput = [];

      // Process each dice result
      diceResults.forEach((num, i) => {
        const thisResultEffects = [];
        const thisResultOutput = [];
        const target = this.getTargetFromNumber(num); // Get the target description based on the dice result
        const isFriends = target.includes("ally");

        // Generate and store damage effect
        if (!shouldTrim || !isFriends) {
          const damEffect = `${target} suffers 20 <b>poison</b> damage.`;
          thisResultEffects.push(damEffect);
          thisResultOutput.push({
            combo: `${num}+Any`,
            effect: damEffect,
          });
        }

        // Generate and store healing effect
        const healEffect = `${target} recovers 30 Hit Points.`;
        thisResultEffects.push(healEffect);
        thisResultOutput.push({
          combo: `${num}+Any`,
          effect: healEffect,
        });

        const otherResults = [...diceResults];
        otherResults.splice(i, 1);

        // Generate and store additional effects based on other dice results
        otherResults.forEach((res) => {
          const effect = `${target} ${this.getEffectFromNumber(res, level)}`;
          const effectForFriends = !effect.includes("suffers");
          const effectForFoes =
            !effect.includes("treats") &&
            !effect.includes("gains") &&
            !effect.includes("recovers from");
          const shouldInclude =
            !shouldTrim ||
            (isFriends && effectForFriends) ||
            (!isFriends && effectForFoes);

          if (!thisResultEffects.includes(effect) && shouldInclude) {
            thisResultEffects.push(effect);
            thisResultOutput.push({
              combo: `${num}+${res}`,
              effect,
            });
          }
        });

        // Store unique effects for each dice result
        thisResultOutput.forEach((effect) => {
          if (!allEffects.includes(effect.effect)) {
            allEffects.push(effect.effect);
            allEffectsOutput.push({
              combo: effect.combo,
              effect: effect.effect,
            });
          }
        });
      });

      // Construct the final Alchemy description string
      string += `Rolls: ${diceResults.join(" ")}<br /><br />`;
      string += `<b>Possible Effects:</b><table><tr><th>Combo</th><th>Effect</th></tr>`;

      // Append each effect to the description string
      allEffectsOutput.forEach((effect) => {
        string += `<tr><td style="width:65px;">${effect.combo}</td><td>${effect.effect}</td></tr>`;
      });
      string += "</table>";
    }

    return string;
  }
 */
  /**
   * Handle clickable rolls.
   * @param {Event} event The originating click event.
   * @private
   */
  async roll(isShiftPressed) {
    const item = this;
    const { system, img, name, type } = item;
    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: item.actor });
    const rollMode = game.settings.get("core", "rollMode");

    const label = `
    <div class="title-desc">
      <div class="flex-group-center backgroundstyle">
        <img src="${img}" alt="Image" />
        <p>${name}</p>
      </div>
    </div>
  `;

    // Check if there's no roll data
    if (!system.formula) {
      const chatdesc = item.getDescriptionString();
      // Pass isShiftPressed to getRollString()
      const attackData = await item.getRollString(isShiftPressed);
      const spellString = item.getSpellDataString();
      const ritualString = item.getRitualDataString();
      const projectString = item.getProjectDataString();
      const heroicString = item.getHeroicDataString();
      const zeroString = item.getZeroDataString();
      //const alchemyString = await item.getAlchemyString();
      const qualityString = item.getQualityString();

      const attackString = Array.isArray(attackData)
        ? attackData.join("<br /><br />")
        : attackData;

      // Prepare the content by filtering and joining various parts.
      const content = [
        qualityString,
        spellString,
        ritualString,
        projectString,
        heroicString,
        zeroString,
        chatdesc,
        attackString,
        //alchemyString,
      ]
        .filter((part) => part)
        .join("");

      if (["spell"].includes(type)) {
        socketlib.system.executeForEveryone("cast", name);
      }
      if (
        ["consumable", "skill", "weapon"].includes(type) ||
        system.showTitleCard?.value
      ) {
        socketlib.system.executeForEveryone("use", name);
      }

      // Create a chat message.
      ChatMessage.create({
        speaker: speaker,
        rollMode: "roll",
        flavor: label,
        content,
        flags: { item },
      });
    } else {
      // Retrieve roll data.
      const rollData = item.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.item.formula, rollData);
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }
}
