import { CHECK_FLAVOR, CHECK_RESULT } from './default-section-order.mjs';
import { FUActor } from '../documents/actors/actor.mjs';
import { TargetAction, Targeting } from '../helpers/targeting.mjs';
import { ResourcePipeline } from '../pipelines/resource-pipeline.mjs';
import { FU } from '../helpers/config.mjs';
import { Flags } from '../helpers/flags.mjs';
import { Pipeline } from '../pipelines/pipeline.mjs';
import { TokenUtils } from '../helpers/token-utils.mjs';
import { TextEditor } from '../helpers/text-editor.mjs';

/**
 * @param {CheckRenderData} sections
 * @param {string | Promise<string>} description
 * @param {string} summary
 * @param {number} [order]
 * @param {Boolean} open Defaults to true
 */
const description = (sections, description, summary, order, open = true) => {
	if (summary || description) {
		sections.push(async () => ({
			partial: 'systems/projectfu/templates/chat/partials/chat-item-description.hbs',
			data: {
				summary,
				//The open attribute needs to be present without a value to be considered true.
				open: open ? 'open' : '',
				description: typeof description === 'string' ? await TextEditor.enrichHTML(description) : await description,
			},
			order,
		}));
	}
};

/**
 * @param {CheckRenderData} sections
 * @param {string} text
 * @param {string} summary
 * @param {number} [order]
 * @param {Boolean} open Defaults to true
 */
const genericText = (sections, text, order) => {
	sections.push(async () => ({
		partial: 'systems/projectfu/templates/chat/partials/chat-generic-text.hbs',
		data: {
			text: await TextEditor.enrichHTML(text),
		},
		order,
	}));
};

/**
 * A description section with customizable title and without summary.
 * @param {CheckRenderData} sections
 * @param {string} title
 * @param {string} description
 * @param {number} [order]
 * @param {Boolean} open Defaults to true
 */
const collapsibleDescription = (sections, title, description, order, open = true) => {
	sections.push(async () => ({
		partial: 'systems/projectfu/templates/chat/partials/chat-collapsible-description.hbs',
		data: {
			title,
			//The open attribute needs to be present without a value to be considered true.
			open: open ? 'open' : '',
			description: await TextEditor.enrichHTML(description),
		},
		order,
	}));
};

/**
 * @param {CheckRenderData} sections
 * @param {ProgressDataModel} clock
 * @param {number} [order]
 */
const clock = (sections, clock, order) => {
	sections.push(async () => ({
		partial: 'systems/projectfu/templates/chat/partials/chat-clock-details.hbs',
		data: {
			data: clock,
			arr: clock.progressArray,
		},
		order: order,
	}));
};

/**
 * @typedef Tag
 * @property {string} [tag] gets localized
 * @property {any} [value] doesn't get localized
 * @property {string} [tooltip] tooltip to attach to the tag, gets localized
 * @property {boolean} [flip] switches the position of tag and value
 * @property {string} [separator] placed between tag and
 * @property {any} [show] can be omitted, if defined and falsy doesn't render tag
 */

/**
 * @param {CheckRenderData} sections
 * @param {Tag[]} tags
 * @param {number} [order]
 */
const tags = (sections, tags = [], order) => {
	tags = tags.filter((tag) => !('show' in tag) || tag.show);
	if (tags.length > 0) {
		sections.push(async () => ({
			partial: 'systems/projectfu/templates/chat/partials/chat-item-tags.hbs',
			data: {
				tags: tags,
			},
			order: order,
		}));
	}
};

/**
 * @param {CheckRenderData} sections
 * @param {Set<String>} traits
 * @param {number} [order]
 */
const traits = (sections, traits = [], order) => {
	const tags = [...traits].map((trait) => ({
		tag: `FU.${trait}`,
		separator: '',
		value: '',
		show: true,
	}));
	if (tags.length > 0) {
		sections.push(async () => ({
			partial: 'systems/projectfu/templates/chat/partials/chat-item-tags.hbs',
			data: {
				tags: tags,
			},
			order: order,
		}));
	}
};

/**
 * @param {CheckRenderData} sections
 * @param {string} quality
 * @param {number} [order]
 */
const quality = (sections, quality, order) => {
	if (quality) {
		sections.push({
			partial: 'systems/projectfu/templates/chat/partials/chat-item-quality.hbs',
			data: {
				quality,
			},
			order,
		});
	}
};

/**
 * @param {CheckRenderData} sections
 * @param {ProgressDataModel} resource
 * @param {number} [order]
 */
const resource = (sections, resource, order) => {
	sections.push(async () => ({
		partial: 'systems/projectfu/templates/chat/partials/chat-resource-details.hbs',
		data: {
			data: resource,
		},
		order: order,
	}));
};

/**
 * Sets chat message flavor by default. Specify order for other usecases.
 * @param {CheckRenderData} sections
 * @param {{name: string, img: string, id: string, uuid: string}} item
 * @param {number} [order]
 */
