import { Checks } from './checks.mjs';
import { FU } from '../helpers/config.mjs';
import { CheckConfiguration } from './check-configuration.mjs';
import { GroupCheck } from './group-check.mjs';
import FoundryUtils from '../helpers/foundry-utils.mjs';
import { StringUtils } from '../helpers/string-utils.mjs';
import { HTMLUtils } from '../helpers/html-utils.mjs';

/**
 * @typedef CheckConfig
 * @property {Attribute} primary
 * @property {Attribute} secondary
 * @property {number} modifier
 */

/**
 * @typedef {CheckConfig} AttributeCheckConfig
 * @property {number} difficulty
 * @property {String} title
 */

/**
 * @typedef {Omit<AttributeCheckConfig, 'difficulty'>} OpenCheckConfig
 */

/**
 * @typedef {Omit<AttributeCheckConfig, 'difficulty'>} OpposedCheckConfig
 */

/**
 * @typedef {AttributeCheckConfig & {supportDifficulty: number}} GroupCheckConfig
 */

/**
 * @typedef RecentChecks
 * @property {AttributeCheckConfig} attribute
 * @property {OpenCheckConfig} open
 * @property {GroupCheckConfig} group
 */

/**
 * @typedef CheckPromptOptions
 * @template T
 * @property {T} [initialConfig] The configuration for the specific check.
 * @property {CheckCallback} [checkCallback]
 * @property {CheckResultCallback} resultCallback
 * @property
 */

const KEY_RECENT_CHECKS = 'fabulaultima.recentChecks';

/**
 * @param {Actor} actor
 * @param {'attribute', 'open', 'group'} type
 * @returns {RecentChecks['attribute'] | RecentChecks['open'] |RecentChecks['group']}
 */
function retrieveRecentCheck(actor, type) {
	/** @type {Record<string, RecentChecks>} */
	const recentChecks = JSON.parse(sessionStorage.getItem(KEY_RECENT_CHECKS) || '{}');
	const actorChecks = recentChecks[actor.uuid] ?? {};
	return foundry.utils.mergeObject(initDefaults(type), actorChecks[type]);
}

/**
 * @param {'attribute', 'open', 'group'} type
 * @returns {RecentChecks['attribute'] | RecentChecks['open'] |RecentChecks['group']}
 */
function initDefaults(type) {
	/** @type AttributeCheckConfig */
	const defaults = {
		primary: 'dex',
		secondary: 'dex',
		difficulty: 10,
		modifier: 0,
	};
	if (type === 'open') {
		delete defaults.difficulty;
	}
	if (GroupCheck.isGroupCheck(type)) {
		defaults.supportDifficulty = 10;
	}

	return defaults;
}

/**
 * @param {Document} actor
 * @param {"attribute", "open", "group"}type
 * @param {AttributeCheckConfig, OpenCheckConfig, GroupCheckConfig}config
 */
function saveRecentCheck(actor, type, config) {
	/** @type {Record<string, RecentChecks>} */
	const recentChecks = JSON.parse(sessionStorage.getItem(KEY_RECENT_CHECKS) || '{}');
	const actorChecks = (recentChecks[actor.uuid] ??= {});

	actorChecks[type] = { ...initDefaults(type), ...config };

	sessionStorage.setItem(KEY_RECENT_CHECKS, JSON.stringify(recentChecks));
}

/**
 * @typedef RitualPotency
 * @property key
 * @property label
 * @property {Number} cost
 * @property {Number} difficulty
 */

/** @type RitualPotency[] **/
const potencyList = [
	{
		key: 'minor',
		label: FU.potency.minor,
		cost: 20,
		difficulty: 7,
		selected: true,
	},
	{
		key: 'medium',
		label: FU.potency.medium,
		cost: 30,
		difficulty: 10,
	},
	{
		key: 'major',
		label: FU.potency.major,
		cost: 40,
		difficulty: 13,
	},
	{
		key: 'extreme',
		label: FU.potency.extreme,
		cost: 50,
		difficulty: 16,
	},
];

/**
 * @typedef RitualArea
 * @property key
 * @property label
 * @property {Number} multiplier
 */

/** @type RitualArea[] **/
const areaList = [
	{
		key: 'individual',
		label: FU.area.individual,
		multiplier: 1,
		selected: true,
	},
	{
		key: 'small',
		label: FU.area.small,
		multiplier: 2,
	},
	{
		key: 'large',
		label: FU.area.large,
		multiplier: 3,
	},
	{
		key: 'huge',
		label: FU.area.huge,
		multiplier: 4,
	},
];

