/**
 * @description The keys for scoped flags commonly used by the system. They are stored and accessed by documents such as actors,
 * chat messages.
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
		CheckV2: 'CheckV2',
		GroupCheck: 'GroupCheck',
		GroupCheckV2: 'GroupCheckV2',
		GroupCheckConfig: 'GroupCheckConfig',
		SupportCheck: 'Supporter',
		PromptCheck: 'PromptCheck',
		GroupCheckSupporters: 'GroupCheckSupporters',
		Item: 'Item',
		Effect: 'Effect',
		Damage: 'Damage',
		Source: 'Source',
		ResourceGain: 'ResourceGain',
		ResourceLoss: 'ResourceLoss',
		Progress: 'Progress',
		UseMetaCurrency: 'UseMetaCurrency',
		Targets: 'Targets',
		RevertedAction: 'RevertedAction',
		Effects: 'Effects',
		Opportunity: 'Opportunity',
		Inventory: 'Inventory',
		Party: 'Party',
	}),
	Scope: 'projectfu',
	Toggle: Object.freeze({
		WeaponMagicCheck: 'weaponMagicCheck',
	}),
	Modifier: Object.freeze({
		ScaleIncomingDamage: 'scaleIncomingDamage',
	}),
});
