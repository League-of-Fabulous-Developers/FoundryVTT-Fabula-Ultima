import { FU } from '../../helpers/config.mjs';

/**
 * @type {ActiveEffectData[]}
 */
export const statusEffects = [
	{
		id: 'accelerated',
		name: 'FU.Accelerated',
		img: 'systems/projectfu/styles/static/statuses/Accelerated.webp',
		system: {
			duration: {
				event: 'endOfScene',
			},
		},
	},
	{
		id: 'aura',
		name: 'FU.Aura',
		img: 'systems/projectfu/styles/static/statuses/Aura.webp',
		changes: [
			{
				key: 'system.derived.mdef.value',
				type: 'upgrade',
				value: '12',
			},
		],
		system: {
			duration: {
				event: 'endOfScene',
			},
		},
	},
	{
		id: 'barrier',
		name: 'FU.Barrier',
		img: 'systems/projectfu/styles/static/statuses/Barrier.webp',
		changes: [
			{
				key: 'system.derived.def.value',
				type: 'upgrade',
				value: '12',
			},
		],
		system: {
			duration: {
				event: 'endOfScene',
			},
		},
	},
	{
		id: 'cover',
		name: 'FU.Cover',
		img: 'systems/projectfu/styles/static/statuses/Cover.webp',
		system: {
			duration: {
				event: 'startOfTurn',
				tracking: 'source',
				interval: 1,
			},
		},
	},
	{
		id: 'dazed',
		name: 'FU.Dazed',
		img: 'systems/projectfu/styles/static/statuses/Dazed.webp',
		changes: [
			{
				key: 'system.attributes.ins',
				type: FU.changeTypes.apply,
				value: 'downgrade',
			},
		],
		system: {
			duration: {
				event: 'rest',
			},
		},
	},
	{
		id: 'dex-down',
		name: 'FU.DEXDown',
		img: 'systems/projectfu/styles/static/statuses/DexDown.webp',
		changes: [
			{
				key: 'system.attributes.dex',
				type: FU.changeTypes.apply,
				value: 'downgrade',
			},
		],
		system: {
			duration: {
				event: 'endOfScene',
			},
		},
	},
	{
		id: 'dex-up',
		name: 'FU.DEXUp',
		img: 'systems/projectfu/styles/static/statuses/DexUp.webp',
		changes: [
			{
				key: 'system.attributes.dex',
				type: FU.changeTypes.apply,
				value: 'upgrade',
			},
		],
		system: {
			duration: {
				event: 'endOfScene',
			},
		},
	},
	{
		id: 'enraged',
		name: 'FU.Enraged',
		img: 'systems/projectfu/styles/static/statuses/Enraged.webp',
		changes: [
			{
				key: 'system.attributes.ins',
				type: FU.changeTypes.apply,
				value: 'downgrade',
			},
			{
				key: 'system.attributes.dex',
				type: FU.changeTypes.apply,
				value: 'downgrade',
			},
		],
		system: {
			duration: {
				event: 'rest',
			},
		},
	},
	{
		id: 'flying',
		name: 'FU.Flying',
		img: 'systems/projectfu/styles/static/statuses/Flying.webp',
		system: {
			duration: {
				event: 'endOfScene',
			},
		},
	},
	{
		id: 'guard',
		name: 'FU.Guard',
		system: {
			duration: {
				event: 'startOfTurn',
				interval: 1,
			},
		},
		img: 'systems/projectfu/styles/static/statuses/Guard.webp',
		changes: [
			{
				key: 'system.affinities.physical',
				type: FU.changeTypes.apply,
				value: 'upgrade',
			},

			{
				key: 'system.affinities.air',
				type: FU.changeTypes.apply,
				value: 'upgrade',
			},
			{
				key: 'system.affinities.bolt',
				type: FU.changeTypes.apply,
				value: 'upgrade',
			},
			{
				key: 'system.affinities.dark',
				type: FU.changeTypes.apply,
				value: 'upgrade',
			},
			{
				key: 'system.affinities.earth',
				type: FU.changeTypes.apply,
				value: 'upgrade',
			},
			{
				key: 'system.affinities.fire',
				type: FU.changeTypes.apply,
				value: 'upgrade',
			},
			{
				key: 'system.affinities.ice',
				type: FU.changeTypes.apply,
				value: 'upgrade',
			},
			{
				key: 'system.affinities.light',
				type: FU.changeTypes.apply,
				value: 'upgrade',
			},
			{
				key: 'system.affinities.poison',
				type: FU.changeTypes.apply,
				value: 'upgrade',
			},
			{
				key: 'system.bonuses.accuracy.opposedCheck',
				type: 'add',
				value: '2',
			},
		],
	},
	{
		id: 'ins-down',
		name: 'FU.INSDown',
		img: 'systems/projectfu/styles/static/statuses/InsDown.webp',
		changes: [
			{
				key: 'system.attributes.ins',
				type: FU.changeTypes.apply,
				value: 'downgrade',
			},
		],
		system: {
			duration: {
				event: 'endOfScene',
			},
		},
	},
	{
		id: 'ins-up',
		name: 'FU.INSUp',
		img: 'systems/projectfu/styles/static/statuses/InsUp.webp',
		changes: [
			{
				key: 'system.attributes.ins',
				type: FU.changeTypes.apply,
				value: 'upgrade',
			},
		],
		system: {
			duration: {
				event: 'endOfScene',
			},
		},
	},
	{
		id: 'ko',
		name: 'FU.KO',
		img: 'systems/projectfu/styles/static/statuses/KO.webp',
	},
	{
		id: 'mig-down',
		name: 'FU.MIGDown',
		img: 'systems/projectfu/styles/static/statuses/MigDown.webp',
		changes: [
			{
				key: 'system.attributes.mig',
				type: FU.changeTypes.apply,
				value: 'downgrade',
			},
		],
		system: {
			duration: {
				event: 'endOfScene',
			},
		},
	},
	{
		id: 'mig-up',
		name: 'FU.MIGUp',
		img: 'systems/projectfu/styles/static/statuses/MigUp.webp',
		changes: [
			{
				key: 'system.attributes.mig',
				type: FU.changeTypes.apply,
				value: 'upgrade',
			},
		],
		system: {
			duration: {
				event: 'endOfScene',
			},
		},
	},
	{
		id: 'provoked',
		name: 'FU.Provoked',
		img: 'systems/projectfu/styles/static/statuses/Provoked.webp',
		system: {
			duration: {
				event: 'endOfScene',
			},
		},
	},
	{
		id: 'reflect',
		name: 'FU.Reflect',
		img: 'systems/projectfu/styles/static/statuses/Reflect.webp',
		system: {
			duration: {
				event: 'endOfScene',
			},
		},
	},
	{
		id: 'regen',
		name: 'FU.Regen',
		img: 'systems/projectfu/styles/static/statuses/Regen.webp',
		system: {
			duration: {
				event: 'endOfScene',
			},
		},
	},
	{
		id: 'shaken',
		name: 'FU.Shaken',
		img: 'systems/projectfu/styles/static/statuses/Shaken.webp',
		changes: [
			{
				key: 'system.attributes.wlp',
				type: FU.changeTypes.apply,
				value: 'downgrade',
			},
		],
		system: {
			duration: {
				event: 'rest',
			},
		},
	},
	{
		id: 'sleep',
		name: 'FU.Sleep',
		img: 'systems/projectfu/styles/static/statuses/Sleep.webp',
		system: {
			duration: {
				event: 'endOfScene',
			},
		},
	},
	{
		id: 'slow',
		name: 'FU.Slow',
		img: 'systems/projectfu/styles/static/statuses/Slow.webp',
		changes: [
			{
				key: 'system.attributes.dex',
				type: FU.changeTypes.apply,
				value: 'downgrade',
			},
		],
		system: {
			duration: {
				event: 'rest',
			},
		},
	},
	{
		id: 'poisoned',
		name: 'FU.Poisoned',
		img: 'systems/projectfu/styles/static/statuses/Poisoned.webp',
		changes: [
			{
				key: 'system.attributes.mig',
				type: FU.changeTypes.apply,
				value: 'downgrade',
			},
			{
				key: 'system.attributes.wlp',
				type: FU.changeTypes.apply,
				value: 'downgrade',
			},
		],
		system: {
			duration: {
				event: 'rest',
			},
		},
	},
	{
		id: 'weak',
		name: 'FU.Weak',
		img: 'systems/projectfu/styles/static/statuses/Weak.webp',
		changes: [
			{
				key: 'system.attributes.mig',
				type: FU.changeTypes.apply,
				value: 'downgrade',
			},
		],
		system: {
			duration: {
				event: 'rest',
			},
		},
	},
	{
		id: 'wlp-down',
		name: 'FU.WLPDown',
		img: 'systems/projectfu/styles/static/statuses/WlpDown.webp',
		changes: [
			{
				key: 'system.attributes.wlp',
				type: FU.changeTypes.apply,
				value: 'downgrade',
			},
		],
		system: {
			duration: {
				event: 'endOfScene',
			},
		},
	},
	{
		id: 'wlp-up',
		name: 'FU.WLPUp',
		img: 'systems/projectfu/styles/static/statuses/WlpUp.webp',
		changes: [
			{
				key: 'system.attributes.wlp',
				type: FU.changeTypes.apply,
				value: 'upgrade',
			},
		],
		system: {
			duration: {
				event: 'endOfScene',
			},
		},
	},
	{
		id: 'crisis',
		name: 'FU.Crisis',
		img: 'systems/projectfu/styles/static/statuses/Crisis.webp',
	},
	{
		id: 'focus',
		name: 'FU.Focus',
		img: 'systems/projectfu/styles/static/statuses/Focus.png',
		system: {
			duration: {
				event: 'startOfTurn',
				tracking: 'source',
				interval: 1,
			},
		},
	},
	{
		id: 'pressure',
		name: 'FU.Pressure',
		img: 'systems/projectfu/styles/static/statuses/Pressure.png',
		system: {
			duration: {
				event: 'endOfScene',
			},
			rules: {
				progress: {
					name: 'FU.PressureClock',
					id: 'pressure',
					enabled: true,
					style: 'clock',
				},
			},
		},
	},
	{
		id: 'stagger',
		name: 'FU.Stagger',
		img: 'systems/projectfu/styles/static/statuses/Stagger.webp',
		changes: [
			{
				key: 'system.bonuses.turns',
				type: 'add',
				value: '0',
			},
		],
		system: {
			duration: {
				event: 'endOfRound',
			},
		},
	},
];
