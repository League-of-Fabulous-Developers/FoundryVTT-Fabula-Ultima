import { FUActor } from '../documents/actors/actor.mjs';

/**
 * Manage Active Effect instances through the Actor Sheet via effect control buttons.
 * @param {MouseEvent} event      The left-click event on the effect control
 * @param {Actor|Item} owner      The owning document which manages this effect
 */
export function onManageActiveEffect(event, owner) {
	event.preventDefault();
	const a = event.currentTarget;
	const li = a.closest('li');
	const effectId = li.dataset.effectId;
	let effect;
	if (owner instanceof FUActor) {
		if (game.release.isNewer(11)) {
			effect = Array.from(owner.allApplicableEffects()).find((value) => value.id === effectId);
		} else {
			effect = owner.effects.find((value) => value.id === effectId);
		}
	} else {
		effect = owner.effects.get(effectId);
	}
	switch (a.dataset.action) {
		case 'create':
			return owner.createEmbeddedDocuments('ActiveEffect', [
				{
					label: 'New Effect',
					icon: 'icons/svg/aura.svg',
					origin: owner.uuid,
					'duration.rounds': li.dataset.effectType === 'temporary' ? 1 : undefined,
					disabled: li.dataset.effectType === 'inactive',
				},
			]);
		case 'edit':
			return effect.sheet.render(true);
		case 'delete':
			return effect.delete();
		case 'toggle':
			return effect.update({ disabled: !effect.disabled });
	}
}

/**
 * Prepare the data structure for Active Effects which are currently applied to an Actor or Item.
 * @param {ActiveEffect[]} effects    The array of Active Effect instances to prepare sheet data for
 * @return {object}                   Data for rendering
 */
export function prepareActiveEffectCategories(effects) {
	// Define effect header categories
	const categories = {
		temporary: {
			type: 'temporary',
			label: 'Temporary Effects',
			effects: [],
		},
		passive: {
			type: 'passive',
			label: 'Passive Effects',
			effects: [],
		},
		inactive: {
			type: 'inactive',
			label: 'Inactive Effects',
			effects: [],
		},
	};

	// Iterate over active effects, classifying them into categories
	for (let e of effects) {
		if (e.disabled) categories.inactive.effects.push(e);
		else if (e.isTemporary) categories.temporary.effects.push(e);
		else categories.passive.effects.push(e);
	}
	return categories;
}

/**
 * A helper function to toggle a status effect on an Actor.
 * Designed based off TokenDocument#toggleActiveEffect to properly interact with token hud.
 * @param {string} statusEffectId 								 The status effect id based on CONFIG.statusEffects
 * @returns {Promise<boolean>}                                   Whether the ActiveEffect is now on or off
 */
export async function toggleStatusEffect(actor, statusEffectId) {
	const existing = actor.effects.reduce((arr, e) => {
		if (isActiveEffectForStatusEffectId(e, statusEffectId)) arr.push(e.id);
		return arr;
	}, []);
	if (existing.length > 0) {
		await actor.deleteEmbeddedDocuments('ActiveEffect', existing);
		return false;
	} else {
		const statusEffect = CONFIG.statusEffects.find((e) => e.id === statusEffectId);
		const cls = getDocumentClass('ActiveEffect');
		const createData = foundry.utils.deepClone(statusEffect);
		createData.statuses = [statusEffect.id];
		delete createData.id;
		cls.migrateDataSafe(createData);
		cls.cleanData(createData);
		createData.name = game.i18n.localize(statusEffect.name);
		delete createData.id;
		await cls.create(createData, { parent: actor });
		return true;
	}
}

export function isActiveEffectForStatusEffectId(effect, statusEffectId) {
	return effect.statuses.size == 1 && effect.statuses.has(statusEffectId);
}
