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
    // Check if this item is a weapon
    if (this.type !== "weapon") {
        return false;
    }
    
    const qualText = this.system.quality?.value
      ? this.system.quality.value
      : "No Quality.";
    const qualityString = `${this.system.hands.value} ⬩ ${this.system.type.value} ⬩ ${qualText}`;
    let attackString = `【${this.system.attributes.primary.value.toUpperCase()} + ${this.system.attributes.secondary.value.toUpperCase()}】`;
    if (this.system.accuracy.value > 0) {
      attackString += ` +${this.system.accuracy.value}`;
    }
    const damageString = `【HR + ${this.system.damage.value}】${this.system.damageType.value}`;

    return {
      attackString,
      damageString,
      qualityString,
    };
  }

  async getSingleRollForItem(usedItem = null, addName = false) {
    const item = usedItem ?? this;
    let content = "";

    const hasDamage =
      item.type === "weapon" ||
      (["spell", "skill", "miscAbility"].includes(item.type) &&
        item.system.rollInfo?.damage?.hasDamage?.value);

    const hasImpDamage =
      (["ritual"].includes(item.type) &&
      item.system.rollInfo?.impdamage?.hasImpDamage?.value);

    const attrs =
      item.type === "weapon"
        ? item.system.attributes
        : item.system.rollInfo.attributes;
    let accVal =
      item.type === "weapon"
        ? item.system.accuracy.value
        : item.system.rollInfo.accuracy.value;
    accVal = accVal ?? 0;

    const primary = this.actor.system.attributes[attrs.primary.value].current;
    const secondary =
      this.actor.system.attributes[attrs.secondary.value].current;
    const roll = new Roll("1d@prim + 1d@sec + @mod", {
      prim: primary,
      sec: secondary,
      mod: accVal,
    });
    await  roll.evaluate({async: true});
    
    // Check if the 'dice-so-nice' module is active
    if (game.modules.get('dice-so-nice')?.active) {
      // If the module is active, show dice animation for a roll
      // Parameters: showForRoll(roll, user, hidden, messageOptions, data, flavor, speaker)
      // - roll: The roll object you want to animate
      // - user: The user who triggered the roll
      // - hidden: Whether the result should be hidden from other players
      // - messageOptions: Options for the dice roll message
      // - data: Additional data for the dice animation
      // - flavor: Flavor text for the roll
      // - speaker: Speaker for the roll's message
      await game.dice3d.showForRoll(roll, game.user, false, null, false, null, null);
    }

    const bonusAccVal = usedItem ? this.system.rollInfo.accuracy.value : 0;
    const bonusAccValString = bonusAccVal
      ? ` + ${bonusAccVal} (${this.type})`
      : "";

    const acc = roll.total + bonusAccVal;
    const diceResults = roll.terms
      .filter((term) => term.results)
      .map((die) => die.results[0].result);
    const hr =
      this.system.rollInfo && this.system.rollInfo.useWeapon?.hrZero?.value
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
    content += ` <div class="align-left" style="margin-top: 24px; margin-bottom: 24px;">
      <span style="align-text: right;color: Ivory; font-size: 18px; margin-bottom: 10px; background-image: linear-gradient(DarkRed, Crimson);">${critString}${fumbleString}</span>
      <div>
        <span style="color:Ivory;font-size:28px;text-shadow: 1px 2px 4px #000000;box-shadow:3px 6px DarkSlateGray;border-radius: 8px 8px 8px 0px;padding: 5px;background-color: #3d6243;font-family: 'Signika';">Accuracy</span>
      </div>
      <div>
        <span style="color:Ivory;font-size:16px;text-shadow: 1px 2px 4px #000000;box-shadow:3px 6px DarkSlateGray;border-radius: 0px 8px 8px 8px;padding: 0px 15px 5px 10px;background-color: #3d6243;font-family: 'Signika';">${diceResults[0]} <strong>(${attrs.primary.value.toUpperCase()})</strong> + ${diceResults[1]} <strong>(${attrs.secondary.value.toUpperCase()})</strong> + ${accVal}
      </div>
      <div style="float:right;">
        </span>
        <span style="font-size: 24px;border-radius:8px;padding:4px;color: #476144;box-shadow: 3px 6px darkslategrey;background-color: rgba(225, 239, 227, 0.5);border-style: solid;border-width: thin;">
          <strong>
            <span style="display:inline-block;font-size: 38px;animation:floating 3s infinite ease-in-out;">${acc}</span> to hit! </span>
        </strong>
        <br />
      </div>
    </div>`; 

    if (hasDamage) {
      let damVal =
        item.type === "weapon"
          ? item.system.damage.value
          : item.system.rollInfo.damage.value;
      damVal = damVal ?? 0;

      const bonusDamVal = usedItem ? this.system.rollInfo.damage.value : 0;
      const bonusDamValString = bonusDamVal
        ? ` + ${bonusDamVal} (${this.type})`
        : "";

      const damage = hr + damVal + bonusDamVal;
      const damType =
        item.type === "weapon"
          ? item.system.damageType.value
          : item.system.rollInfo.damage.type.value;
      const damString = `${hr} (HR) + ${damVal} (${item.type})${bonusDamValString}`;
    content += ` <div class="align-left" style="position: relative; top: 24px;">
      <div>
        <span style="color:Ivory;font-size:28px;text-shadow: 1px 2px 4px #000000;box-shadow:3px 6px DarkSlateGray;border-radius: 8px 8px 8px 0px;padding: 5px;background-color: #3d6243;font-family: 'Signika';">Damage</span>
      </div>
      <div>
        <span style="color:Ivory;font-size:16px;text-shadow: 1px 2px 4px #000000;box-shadow:3px 6px DarkSlateGray;border-radius: 0px 8px 8px 8px;padding: 0px 15px 5px 10px;background-color: #3d6243;font-family: 'Signika';">${hr} <strong>(HR)</strong> + ${damVal}
      </div>
      <div style="float:right; position: relative; bottom:24px;">
        <span style="font-size: 24px;border-radius:8px;padding:4px;color: #476144;box-shadow: 3px 6px darkslategrey;background-color: rgba(225, 239, 227, 0.5);border-style: solid;border-width: thin;">
          <strong>
            <span style="display:inline-block;font-size: 38px;animation:floating 3s infinite ease-in-out;"> ${damage} </span> ${damType}! </span>
        <br />
        </strong>
      </div>
    </div>`;
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
          : ""
      
      const damage = (damageTable[level >= 40 ? 40 : level >= 20 ? 20 : 5][improvType]) || 0;

      const damType =
      item.type === "ritual"
        ? item.system.rollInfo.impdamage.type.value
        : ""

        content += ` <div class="align-left" style="position: relative; top: 24px;">
        <div>
          <span style="color:Ivory;font-size:28px;text-shadow: 1px 2px 4px #000000;box-shadow:3px 6px DarkSlateGray;border-radius: 8px 8px 8px 0px;padding: 5px;background-color: #3d6243;font-family: 'Signika';">Damage</span>
        </div>
        <div>
          <span style="color:Ivory;font-size:16px;text-shadow: 1px 2px 4px #000000;box-shadow:3px 6px DarkSlateGray;border-radius: 0px 8px 8px 8px;padding: 0px 15px 5px 10px;background-color: #3d6243;font-family: 'Signika';">
            <strong>${improvType}</strong> damage
        </div>
        <div style="float:right; position: relative; bottom:24px;">
           <span style="font-size: 24px;border-radius:8px;padding:4px;color: #476144;box-shadow: 3px 6px darkslategrey;background-color: rgba(225, 239, 227, 0.5);border-style: solid;border-width: thin;">
            <strong>
              <span style="display:inline-block;font-size: 38px;animation:floating 3s infinite ease-in-out;"> ${damage} </span> ${damType}! </span>
          <br />
          </strong>
        </div>
      </div>`;
      }

    return content;
  }

  async getRollString() {
    const item = this;
    let content = "";
    const isSpellOrSkill = ["spell", "skill", "miscAbility", "ritual"].includes(
      item.type
    );

    const hasRoll =
      item.type === "weapon" || (isSpellOrSkill && item.system.hasRoll?.value);

    if (hasRoll) {
      const usesWeapons =
        isSpellOrSkill &&
        (item.system.rollInfo?.useWeapon?.accuracy?.value ||
          item.system.rollInfo?.useWeapon?.damage?.value);

      if (usesWeapons) {
        const equippedWeapons = item.actor.items.filter(
          (singleItem) =>
            singleItem.type === "weapon" && singleItem.system.isEquipped?.value
        );
        const itemContents = [];
        for (let i = 0; i < equippedWeapons.length; i++) {
          const data = await this.getSingleRollForItem(
            equippedWeapons[i],
            true
          );
          itemContents.push(data);
          content = itemContents;
        }
        if (equippedWeapons.length === 0) {
          content += `<strong>No Item Equipped!</strong>`;
        }
      } else {
        content = await this.getSingleRollForItem();
      }
    }

    return content;
  }

  getQualityString() {
    const item = this;
    if (item.type === "weapon") {
      return `
        <div class="detail-desc flex-group-center grid grid-3col" style="padding: 0 2px;">
          <p>${item.system.type.value}</p>
          <p>${item.system.hands.value}</p>
          <p>${item.system.category.value}</p>
        </div>
        <div class="detail-desc" style="padding: 0 2px;">
          <p>${item.system.quality.value}</p>
        </div>`;
    } else if (["shield", "armor", "accessory"].includes(item.type)) {
      return `
        <div class="detail-desc" style="padding: 0 2px;">
          <p>${item.system.quality.value}</p>
        </div>`;
    } else {
      return "";
    }
  }
  
  
  getSpellDataString() {
    const item = this;
    return item.type === "spell"
      ? `<div class="spell-desc flex-group-center grid grid-3col">
          <p>${item.system.mpCost.value} MP</p>
          <p>${item.system.target.value}</p>
          <p>${item.system.duration.value}</p>
        </div>`
      : "";
  }
  
  getRitualDataString() {
    const item = this;
    return item.type === "ritual"
      ? `<div class="spell-desc flex-group-center grid grid-3col">
          <p>${item.system.mpCost.value} MP</p>
          <p>${item.system.dLevel.value} DL</p>
          <p>Clock ${item.system.clock.value}</p>
        </div>`
      : "";
  }
  
  getProjectDataString() {
    const item = this;
    return item.type === "project"
      ? `<div class="spell-desc flex-group-center grid grid-3col">
          <div>
            <span>${item.system.cost.value} Zenith</span>
            <span>${item.system.discount.value ? `<br>-${item.system.discount.value} Covered` : ''}</span>
          </div>
          <div>${item.system.progress.value} Progress</div>
          <div>${item.system.progressPerDay.value} progress per day / ${item.system.days.value} days</div>
        </div>`
      : "";
  }
  
  getHeroicDataString() {
    const item = this;
    return item.type === "heroicSkill"
      ? `<div class="spell-desc flex-group-center">
          <p>Class: ${item.system.class.value}</p>
          <p>Requirements: ${item.system.requirement.value}</p>
        </div>`
      : "";
  }

  getZeroDataString() {
    const item = this;
    return item.type === "zeroPower"
      ?  `<div class="spelldesc flex-group-center grid grid-3col"> <p>${item.system.zeroTrigger.value}</p> <p>${item.system.zeroEffect.value}</p> <p>Clock <br> ${item.system.trigger.current} / ${item.system.trigger.max} </p> </div>`
      : "";
  }
  
  /**
   * Get the target description based on the provided number.
   * @param {number} num - The number to determine the target description.
   * @returns {string} The target description.
   */
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
  /**
   * Get the effect description based on the provided number and level.
   * @param {number} num - The number to determine the effect description.
   * @param {number} level - The level to determine damage value.
   * @returns {string} The effect description.
   */
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
  }

  /**
   * Generate an Alchemy description string based on the provided item's properties.
   * @returns {string} The Alchemy description string.
   */
  async getAlchemyString() {
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
      await roll.evaluate({async: true});
      // Show the dice roll results to the user using 3D dice
      if (game.modules.get('dice-so-nice')?.active) {
        await game.dice3d.showForRoll(roll, game.user, false, null, false, null, null);
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

/**
 * Handle clickable rolls.
 * @param {Event} event The originating click event.
 * @private
 */
  async roll() {
    const item = this;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get("core", "rollMode");
    const label = `<div class="flex-group-center backgroundstyle">
    <img style="border: 0px; -webkit-filter: drop-shadow(2px 2px 4px #000000); filter: drop-shadow(2px 2px 4px #000000); position: relative; bottom: 195px; margin-bottom: -200px;" src="${item.img}" width="48" height="48" />
    <p style="line-height: 1.2; color: Ivory; font-size: 24px; text-shadow: 2px 2px 4px #000000; box-shadow: 3px 6px darkslategrey; border-style: solid; border-width: thin; border-color: #fbfced; padding: 10px; border-radius: 12px; background-color: #3d6243;">${item.name}</p>
  </div>`;

    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
      const chatdesc = `<div class="chat-desc"><p>${item.system.description}</p></div>`;
      const attackData = await this.getRollString();
      const spellString = this.getSpellDataString();
      const ritualString = this.getRitualDataString();
      const projectString = this.getProjectDataString();
      const heroicString = this.getHeroicDataString();
      const zeroString = this.getZeroDataString();
      const alchemyString = await this.getAlchemyString();
      const qualityString = this.getQualityString();

      const attackString = Array.isArray(attackData) ? attackData.join("<br /><br />") : attackData;

      // Prepare the content by filtering and joining various parts.
      let content = [
        qualityString,
        spellString,
        ritualString,
        projectString,
        heroicString,
        zeroString,
        chatdesc,
        attackString,
        alchemyString,
      ]
        .filter((part) => part)
        .join("");

      content = content ? `${content}` : "";

      const shouldShowNotification =
        ["spell", "weapon", "consumable"].includes(item.type) ||
        item.system.showTitleCard?.value;

      if (shouldShowNotification) {
        socketlib.system.executeForEveryone("floatingText", item.name);
      }

      // Create a chat message.
      ChatMessage.create({
        speaker: speaker,
        rollMode: 'roll',
        flavor: label,
        content,
        flags: {
          item: this,
        },
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.item.formula, rollData);
      // If you need to store the value first, uncomment the next line.
      // let result = await roll.roll({async: true});
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }
}