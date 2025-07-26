import { Checks } from './checks.mjs';
import { FU } from '../helpers/config.mjs';
import { CheckConfiguration } from './check-configuration.mjs';
import { GroupCheck } from './group-check.mjs';

/**
 * @typedef AttributeCheckConfig
 * @property {Attribute} primary
 * @property {Attribute} secondary
 * @property {number} difficulty
 * @property {number} modifier
 */

/**
 * @typedef {Omit<AttributeCheckConfig, 'difficulty'>} OpenCheckConfig
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
 * @property {T} [initialConfig]
 * @property {CheckCallback} [checkCallback]
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
	if (type === 'group') {
		defaults.supportDifficulty = 10;
	}

	return defaults;
}

/**
 * @param {Actor} actor
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
 * @template T
 * @param {Actor} actor
 * @param {"attribute", "open", "group"} type
 * @param {T} initialConfig
 * @returns {Promise<AttributeCheckConfig | OpenCheckConfig | GroupCheckConfig>}
 */
async function promptForConfiguration(actor, type, initialConfig = {}) {
	const recentCheck = retrieveRecentCheck(actor, type);

	Object.keys(recentCheck).forEach((key) => {
		if (initialConfig[key] != null) {
			recentCheck[key] = initialConfig[key];
		}
	});

	const attributes = actor.system.attributes;

	const attributeValues = Object.entries(attributes).reduce(
		(previousValue, [attribute, { current }]) => ({
			...previousValue,
			[attribute]: current,
		}),
		{},
	);

	const result = await foundry.applications.api.DialogV2.input({
		window: { title: game.i18n.localize('FU.DialogCheckTitle') },
		classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
		content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/dialog/dialog-check-prompt-unified.hbs', {
			type: type,
			attributes: FU.attributes,
			attributeAbbr: FU.attributeAbbreviations,
			attributeValues: attributeValues,
			primary: recentCheck.primary,
			secondary: recentCheck.secondary,
			modifier: recentCheck.modifier,
			difficulty: recentCheck.difficulty,
			supportDifficulty: recentCheck.supportDifficulty,
			bonus: actor.system.bonuses.accuracy.openCheck,
		}),
		rejectClose: false,
		ok: {
			icon: 'fas fa-dice',
			label: game.i18n.localize('FU.DialogCheckRoll'),
		},
	});
	if (result) {
		saveRecentCheck(actor, type, result);
		return result;
	}
	return null;
}

/**
 * @param {Actor} actor
 * @param {CheckPromptOptions<AttributeCheckConfig>} [options]
 * @returns {Promise<void>}
 */
async function attributeCheck(actor, options = {}) {
	const promptResult = await promptForConfiguration(actor, 'attribute', options.initialConfig);
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
 * @param {Actor} actor
 * @param {CheckPromptOptions<OpenCheckConfig>} [options]
 * @returns {Promise<void>}
 */
async function openCheck(actor, options = {}) {
	const promptResult = await promptForConfiguration(actor, 'open', options.initialConfig);
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
 * @param {Actor} actor
 * @param {CheckPromptOptions<GroupCheckConfig>} [options]
 * @returns {Promise<void>}
 */
async function groupCheck(actor, options = {}) {
	const promptResult = await promptForConfiguration(actor, 'group', options.initialConfig);
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

export const CheckPrompt = Object.freeze({
	attributeCheck,
	openCheck,
	groupCheck,
});
