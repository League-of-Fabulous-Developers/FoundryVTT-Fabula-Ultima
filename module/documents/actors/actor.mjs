import { FUItem } from '../items/item.mjs';

/**
 * Extend the base Actor document by defining a custom roll data structure
 * @extends {Actor}
 */
export class FUActor extends Actor {
	/** @override */
	prepareData() {
		// Prepare data for the actor. Calling the super version of this executes
		// the following, in order: data reset (to clear active effects),
		// prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
		// prepareDerivedData().
		super.prepareData();
		Hooks.callAll('projectfu.actor.dataPrepared', this);
	}

	async getData(options = {}) {
		const data = await super.getData(options);

		// Add the spTracker data to the actor's data
		data.spTracker = this.spTracker;

		//Add the tlTracker data to the actor's data
		data.tlTracker = this.tlTracker;

		return data;
	}

	/** @override */
	prepareBaseData() {
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
	prepareDerivedData() {
		this.items.forEach((item) => item.applyActiveEffects());
	}

	get tlTracker() {
		return this.system.tlTracker;
	}

	get spTracker() {
		return this.system.spTracker;
	}

	/**
	 * Override getRollData() that's supplied to rolls.
	 */
	getRollData() {
		const data = super.getRollData();

		// Prepare character roll data.
		this._getCharacterRollData(data);
		this._getNpcRollData(data);

		return data;
	}

	/**
	 * Prepare character roll data.
	 */
	_getCharacterRollData() {
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
	_getNpcRollData() {
		// Process additional NPC data here.
	}

	async _preCreate(createData, options, user) {
		await super._preCreate(createData, options, user);

		if (this.type === 'character') {
			this.updateSource({
				prototypeToken: {
					actorLink: true,
					disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
				},
			});
		}
	}

	async _preUpdate(changed, options, user) {
		const changedHP = changed.system?.resources?.hp;
		const currentHP = this.system.resources.hp;

		if (typeof changedHP?.value === 'number' && currentHP) {
			const hpChange = changedHP.value - currentHP.value;
			const levelChanged = !!changed.system && 'level' in changed.system;
			if (hpChange !== 0 && !levelChanged) {
				options.damageTaken = hpChange * -1;
			}
		}

		await super._preUpdate(changed, options, user);
	}

	async _onUpdate(changed, options, userId) {
		if (options.damageTaken) {
			this.showFloatyText(options.damageTaken);
		}

		const { hp } = this.system?.resources || {};

		if (hp && userId === game.userId) {
			const crisisThreshold = Math.floor(hp.max / 2);
			const shouldBeInCrisis = hp.value <= crisisThreshold;
			const isInCrisis = this.statuses.has('crisis');

			if (shouldBeInCrisis && !isInCrisis) {
				await ActiveEffect.create(
					{
						...CONFIG.statusEffects.find((val) => val.id === 'crisis'),
						origin: this.uuid,
					},
					{ parent: this },
				);
			} else if (!shouldBeInCrisis && isInCrisis) {
				this.effects.filter((effect) => effect.statuses.has('crisis')).forEach((val) => val.delete());
			}
		}
		super._onUpdate(changed, options, userId);
	}

	async showFloatyText(input) {
		if (!canvas.scene) {
			return;
		}

		const [token] = this.getActiveTokens();

		if (token && typeof input === 'number') {
			const gridSize = canvas.scene.grid.size;
			const scrollingTextArgs = [
				{ x: token.x + gridSize / 2, y: token.y + gridSize - 20 },
				Math.abs(input),
				{
					fill: input < 0 ? 'lightgreen' : 'white',
					fontSize: 32,
					stroke: 0x000000,
					strokeThickness: 4,
				},
			];
			await token._animation;
			await canvas.interface?.createScrollingText(...scrollingTextArgs);
		} else {
			const gridSize = canvas.scene.grid.size;
			const scrollingTextArgs = [
				{ x: token.x + gridSize / 2, y: token.y + gridSize - 20 },
				input,
				{
					fill: 'white',
					fontSize: 32,
					stroke: 0x000000,
					strokeThickness: 4,
				},
			];
			await token._animation;
			await canvas.interface?.createScrollingText(...scrollingTextArgs);
		}
	}

	*allApplicableEffects() {
		for (const effect of super.allApplicableEffects()) {
			if (effect.parent instanceof FUItem && effect.parent.system.transferEffects instanceof Function) {
				if (!effect.parent.system.transferEffects()) {
					continue;
				}
			}
			yield effect;
		}
	}

	applyActiveEffects() {
		if (this.system.prepareEmbeddedData instanceof Function) {
			this.system.prepareEmbeddedData();
		}
		return super.applyActiveEffects();
	}
}