/**
 * @template T
 * @param {Document|FUActor} document
 * @param {CheckType} type
 * @param {T} initialConfig
 * @returns {Promise<AttributeCheckConfig>}
 */
async function promptForConfigurationV2(document, type, initialConfig = {}) {
	const recentCheck = retrieveRecentCheck(document, type);

	Object.keys(recentCheck).forEach((key) => {
		if (initialConfig[key] != null) {
			recentCheck[key] = initialConfig[key];
		}
	});

	const attributeValues = Object.entries(document.system.attributes).reduce(
		(previousValue, [attribute, { current }]) => ({
			...previousValue,
			[attribute]: current,
		}),
		{},
	);

	let context = {
		actor: document,
		type: type,
		typeLabel: StringUtils.localize(FU.checkTypes[type]),
		label: initialConfig.label,
		increment: initialConfig.increment !== undefined,
		attributes: FU.attributes,
		attributeValues: attributeValues,
		attributeAbbr: FU.attributeAbbreviations,
		attributeOptions: FoundryUtils.generateConfigIconOptions(Object.keys(FU.attributes), FU.attributes, FU.attributeIcons),
		attributeIcons: FU.attributeIcons,
		primary: recentCheck.primary,
		secondary: recentCheck.secondary,
		modifier: recentCheck.modifier,
		difficulty: recentCheck.difficulty,
		supportDifficulty: recentCheck.supportDifficulty,
		bonus: document.system?.bonuses?.accuracy?.all ?? 0,
	};

	switch (type) {
		case 'open': {
			context.bonus += document.system.bonuses.accuracy.openCheck;
			break;
		}
		case 'opposed': {
			context.bonus += document.system.bonuses.accuracy.opposedCheck;
			break;
		}
		case 'ritual':
			{
				const potency = potencyList[0];
				const area = areaList[0];
				context = Object.assign(context, {
					potency: potency,
					area: area,
					cost: potency.cost * area.multiplier,
					potencyList: potencyList,
					areaList: areaList,
				});
			}
			break;
	}

	const title = initialConfig.title ?? FU.checkTypes[type];
	const result = await foundry.applications.api.DialogV2.input({
		window: {
			title: game.i18n.localize(title),
			icon: 'fa-solid fa-dice',
		},
		classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
		actions: {
			setDifficulty: onSetDifficulty,
			updateRitual: onUpdateRitual,
		},
		content: await FoundryUtils.renderTemplate('dialog/dialog-check-prompt-unified', context),
		rejectClose: false,
		ok: {
			icon: FU.allIcon.roll,
			label: game.i18n.localize('FU.Submit'),
		},
		/** @param {Event} event
		 *  @param {HTMLElement} dialog **/
		render: (event, dialog) => {
			HTMLUtils.initializeIconRadioGroups(dialog.element, context);
		},
	});
	if (result) {
		saveRecentCheck(document, type, result);
		return result;
	}
	return null;
}

/**
 * @param {PointerEvent} event   The originating click event
 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
 * @returns {Promise<void>}
 */
