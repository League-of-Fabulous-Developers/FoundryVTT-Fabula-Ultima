/**
 * @type {ActiveEffectData[]}
 */
export const statusEffects = [
	{
		id: 'accelerated',
		name: 'FU.Accelerated',
		icon: 'systems/projectfu/styles/static/statuses/Accelerated.webp',
	},
	{
		id: 'aura',
		name: 'FU.Aura',
		icon: 'systems/projectfu/styles/static/statuses/Aura.webp',
		changes: [
			{
				key: 'system.derived.mdef.value',
				mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE,
				value: '12',
			},
		],
	},
	{
		id: 'barrier',
		name: 'FU.Barrier',
		icon: 'systems/projectfu/styles/static/statuses/Barrier.webp',
		changes: [
			{
				key: 'system.derived.def.value',
				mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE,
				value: '12',
			},
		],
	},
	{
		id: 'cover',
		name: 'FU.Cover',
		icon: 'systems/projectfu/styles/static/statuses/Cover.webp',
	},
	{
		id: 'dazed',
		name: 'FU.Dazed',
		icon: 'systems/projectfu/styles/static/statuses/Dazed.webp',
		changes: [
			{
				key: 'system.attributes.ins',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'downgrade',
			},
		],
	},
	{
		id: 'dex-down',
		name: 'FU.DEXDown',
		icon: 'systems/projectfu/styles/static/statuses/DexDown.webp',
		changes: [
			{
				key: 'system.attributes.dex',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'downgrade',
			},
		],
	},
	{
		id: 'dex-up',
		name: 'FU.DEXUp',
		icon: 'systems/projectfu/styles/static/statuses/DexUp.webp',
		changes: [
			{
				key: 'system.attributes.dex',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'upgrade',
			},
		],
	},
	{
		id: 'enraged',
		name: 'FU.Enraged',
		icon: 'systems/projectfu/styles/static/statuses/Enraged.webp',
		changes: [
			{
				key: 'system.attributes.ins',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'downgrade',
			},
			{
				key: 'system.attributes.dex',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'downgrade',
			},
		],
	},
	{
		id: 'flying',
		name: 'FU.Flying',
		icon: 'systems/projectfu/styles/static/statuses/Flying.webp',
	},
	{
		id: 'guard',
		name: 'FU.Guard',
		icon: 'systems/projectfu/styles/static/statuses/Guard.webp',
		changes: [
			{
				key: 'system.affinities.physical',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'upgrade',
			},

			{
				key: 'system.affinities.air',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'upgrade',
			},
			{
				key: 'system.affinities.bolt',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'upgrade',
			},
			{
				key: 'system.affinities.dark',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'upgrade',
			},
			{
				key: 'system.affinities.earth',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'upgrade',
			},
			{
				key: 'system.affinities.fire',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'upgrade',
			},
			{
				key: 'system.affinities.ice',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'upgrade',
			},
			{
				key: 'system.affinities.light',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'upgrade',
			},
			{
				key: 'system.affinities.poison',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'upgrade',
			},
		],
	},
	{
		id: 'ins-down',
		name: 'FU.INSDown',
		icon: 'systems/projectfu/styles/static/statuses/InsDown.webp',
		changes: [
			{
				key: 'system.attributes.ins',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'downgrade',
			},
		],
	},
	{
		id: 'ins-up',
		name: 'FU.INSUp',
		icon: 'systems/projectfu/styles/static/statuses/InsUp.webp',
		changes: [
			{
				key: 'system.attributes.ins',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'upgrade',
			},
		],
	},
	{
		id: 'ko',
		name: 'FU.KO',
		icon: 'systems/projectfu/styles/static/statuses/KO.webp',
	},
	{
		id: 'mig-down',
		name: 'FU.MIGDown',
		icon: 'systems/projectfu/styles/static/statuses/MigDown.webp',
		changes: [
			{
				key: 'system.attributes.mig',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'downgrade',
			},
		],
	},
	{
		id: 'mig-up',
		name: 'FU.MIGUp',
		icon: 'systems/projectfu/styles/static/statuses/MigUp.webp',
		changes: [
			{
				key: 'system.attributes.mig',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'upgrade',
			},
		],
	},
	{
		id: 'provoked',
		name: 'FU.Provoked',
		icon: 'systems/projectfu/styles/static/statuses/Provoked.webp',
	},
	{
		id: 'reflect',
		name: 'FU.Reflect',
		icon: 'systems/projectfu/styles/static/statuses/Reflect.webp',
	},
	{
		id: 'regen',
		name: 'FU.Regen',
		icon: 'systems/projectfu/styles/static/statuses/Regen.webp',
	},
	{
		id: 'shaken',
		name: 'FU.Shaken',
		icon: 'systems/projectfu/styles/static/statuses/Shaken.webp',
		changes: [
			{
				key: 'system.attributes.wlp',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'downgrade',
			},
		],
	},
	{
		id: 'sleep',
		name: 'FU.Sleep',
		icon: 'systems/projectfu/styles/static/statuses/Sleep.webp',
	},
	{
		id: 'slow',
		name: 'FU.Slow',
		icon: 'systems/projectfu/styles/static/statuses/Slow.webp',
		changes: [
			{
				key: 'system.attributes.dex',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'downgrade',
			},
		],
	},
	{
		id: 'poisoned',
		name: 'FU.Poisoned',
		icon: 'systems/projectfu/styles/static/statuses/Poisoned.webp',
		changes: [
			{
				key: 'system.attributes.mig',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'downgrade',
			},
			{
				key: 'system.attributes.wlp',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'downgrade',
			},
		],
	},
	{
		id: 'weak',
		name: 'FU.Weak',
		icon: 'systems/projectfu/styles/static/statuses/Weak.webp',
		changes: [
			{
				key: 'system.attributes.mig',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'downgrade',
			},
		],
	},
	{
		id: 'wlp-down',
		name: 'FU.WLPDown',
		icon: 'systems/projectfu/styles/static/statuses/WlpDown.webp',
		changes: [
			{
				key: 'system.attributes.wlp',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'downgrade',
			},
		],
	},
	{
		id: 'wlp-up',
		name: 'FU.WLPUp',
		icon: 'systems/projectfu/styles/static/statuses/WlpUp.webp',
		changes: [
			{
				key: 'system.attributes.wlp',
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
				value: 'upgrade',
			},
		],
	},
	{
		id: 'crisis',
		name: 'FU.Crisis',
		icon: 'systems/projectfu/styles/static/statuses/Crisis.webp',
	},
];