const itemFlavor = (sections, item, order = CHECK_FLAVOR) => {
	sections.push({
		order: order,
		partial: 'systems/projectfu/templates/chat/chat-check-flavor-item.hbs',
		data: {
			name: item.name,
			img: item.img,
			id: item.id,
			uuid: item.uuid,
		},
	});
};

/**
 * Sets chat message flavor by default. Specify order for other usecases.
 * @param {CheckRenderData} sections
 * @param {string} flavor
 * @param {number} [order]
 */
const genericFlavor = (sections, flavor, order = CHECK_FLAVOR) => {
	sections.push({
		order: order,
		partial: 'systems/projectfu/templates/chat/chat-check-flavor-check.hbs',
		data: {
			title: flavor,
		},
	});
};

/**
 * @param {CheckRenderData} sections
 * @param {string} opportunity
 * @param {number} [order]
 */
const opportunity = (sections, opportunity, order) => {
	if (opportunity) {
		sections.push({
			partial: 'systems/projectfu/templates/chat/partials/chat-item-opportunity.hbs',
			data: {
				opportunity: opportunity,
			},
			order: order,
		});
	}
};

/**
 * @description Adds a target section to the message that lists the targets and provides contextual buttons
 * @param {CheckRenderData} sections
 * @param {FUActor} actor
 * @param {FUItem} item
 * @param {TargetData[]} targets
 * @param {Object} flags
 * @param accuracyData
 * @param {TemplateDamageData} damageData
 */
const targeted = (sections, actor, item, targets, flags, accuracyData = undefined, damageData = undefined) => {
	const isTargeted = targets?.length > 0 || !Targeting.STRICT_TARGETING;
	if (isTargeted) {
		sections.push(async function () {
			let actions = [];
			actions.push(Targeting.defaultAction);
			let selectedActions = [];

			if (accuracyData && damageData) {
				Pipeline.toggleFlag(flags, Flags.ChatMessage.Damage);
				actions.push(
					new TargetAction('applyDamage', 'fa-heart-crack', 'FU.ChatApplyDamageTooltip', {
						accuracy: accuracyData,
						damage: damageData,
					}),
				);

				selectedActions.push(
					new TargetAction('applyDamageSelected', 'fa-heart-crack', 'FU.ChatApplyDamageTooltip', {
						accuracy: accuracyData,
						damage: damageData,
					}),
				);

				if (game.dice3d) {
					Hooks.once('diceSoNiceRollComplete', () => {
						for (const target of targets) {
							showFloatyText(target, target.result === 'hit' ? 'FU.Hit' : 'FU.Miss');
						}
					});
				} else {
					for (const target of targets) {
						showFloatyText(target, target.result === 'hit' ? 'FU.Hit' : 'FU.Miss');
					}
				}
			}

			let rule;
			if (item.system.targeting) {
				rule = item.system.targeting.rule ?? Targeting.rule.multiple;
				targets = await Targeting.filterTargetsByRule(actor, item, targets);
			} else {
				rule = targets?.length > 1 ? Targeting.rule.multiple : Targeting.rule.single;
			}

			Pipeline.toggleFlag(flags, Flags.ChatMessage.Targets);

			return {
				order: CHECK_RESULT,
				partial: 'systems/projectfu/templates/chat/partials/chat-targets.hbs',
				data: {
					name: item.name,
					actor: actor.uuid,
					item: item.uuid,
					rule: rule,
					targets: targets,
					actions: actions,
					selectedActions: selectedActions,
				},
			};
		});
	}
};

/**
 * @param {TargetData} targetData
 * @param {String} localizedText Text what will be localized by the system
 * @returns {Promise<void>}
 */
async function showFloatyText(targetData, localizedText) {
	const actor = await fromUuid(targetData.uuid);
	if (actor instanceof FUActor) {
		TokenUtils.showFloatyText(actor, game.i18n.localize(localizedText));
	}
}

/**
 * @param {CheckRenderData} sections
 * @param {FUActor} actor
 * @param {FUItem} item
 * @param {ActionCostDataModel} cost
 * @param {TargetData[]} targets
 * @param {Object} flags
 */
const spendResource = (sections, actor, item, cost, targets, flags) => {
	if (cost.amount === 0) {
		return;
	}
	const expense = ResourcePipeline.calculateExpense(cost, targets);
	if (expense.amount === 0) {
		return;
	}

	if (expense) {
		Pipeline.toggleFlag(flags, Flags.ChatMessage.ResourceLoss);
		sections.push({
			order: CHECK_RESULT,
			partial: 'systems/projectfu/templates/chat/partials/chat-item-spend-resource.hbs',
			data: {
				name: item.name,
				actor: actor.uuid,
				item: item.uuid,
				expense: expense,
				icon: FU.resourceIcons[expense.resource],
			},
		});
	}
};

export const CommonSections = {
	description,
	genericText,
	collapsibleDescription,
	clock,
	tags,
	traits,
	quality,
	resource,
	itemFlavor,
	genericFlavor,
	opportunity,
	targeted,
	spendResource,
};