async function onSetDifficulty(event, target) {
	const input = target.closest('fieldset').querySelector("input[name='difficulty']");
	if (!input) return;
	input.value = target.dataset.value ?? '';
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * @param {PointerEvent} event   The originating click event
 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
 * @returns {Promise<void>}
 */
async function onUpdateRitual(event, target) {
	const form = target.closest('form') ?? this.element;

	// Selected radios
	const potencyKey = form.querySelector('input[name="potency"]:checked')?.value ?? null;
	const areaKey = form.querySelector('input[name="area"]:checked')?.value ?? null;

	const potency = potencyList.find((potency) => potency.key === potencyKey);
	const area = areaList.find((area) => area.key === areaKey);
	const cost = potency.cost * area.multiplier;

	// Update hidden difficulty input
	const diffInput = form.querySelector('input[name="difficulty"]');
	if (diffInput) diffInput.value = potency.difficulty;

	const costInput = form.querySelector('input[name="cost"]');
	if (costInput) costInput.value = cost;

	const costEl = form.querySelector('#ritual-cost');
	if (costEl) {
		costEl.textContent = cost.toString();
	}
}

/**
 * @param {FUActor} actor
 * @param {CheckPromptOptions<AttributeCheckConfig>} [options]
 * @returns {Promise<void>}
 */
async function attributeCheck(actor, options = {}) {
	const promptResult = await promptForConfigurationV2(actor, 'attribute', options.initialConfig);
	if (promptResult) {
		return Checks.attributeCheck(
			actor,
			{
				primary: promptResult.primary,
				secondary: promptResult.secondary,
			},
			null,
			(check, callbackActor, item) => {
				const checkConfigurer = CheckConfiguration.configure(check);
				if (promptResult.difficulty) {
					checkConfigurer.setDifficulty(promptResult.difficulty);
				}
				if (promptResult.modifier) {
					checkConfigurer.addModifier('FU.CheckSituationalModifier', promptResult.modifier);
				}
				if (options.checkCallback) {
					options.checkCallback(check, callbackActor, item);
				}
			},
		);
	}
}

/**
 * @param {FUActor} actor
 * @param {CheckPromptOptions<OpenCheckConfig>} [options]
 * @returns {Promise<void>}
 */
async function openCheck(actor, options = {}) {
	const promptResult = await promptForConfigurationV2(actor, 'open', options.initialConfig);
	if (promptResult) {
		return Checks.openCheck(
			actor,
			{
				primary: promptResult.primary,
				secondary: promptResult.secondary,
			},
			(check, callbackActor, item) => {
				const checkConfigurer = CheckConfiguration.configure(check);
				if (promptResult.modifier) {
					checkConfigurer.addModifier('FU.CheckSituationalModifier', promptResult.modifier);
				}

				if (options.checkCallback) {
					options.checkCallback(check, callbackActor, item);
				}
			},
		);
	}
}

/**
 * @param {FUActor} actor
 * @param {OpposedCheckData} data
 * @param {CheckPromptOptions<OpposedCheckConfig>} [options]
 * @returns {Promise<void>}
 */
async function opposedCheck(actor, data = {}, options = {}) {
	const promptResult = await promptForConfigurationV2(actor, 'opposed', options.initialConfig);
	if (promptResult) {
		return Checks.opposedCheckV2(
			actor,
			{
				primary: promptResult.primary,
				secondary: promptResult.secondary,
			},
			data,
			(check, callbackActor, item) => {
				const config = CheckConfiguration.configure(check);
				if (promptResult.modifier) {
					config.addModifier('FU.CheckSituationalModifier', promptResult.modifier);
				}
				if (data.initialCheck) {
					config.setInitialCheck(data.initialCheck);
				}
				if (options.checkCallback) {
					options.checkCallback(check, callbackActor, item);
				}
			},
		);
	}
}

/**
 * @param {FUActor} actor
 * @param {CheckPromptOptions<GroupCheckConfig>} [options]
 * @returns {Promise<void>}
 */
async function groupCheck(actor, options = {}) {
	const promptResult = await promptForConfigurationV2(actor, 'group', options.initialConfig);
	if (promptResult) {
		return Checks.groupCheck(actor, (check, callbackActor, item) => {
			const checkConfigurer = CheckConfiguration.configure(check);
			checkConfigurer.setAttributes(promptResult.primary, promptResult.secondary);
			if (promptResult.difficulty) {
				checkConfigurer.setDifficulty(promptResult.difficulty);
			}
			if (promptResult.modifier) {
				checkConfigurer.addModifier('FU.CheckSituationalModifier', promptResult.modifier);
			}
			GroupCheck.setSupportCheckDifficulty(check, promptResult.supportDifficulty);

			if (options.checkCallback) {
				options.checkCallback(check, callbackActor, item);
			}
		});
	}
}

/**
 * @typedef PromptCheckData
 * @property actorId
 * @property itemId
 * @property primary
 * @property secondary
 */

/**
 * @param {FUActor} actor
 * @param {FUItem} item
 * @param {CheckPromptOptions<GroupCheckConfig>} [options]
 * @returns {Promise<void>}
 */
async function ritualCheck(actor, item, options = {}) {
	const promptResult = await promptForConfigurationV2(actor, 'ritual', options);
	if (promptResult) {
		return Checks.ritualCheck(actor, item, (check, callbackActor, item) => {
			const config = CheckConfiguration.configure(check);
			config.setAttributes(promptResult.primary, promptResult.secondary);
			if (promptResult.difficulty) {
				config.setDifficulty(promptResult.difficulty);
			}
			if (promptResult.modifier) {
				config.addModifier('FU.CheckSituationalModifier', promptResult.modifier);
			}
			config.setExpense('mp', promptResult.cost);
			GroupCheck.setSupportCheckDifficulty(check, promptResult.supportDifficulty);

			if (options.checkCallback) {
				options.checkCallback(check, callbackActor, item);
			}
		});
	}
}

/**
 * @description Initialize the pipeline's hooks
 */
function initialize() {}

export const CheckPrompt = Object.freeze({
	attributeCheck,
	openCheck,
	groupCheck,
	opposedCheck,
	ritualCheck,
	promptForConfigurationV2,
	initialize,
});
