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
			label: game.i18n.localize('FU.TemporaryEffects'),
			effects: [],
		},
		passive: {
			type: 'passive',
			label: game.i18n.localize('FU.PassiveEffects'),
			effects: [],
		},
		inactive: {
			type: 'inactive',
			label: game.i18n.localize('FU.InactiveEffects'),
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
		if (isActiveEffectForStatusEffectId(e, statusEffectId)) arr.push(e);
		return arr;
	}, []);
	if (existing.length > 0) {
		await Promise.all(existing.map((e) => e.delete()));
		return false;
	} else {
		const statusEffect = CONFIG.statusEffects.find((e) => e.statuses.includes(statusEffectId));
		if (statusEffect) {
			await ActiveEffect.create(statusEffect, { parent: actor });
		}
		return true;
	}
}

export function isActiveEffectForStatusEffectId(effect, statusEffectId) {
	return effect.statuses.size === 1 && effect.statuses.has(statusEffectId);
}
