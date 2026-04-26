/**
 * @typedef FUFlag
 * @property {String} key
 * @property {Object} value
 * @remarks Flag data can be of any type, as long as it can be JSON.stringify'd. Flags can be used with almost all types of documents — not just Actors and Items, but nearly everything in Foundry. Settings are the only exception.
 */

import { systemId } from './system-utils.mjs';

/**
 * @description The keys for scoped flags commonly used by the system. They are stored and accessed by documents such as actors, chat messages.
 * @example Usage: actor.getFlag(Flags.Scope, Flags.CurrentTurn)
 * @example Attribute Key: `projectfu.weaponMagicCheck`, Change Mode: `Override`  Effect Value: `true`
 */
export const Flags = Object.freeze({
	CombatantsTurnStarted: 'CombatantsTurnStarted',
	CombatantsTurnTaken: 'CombatantsTurnTaken',
	CombatantId: 'CombatantId',
	CurrentTurn: 'CurrentTurn',
	FirstTurn: 'FirstTurn',
	Favorite: 'favorite',
	ActiveEffect: Object.freeze({
		Source: 'Source',
		Suppressed: 'Suppressed',
		Temporary: 'Temporary',
		Identifier: 'Identifier',
	}),
	ChatMessage: Object.freeze({
		CheckParams: 'CheckParams',
		Check: 'Check',
		GroupCheck: 'GroupCheck',
		OpposedCheck: 'OpposedCheck',
		GroupCheckV2: 'GroupCheckV2',
		GroupCheckConfig: 'GroupCheckConfig',
		SupportCheck: 'Supporter',
		PromptCheck: 'PromptCheck',
		GroupCheckSupporters: 'GroupCheckSupporters',
		Item: 'Item', // UUID
		Effect: 'Effect',
		Damage: 'Damage',
		Source: 'Source', // InlineSourceInfo
		ResourceGain: 'ResourceGain',
		ResourceLoss: 'ResourceLoss',
		Progress: 'Progress',
		Application: 'Application',
		UseMetaCurrency: 'UseMetaCurrency',
		Targets: 'Targets',
		RevertedAction: 'RevertedAction',
		Effects: 'Effects',
		Opportunity: 'Opportunity',
		FumbleFabula: 'FumbleFabula',
		Inventory: 'Inventory',
		Party: 'Party',
	}),
	Scope: 'projectfu',
	Toggle: Object.freeze({
		WeaponMagicCheck: 'weaponMagicCheck',
		ApexAttribute: 'apexAttribute',
		SpellProvider: 'spellProvider',
	}),
	State: Object.freeze({
		PreviousDance: 'previousDance',
	}),
	Modifier: Object.freeze({
		ScaleIncomingDamage: 'scaleIncomingDamage',
	}),
});

export const FlagUtility = Object.freeze({
	getEffectChange: (flag, value) => {
		return {
			key: `flags.${systemId}.${flag}`,
			mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
			value: value,
		};
	},
	hasSystemFlag: (document, flag) => {
		if (document.getFlag) {
			return document.getFlag(systemId, flag) !== undefined;
		}
		return false;
	},
});
