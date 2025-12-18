import { CHECK_FLAVOR, CHECK_RESULT, CHECK_ROLL } from './default-section-order.mjs';
import { FUActor } from '../documents/actors/actor.mjs';
import { Targeting } from '../helpers/targeting.mjs';
import { ResourcePipeline, ResourceRequest } from '../pipelines/resource-pipeline.mjs';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { Flags } from '../helpers/flags.mjs';
import { Pipeline } from '../pipelines/pipeline.mjs';
import { TokenUtils } from '../helpers/token-utils.mjs';
import { TextEditor } from '../helpers/text-editor.mjs';
import { InlineHelper, InlineSourceInfo } from '../helpers/inline-helper.mjs';
import { SETTINGS } from '../settings.js';
import { CommonEvents } from './common-events.mjs';
import { DamagePipeline } from '../pipelines/damage-pipeline.mjs';
import { ExpressionContext, Expressions } from '../expressions/expressions.mjs';

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
 * @param {string, Promise<string>} text
 * @param {number} [order]
 */
const genericText = (sections, text, order) => {
	sections.push(async () => ({
		partial: 'systems/projectfu/templates/chat/partials/chat-generic-text.hbs',
		data: {
			text: await TextEditor.enrichHTML(await text),
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
			progress: clock,
			segments: clock.progressArray,
			displayName: true,
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
 * @param {TargetData[]} targetData
 * @param {Object} flags
 * @param {CheckInspector} inspector
 */
const targeted = (sections, actor, item, targetData, flags, inspector = undefined) => {
	const isTargeted = targetData?.length > 0 || !Targeting.STRICT_TARGETING;

	let checkData;
	let damageData;

	if (inspector) {
		checkData = inspector.getCheck();
		damageData = inspector.getExtendedDamageData();
		switch (checkData.type) {
			case 'accuracy':
			case 'magic':
				sections.push({
					order: CHECK_ROLL,
					partial: 'systems/projectfu/templates/chat/chat-check-container.hbs',
					data: {
						check: checkData,
						damage: damageData,
						translation: {
							damageTypes: FU.damageTypes,
							damageIcon: FU.affIcon,
						},
					},
				});
				break;
		}
	}

	if (isTargeted) {
		const isDamage = checkData && damageData;
		const sourceInfo = InlineSourceInfo.fromInstance(actor, item);
		const targets = Targeting.deserializeTargetData(targetData);

		sections.push(async function () {
			/** @type {TargetAction[]} **/
			let actions = [];
			actions.push(Targeting.defaultAction);

			// Resource action
			const resourceData = inspector.getResource();
			if (resourceData) {
				const expressionContext = ExpressionContext.fromSourceInfo(sourceInfo, targetData);
				const amount = await Expressions.evaluateAsync(this.amount, expressionContext);
				const request = new ResourceRequest(sourceInfo, targets, resourceData.type, amount);
				actions.push(ResourcePipeline.getTargetedAction(request));
			}

			// TODO: Refactor
			// Damage action
			if (isDamage) {
				actions.push(DamagePipeline.getTargetedAction(damageData, sourceInfo));

				function onRoll() {
					for (const target of targetData) {
						showFloatyText(target, target.result === 'hit' ? 'FU.Hit' : 'FU.Miss');
					}
					// For any hit targets, attempt to apply damage
					const hitTargets = targetData.filter((t) => t.result === 'hit');
					if (hitTargets.length > 0) {
						if (damageData && game.settings.get(SYSTEM, SETTINGS.automationApplyDamage)) {
							const traits = inspector.getTraits();
							setTimeout(() => {
								game.projectfu.socket.requestPipeline('damage', {
									sourceInfo: InlineSourceInfo.fromInstance(actor, item),
									targets: hitTargets,
									damageData,
									traits,
								});
							}, 50);
						}
					}
				}

				if (game.dice3d) {
					Hooks.once('diceSoNiceRollComplete', onRoll);
				} else {
					onRoll();
				}
			}

			// Selected actions
			let selectedActions = [];
			if (inspector) {
				for (const action of inspector.getTargetedActions()) {
					actions.push(action);
					if (action.selected) {
						selectedActions.push(action);
					}
				}
			}

			// Set any flags
			for (const action of actions) {
				if (action.flag) {
					Pipeline.toggleFlag(flags, action.flag);
				}
			}

			let rule;
			if (item.system.targeting) {
				rule = item.system.targeting.rule ?? Targeting.rule.multiple;
				targetData = await Targeting.filterTargetsByRule(actor, item, targetData);
			} else {
				rule = targetData?.length > 1 ? Targeting.rule.multiple : Targeting.rule.single;
			}

			Pipeline.toggleFlag(flags, Flags.ChatMessage.Targets);

			return {
				order: CHECK_RESULT,
				partial: 'systems/projectfu/templates/chat/partials/chat-targets.hbs',
				data: {
					retarget: true,
					rule: rule,
					targets: targetData,
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
	const itemGroup = InlineHelper.resolveItemGroup(item);
	const expense = ResourcePipeline.calculateExpense(cost, targets, itemGroup);
	if (expense.amount === 0) {
		return;
	}

	if (expense) {
		Pipeline.toggleFlag(flags, Flags.ChatMessage.ResourceLoss);
		sections.push(async () => {
			// This can be modified here...
			await CommonEvents.expendResource(actor, targets, expense);
			return {
				order: CHECK_RESULT,
				partial: 'systems/projectfu/templates/chat/partials/chat-item-spend-resource.hbs',
				data: {
					name: item.name,
					actor: actor.uuid,
					item: item.uuid,
					expense: expense,
					icon: FU.resourceIcons[expense.resource],
				},
			};
		});
	}
};

/**
 * @param {CheckRenderData} sections
 * @param {FUItem[]} slottedTechnospheres
 * @param {number} [order]
 */
const slottedTechnospheres = (sections, slottedTechnospheres, order) => {
	sections.push({
		partial: 'projectfu.technospheres.chatSlotted',
		data: { slotted: slottedTechnospheres },
		order,
	});
};

export const CommonSections = {
	description,
	genericText,
	collapsibleDescription,
	clock,
	tags,
	quality,
	resource,
	itemFlavor,
	genericFlavor,
	opportunity,
	targeted,
	spendResource,
	slottedTechnospheres,
};
