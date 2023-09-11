import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from "../helpers/effects.mjs";

/* Randomize array in-place using Durstenfeld shuffle algorithm */
function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class FUActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["fabulaultima", "sheet", "actor"],
      template: "systems/fabulaultima/templates/actor/actor-character-sheet.html",
      width: 600,
      height: 1150,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "features",
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/fabulaultima/templates/actor/actor-${this.actor.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    this._prepareItems(context);
    this._prepareCharacterData(context);

    // Prepare character data and items.
    if (actorData.type == "character") {
    }

    // Prepare NPC data and items.
    if (actorData.type == "npc") {
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    // Handle ability scores.
    for (let [k, v] of Object.entries(context.system.attributes)) {
      v.label = game.i18n.localize(CONFIG.FU.attributes[k]) ?? k;
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const weapons = [];
    const armor = [];
    const shields = [];
    const accessories = [];
    const classes = [];
    const skills = [];
    const heroics = [];
    const spells = [];
    const abilities = [];
    const behaviors = [];
    const consumables = [];
    const projects = [];
    const rituals = [];
    const zeroPowers = [];

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;

      if (i.system.quality?.value) {
        i.quality = i.system.quality.value;
      }

      i.isMartial = i.system.isMartial?.value ? true : false;
      i.isOffensive = i.system.isOffensive?.value ? true : false;
      i.isBehavior = i.system.isBehavior?.value ? true : false;
      i.equipped = i.system.isEquipped?.value ? true : false;
      i.equippedSlot = i.system.isEquipped && i.system.isEquipped.slot ? true : false;
      i.level = i.system.level?.value;
      i.class = i.system.class?.value;
      i.mpCost = i.system.mpCost?.value;
      i.target = i.system.target?.value;
      i.duration = i.system.duration?.value;
      i.dLevel = i.system.dLevel?.value;
      i.clock = i.system.clock?.value;
      i.progress = i.system.progress?.value;
      i.progressPerDay = i.system.progressPerDay?.value;
      i.days = i.system.days?.value;
      i.potency = i.system.potency?.value; 
      i.area = i.system.area?.value;
      i.use = i.system.use?.value;
      i.defect = i.system.isDefect?.value ? true : false;
      i.defectMod = i.system.use?.value;
      i.zeroTrigger = i.system.zeroTrigger?.value;
      i.zeroEffect = i.system.zeroEffect?.value;
      i.triggerCurr = i.system.trigger?.current;
      i.triggerStep = i.system.trigger?.step;
      i.triggerMax = i.system.trigger?.max;

      if (["armor", "shield", "accessory"].includes(i.type)) {
        i.def =
          i.isMartial && i.type === "armor"
            ? i.system.def.value
            : `+${i.system.def.value}`;
        i.mdef = `+${i.system.mdef.value}`;
        i.init =
          i.system.init.value > 0
            ? `+${i.system.init.value}`
            : i.system.init.value;
      }

      if (i.type === "weapon") {
        const itemObj = context.actor.items.get(i._id);
        const weapData = itemObj.getWeaponDisplayData();

        i.quality = weapData.qualityString;
        i.attackString = weapData.attackString;
        i.damageString = weapData.damageString;

        weapons.push(i);
      } else if (i.type === "armor") {
        armor.push(i);
      } else if (i.type === "shield") {
        shields.push(i);
      } else if (i.type === "accessory") {
        accessories.push(i);
      } else if (i.type === "class") {
        classes.push(i);
      } else if (i.type === "skill") {
        skills.push(i);
      } else if (i.type === "heroic") {
        heroics.push(i);
      } else if (i.type === "spell") {
        spells.push(i);
      } else if (i.type === "miscAbility") {
        abilities.push(i);
      } else if (i.type === "behavior") {
        behaviors.push(i);
      } else if (i.type === "consumable") {
        consumables.push(i);
      } else if (i.type === "project") {
        projects.push(i);
      } else if (i.type === "ritual") {
        rituals.push(i);  
      } else if (i.type === "zeroPower") {
        zeroPowers.push(i);  
      }
    }

    // Assign and return
    context.weapons = weapons;
    context.armor = armor;
    context.shields = shields;
    context.accessories = accessories;
    context.classes = classes;
    context.skills = skills;
    context.heroics = heroics;
    context.spells = spells;
    context.abilities = abilities;
    context.behaviors = behaviors;
    context.consumables = consumables;
    context.projects = projects;
    context.rituals = rituals;
    context.zeroPowers = zeroPowers; 
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find(".item-edit").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find(".item-create").click(this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.find(".item-delete").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Equip Inventory Item on Left-Click
    // This will equip item to main-hand slot
    // This slot would only support weapons, other equipped items
    // (armor, accessories, etc) will be equippable normally
    // If a two-handed weapon is equipped, it will occupy main-hand & off-hand
    // Left-click listener to equip item
    html.find(".item-equip").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const itemId = li.data("itemId");
      const item = this.actor.items.get(itemId);

      const currentEquipped = item.system.isEquipped.value;
      let slot = "";

      // Determine the slot based on item type
      if (item.type === "weapon" || item.type === "shield") {
        slot = "mainHand";
      } else if (item.type === "armor") {
        slot = "armor";
      } else if (item.type === "accessory") {
        slot = "accessory";
      } else {
        slot = "default";
      }

      console.log("Left-click - Item ID:", itemId);
      console.log("Left-click - Slot:", slot);
      console.log("Left-click - Equipped Slot:", item.system.isEquipped ? item.system.isEquipped.slot : "Not equipped");
      console.log("Left-click - Current Equipped:", currentEquipped);

      // Unequip all items in the same slot
      this.actor.items.forEach(i => {
        if (i.system.isEquipped && i.system.isEquipped.slot === slot && i.id !== itemId) {
          i.update({
            "system.isEquipped.value": false,
            "system.isEquipped.slot": "default" // Reset slot to default
          });
        }
      });

      // Update the equipped slot and state in the item data
      this.actor.updateEmbeddedDocuments("Item", [
        { _id: itemId, "system.isEquipped.slot": slot },
        { _id: itemId, "system.isEquipped.value": !currentEquipped },
      ]);
    });

    // Right-click listener to equip item
    html.find(".item-equip").on("contextmenu", (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const itemId = li.data("itemId");
      const item = this.actor.items.get(itemId);

      const currentEquipped = item.system.isEquipped.value;
      let slot = "";

      // Determine the slot based on item type
      if (item.type === "weapon" || item.type === "shield") {
        slot = "offHand";
      } else if (item.type === "armor") {
        slot = "armor";
      } else if (item.type === "accessory") {
        slot = "accessory";
      } else {
        slot = "default";
      }

      console.log("Right-click - Item ID:", itemId);
      console.log("Right-click - Slot:", slot);
      console.log("Right-click - Equipped Slot:", item.system.isEquipped ? item.system.isEquipped.slot : "Not equipped");
      console.log("Right-click - Current Equipped:", currentEquipped);

      // Unequip all items in the same slot
      this.actor.items.forEach(i => {
        if (i.system.isEquipped && i.system.isEquipped.slot === slot && i.id !== itemId) {
          i.update({
            "system.isEquipped.value": false,
            "system.isEquipped.slot": "default" // Reset slot to default
          });
        }
      });

      // Update the equipped slot and state in the item data
      this.actor.updateEmbeddedDocuments("Item", [
        { _id: itemId, "system.isEquipped.slot": slot },
        { _id: itemId, "system.isEquipped.value": !currentEquipped },
      ]);

      // Prevent the default right-click context menu
      ev.preventDefault();
    });
    
    // Add item to Favorite Section
    html.find(".item-favored").click((ev) => { 
      const li = $(ev.currentTarget).parents(".item");
      const itemId = li.data("itemId");
      const item = this.actor.items.get(itemId);
      const isFavoredBool = item.system.isFavored.value;
      this.actor.updateEmbeddedDocuments("Item", [
        { _id: itemId, "system.isFavored.value": !isFavoredBool },
      ]);
    });

    // Add item to Behavior Roll
    html.find(".item-behavior").click((ev) => { 
      const li = $(ev.currentTarget).parents(".item");
      const itemId = li.data("itemId");
      const item = this.actor.items.get(itemId);
      const isBehaviorBool = item.system.isBehavior.value;
      this.actor.updateEmbeddedDocuments("Item", [
        { _id: itemId, "system.isBehavior.value": !isBehaviorBool },
      ]);
    });
    
    // Increment and Decrement Buttons
    html.find(".increment-button, .decrement-button").click((ev) => {
      const currentSheet = $(ev.currentTarget).closest('.fabulaultima-actor-sheet');
      if (currentSheet.length === 0) {
        console.error("Current sheet not found.");
        return;
      }
      const targetResource = $(ev.currentTarget).data("resource");
      const action = $(ev.currentTarget).data("action");
      const inputElement = currentSheet.find("#" + targetResource + "-input");
      let currentValue = parseInt(inputElement.val());
      if (isNaN(currentValue)) {
        currentValue = 0;
      }
      if (action === "increase") {
        currentValue += 1;
      } else if (action === "decrease") {
        currentValue = Math.max(currentValue - 1, 0);
      }
      inputElement.val(currentValue);
    });
    
    // Active Effect management
    html
      .find(".effect-control")
      .click((ev) => onManageActiveEffect(ev, this.actor));

    // Rollable abilities.
    html.find(".rollable").click(this._onRoll.bind(this));

    // html.find(".rollcheck").click((ev) => {
    //   ChatMessage.create({content: "<h3>Bloo</h3>"})
    // });

    // Roll Check Options
    html.find(".roll-check-option").click((ev) => {

    });

    // todo: Add Bond
    //html.find(".bond-create").click(ev);

    // todo: Delete Bond
    //html.find(".bond-delete").click((ev) => {});

    // Drag events for macros.
  if (this.actor.isOwner) {
    let handler = (ev) => this._onDragStart(ev);
    html.find("li.item").each((i, li) => {
      if (li.classList.contains("inventory-header")) return;
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Rolls a random behavior for the given actor and displays the result in a chat message.
   */
  _rollBehavior() {
    // Filter items in the actor's inventory to find behaviors
    const behaviors = this.actor.items.filter((item) => ["weapon", "shield", "armor", "accessory", "spell", "miscAbility", "behavior"].includes(item.type) && item.system.isBehavior?.value);

    // Prepare an array to map behaviors with their weights
    const behaviorMap = [];
    
    // Populate the behaviorMap based on behavior weights
    behaviors.forEach((behavior) => {
      const weight = behavior.system.weight.value;
      const nameVal = behavior.name;
      const descVal = behavior.system.description;
      const idVal = behavior.id;

      for (let i = 0; i < weight; i++) {
        behaviorMap.push({
          name: nameVal,
          desc: descVal,
          id: idVal,
        });
      }
    });

    // Check if there are behaviors to choose from
    if (behaviorMap.length === 0) {
      console.error("No behavior selected.");
      return;
    }

    // Randomly select a behavior from the behaviorMap
    const randVal = Math.floor(Math.random() * behaviorMap.length);
    const selected = behaviorMap[randVal];

    // Prepare an array for target priority
    const targetArray = [1, 2, 3, 4, 5];
    shuffleArray(targetArray); // Assuming shuffleArray is defined elsewhere

    // Prepare the content for the chat message
    const content = `<b>Enemy:</b> ${this.actor.name}<br /><b>Selected behavior:</b> ${selected.name}<br /><b>Target priority:</b> ${targetArray.join(" -> ")}`;

    // Check if the selected behavior's type is "item"
    if (selected.type === "item") {
      // Get the item from the actor's items by id
      const item = actor.items.get(selected.id);
      // Check if the item exists
      if (item) {
        // Return the result of item.roll()
        return item.roll();
      }
    }

    // Prepare chat data for displaying the message
    const chatData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      whisper: game.user._id,
      content,
    };

    // Create a chat message with the chat data
    ChatMessage.create(chatData);
    }


  /**
   * Performs a initiative check based and displays the result in a chat message.
   */
  _initCheck() {
    let content = "Testing Roll Initiative";
    //todo: roll initiative and display results

    // Prepare chat data for displaying the message
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get("core", "rollMode");
    const title = game.i18n.localize("FU.IsInitiative");
    const label = `
        <div class="flex-group-center" style="">
            <img style="border: 0px; -webkit-filter: drop-shadow(2px 2px 4px #000000); filter: drop-shadow(2px 2px 4px #000000); position: relative; margin-bottom: 0px;" />
            <p style="line-height: 1.2; color: Ivory; font-size: 24px; text-shadow: 2px 2px 4px #000000; box-shadow: 3px 6px darkslategrey; padding: 10px; border-style: solid; border-width: thin; border-color: #fbfced; ; border-radius: 12px; background-color: #3d6243;">${title}</p>
        </div>
    `;
      // Create a chat message.
      ChatMessage.create({
        speaker: speaker,
        rollMode: game.settings.get("core", "rollMode"),
        flavor: label,
        content,
        flags: {
        },
      });
    }

  /**
   * Performs a rollcheck based on selected primary/secondary selection displays the result in a chat message.
   */
  _rollCheck() {
    let content = "Testing Roll Check";
    //todo: roll primary/secondary selection and display results

    // Prepare chat data for displaying the message
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get("core", "rollMode");
    const title = game.i18n.localize("FU.RollCheck");
    const label = `
        <div class="flex-group-center" style="">
            <img style="border: 0px; -webkit-filter: drop-shadow(2px 2px 4px #000000); filter: drop-shadow(2px 2px 4px #000000); position: relative; margin-bottom: 0px;" />
            <p style="line-height: 1.2; color: Ivory; font-size: 24px; text-shadow: 2px 2px 4px #000000; box-shadow: 3px 6px darkslategrey; padding: 10px; border-style: solid; border-width: thin; border-color: #fbfced; ; border-radius: 12px; background-color: #3d6243;">${title}</p>
        </div>
    `;
      // Create a chat message.
      ChatMessage.create({
        speaker: speaker,
        rollMode: game.settings.get("core", "rollMode"),
        flavor: label,
        content,
        flags: {
        },
      });
    }

  /**
   * Handles clickable rolls based on different roll types.
   * @param {Event} event   The originating click event
   * @private
   */
    _onRoll(event) {
      event.preventDefault();
      const element = event.currentTarget;
      const dataset = element.dataset;
      console.log("Datatype=", dataset.rollType)
      // Handle item rolls.
      if (dataset.rollType) {
        if (dataset.rollType === "item") {
          const itemId = element.closest(".item").dataset.itemId;
          const item = this.actor.items.get(itemId);
          if (item) return item.roll();
        }
        if (dataset.rollType === "behavior") {
          return this._rollBehavior();
        }
        if (dataset.rollType === "rollcheck") {
          return this._rollCheck();
        }
        if (dataset.rollType === "rollinit") {
          return this._initCheck();
        }
      }
      // Handle item-slot rolls.
      if (dataset.rollType === "item-slot") {
        // Get the actor that owns the item
        const actor = this.actor;
        // Get the items that belong to the actor
        const items = actor.items;
        // Determine the slot based on the header element class
        let slot = "";
        if (element.classList.contains("left-hand")) {
          slot = "mainHand";
        } else if (element.classList.contains("right-hand")) {
          slot = "offHand";
        } else if (element.classList.contains("acc-hand")) {
          slot = "accessory";
        } else if (element.classList.contains("armor-hand")) {
          slot = "armor";
        } else {
          slot = "default";
        }
        // Filter the items by their equipped slot
        const sameSlotItems = items.filter(i => i.system.isEquipped && i.system.isEquipped.slot === slot);
        // Get the first item from the filtered collection
        const item = sameSlotItems.find(i => true);

        // Check if the item exists and call its roll method
        if (item) return item.roll();
      }
    
      // Handle rolls that supply the formula directly.
      if (dataset.roll) {
        const label = dataset.label ? `${dataset.label}` : "";
        const roll = new Roll(dataset.roll, this.actor.getRollData());
        roll.toMessage({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          flavor: label,
          rollMode: game.settings.get("core", "rollMode"),
        });
        return roll;
      }
    }
}
