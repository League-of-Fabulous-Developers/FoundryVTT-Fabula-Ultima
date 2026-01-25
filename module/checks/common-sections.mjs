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
import { Effects } from '../pipelines/effects.mjs';
import { FeatureTraits } from '../pipelines/traits.mjs';
import { ProgressPipeline } from '../pipelines/progress-pipeline.mjs';
import FoundryUtils from '../helpers/foundry-utils.mjs';
import { ChatAction } from '../helpers/chat-action.mjs';

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
 * @param {string} content
 * @param {number} [order]
 */
const content = (sections, content, order) => {
	sections.push(async () => ({
		content: content,
		order,
	}));
};

/**
 * @param {CheckRenderData} sections
 * @param {string} template
 * @param {Object} context
 * @param {number} [order]
 */
const template = (sections, template, context, order) => {
	sections.push(async () => {
		const content = await FoundryUtils.renderTemplate(template, context);
		return {
			content: content,
			order,
		};
	});
};

/**
 * @param {CheckRenderData} sections
 * @param {ChatAction[]} actions
 * @param {number} [order]
 */
const chatActions = (sections, actions, order) => {
	sections.push(async () => {
		const content = await ChatAction.renderToChat(actions);
		let flags = {};
		for (const action of actions) {
			if (action.flag) {
				Pipeline.toggleFlag(flags, action.flag);
			}
		}
		return {
			content: content,
			order,
		};
	});
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
 * @param {CheckRenderData} sections
 * @param {string, Promise<string>} text
 * @param {FUActor} actor
 * @param {FUItem} item
 * @param {Map} flags
 * @param {number} [order]
 */
const itemText = (sections, text, actor, item, flags, order) => {
	sections.push(async () => ({
		partial: 'systems/projectfu/templates/chat/partials/chat-item-text.hbs',
		data: {
			actor: actor,
			item: item,
			flags: flags,
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
 * @param {{name: string, img: string, id: string, uuid: string}|FUItem} item
 * @param {number} [order]
 */
const itemFlavor = (sections, item, order = CHECK_FLAVOR) => {
	sections.push({
		order: order,
		partial: 'systems/projectfu/templates/chat/chat-check-flavor-item-v2.hbs',
		data: {
			item: item,
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
 * @param {Map} flags
 * @param {CheckInspector} inspector
 */
const actions = (sections, actor, item, targetData, flags, inspector = undefined) => {
	const isTargeted = targetData?.length > 0 || !Targeting.STRICT_TARGETING;

	let checkData;
	/** @type DamageData **/
	let damageData;

	if (inspector) {
		checkData = inspector.getCheck();
		damageData = inspector.getDamage();
		switch (checkData.type) {
			case 'accuracy':
			case 'magic':
				sections.push({
					order: CHECK_ROLL,
					partial: 'systems/projectfu/templates/chat/chat-check-container.hbs',
					data: {
						type: checkData.type,
						hasAccuracy: checkData.type === 'accuracy' || checkData.type === 'magic',
						check: checkData,
						damage: damageData,
						translation: {
							damageTypes: FU.damageTypes,
							damageIcon: FU.affinityIcons,
						},
					},
				});
				break;

			case 'display':
				sections.push({
					order: CHECK_ROLL,
					partial: 'systems/projectfu/templates/chat/chat-display-container.hbs',
					data: {
						damage: damageData,
						translation: {
							damageTypes: FU.damageTypes,
							damageIcon: FU.affinityIcons,
						},
					},
				});
				break;
		}

		// Expense action
		const expenseData = inspector.getExpense();
		if (expenseData) {
			CommonSections.spendResource(sections, actor, item, expenseData, targetData, flags);
		}
	}

	if (isTargeted) {
		const isDamage = checkData && damageData;
		const sourceInfo = InlineSourceInfo.fromInstance(actor, item);
		const targets = Targeting.deserializeTargetData(targetData);
		const traits = inspector.getTraits();

		sections.push(async function () {
			/** @type {ChatAction[]} **/
			let actions = [];
			actions.push(Targeting.defaultAction);

			// Resource action
			const resourceData = inspector.getResource();
			if (resourceData) {
				const expressionContext = ExpressionContext.fromSourceInfo(sourceInfo, targets);
				let ra = 0;
				for (const mod of resourceData.modifiers) {
					ra += await Expressions.evaluateAsync(mod.amount, expressionContext);
				}
				const request = new ResourceRequest(sourceInfo, targets, resourceData.type, ra);
				actions.push(ResourcePipeline.getTargetedAction(request));
			}

			const effectData = inspector.getEffects();
			if (effectData) {
				for (const entry of effectData.entries) {
					const ea = await Effects.getTargetedAction(entry, sourceInfo);
					if (ea) {
						actions.push(ea);
					}
				}
			}

			// Damage action
			if (isDamage) {
				actions.push(DamagePipeline.getTargetedAction(damageData, sourceInfo, traits));

				// TODO: Combine expenses among all actions?
				for (const mod of damageData.modifiers) {
					if (mod.expense && mod.expense.amount > 0) {
						CommonSections.spendResource(sections, actor, item, mod.expense, targetData, flags);
						if (mod.expense.traits) {
							const expenseTraits = new Set(mod.expense.traits);
							if (expenseTraits.has(FeatureTraits.Gift)) {
								actions.push(ProgressPipeline.getAdvanceTargetedAction(actor, 'brainwave-clock', 1, mod.label));
							}
						}
					}
				}

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
			// Remaining actions
			if (inspector) {
				for (const action of inspector.getTargetedActions()) {
					actions.push(action);
				}
			}

			// Set any flags
			Pipeline.toggleFlag(flags, Flags.ChatMessage.Targets);
			flags = Pipeline.setFlag(flags, Flags.ChatMessage.Source, sourceInfo);
			for (const action of actions) {
				if (action.flag) {
					Pipeline.toggleFlag(flags, action.flag);
				}
			}

			/** @type FUTargetSelectorKey **/
			let rule;
			if (item && item.system.targeting) {
				rule = item.system.targeting.rule ?? Targeting.rule.multiple;
				targetData = await Targeting.filterTargetsByRule(actor, item, targetData);
			} else {
				rule = targetData?.length > 1 ? Targeting.rule.multiple : Targeting.rule.single;
			}

			return {
				order: CHECK_RESULT,
				partial: 'systems/projectfu/templates/chat/partials/chat-targets.hbs',
				data: {
					retarget: true,
					rule: rule,
					targets: targetData,
					actions: actions,
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
	if (!cost.amount) {
		return;
	}
	const _amount = Number.parseInt(cost.amount);
	if (_amount === 0) {
		return;
	}

	Pipeline.toggleFlag(flags, Flags.ChatMessage.ResourceLoss);
	sections.push(async () => {
		const itemGroup = InlineHelper.resolveItemGroup(item);
		const expense = await ResourcePipeline.calculateExpense(cost, actor, item, targets, itemGroup);

		// This can be modified here...
		await CommonEvents.calculateExpense(actor, item, targets, expense);
		return {
			order: CHECK_RESULT,
			partial: 'systems/projectfu/templates/chat/partials/chat-item-spend-resource.hbs',
			data: {
				name: item.name,
				actor: actor.uuid,
				item: item.uuid,
				expense: expense,
				resourceLabel: FU.resourcesAbbr[expense.resource],
				icon: FU.resourceIcons[expense.resource],
			},
		};
	});
};

/**
 * @param {CheckRenderData} sections
 * @param {FUActor} actor
 * @param {FUItem} item
 * @param {ResourceExpense} expense
 * @param {Object} flags
 */
const expense = (sections, actor, item, expense, flags) => {
	Pipeline.toggleFlag(flags, Flags.ChatMessage.ResourceLoss);
	sections.push(async () => {
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
	content,
	chatActions,
	template,
	description,
	genericText,
	itemText,
	collapsibleDescription,
	clock,
	tags,
	quality,
	resource,
	itemFlavor,
	genericFlavor,
	opportunity,
	actions,
	spendResource,
	expense,
	slottedTechnospheres,
};
