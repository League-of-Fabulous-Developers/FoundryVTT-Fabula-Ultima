import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { Flags, FlagUtility } from '../../../../helpers/flags.mjs';
import { SYSTEM } from '../../../../helpers/config.mjs';
import { CommonEvents } from '../../../../checks/common-events.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';
import { FeatureTraits } from '../../../../pipelines/traits.mjs';
import { CommonSections } from '../../../../checks/common-sections.mjs';
import { FUChatBuilder } from '../../../../helpers/chat-builder.mjs';
import { StringUtils } from '../../../../helpers/string-utils.mjs';
import { Effects } from '../../../../pipelines/effects.mjs';
import { systemId } from '../../../../helpers/system-utils.mjs';
import { Targeting } from '../../../../helpers/targeting.mjs';
import { ActionCostDataModel } from '../../common/action-cost-data-model.mjs';
import { ResourcePipeline } from '../../../../pipelines/resource-pipeline.mjs';

const durations = {
	instant: 'FU.ClassFeatureDanceDurationInstant',
	nextTurn: 'FU.ClassFeatureDanceDurationNextTurn',
};

/**
 * @extends RollableClassFeatureDataModel
 * @property {"instant", "nextTurn"} duration
 * @property {string} description
 */
export class DanceDataModel extends RollableClassFeatureDataModel {
	static defineSchema() {
		const { StringField, HTMLField } = foundry.data.fields;
		return {
			duration: new StringField({ initial: 'instant', choices: Object.keys(durations) }),
			description: new HTMLField(),
		};
	}

	static get translation() {
		return 'FU.ClassFeatureDance';
	}

	static get template() {
		return 'systems/projectfu/templates/feature/dancer/feature-dance-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/dancer/feature-dance-preview.hbs';
	}

	static async getAdditionalData(model) {
		return {
			enrichedDescription: await TextEditor.enrichHTML(model.description),
			durations,
		};
	}

	static async roll(model, item, isShift) {
		/** @type FURenderData **/
		const renderData = {
			sections: [],
			postRenderActions: [],
			tags: [
				{
					tag: `${StringUtils.localize('FU.ClassFeatureDanceDuration')}:`,
					value: StringUtils.localize(durations[model.duration]),
				},
			],
		};

		const actor = item.parent;
		CommonSections.itemFlavor(renderData.sections, item);
		const description = await TextEditor.enrichHTML(model.description);
		CommonSections.description(renderData.sections, description);
		const flags = {
			[SYSTEM]: { [Flags.ChatMessage.Item]: item.uuid },
		};

		/** @type ResourceExpense **/
		let mpCost = 10;
		const currentDance = item.system.fuid;
		const previousDance = actor?.getFlag(systemId, Flags.State.PreviousDance);
		if (previousDance && currentDance !== previousDance) {
			mpCost = 5;
		}

		const targets = Targeting.getSerializedTargetData();
		const cost = new ActionCostDataModel({
			resource: 'mp',
			amount: mpCost,
			perTarget: false,
		});
		const expense = await ResourcePipeline.calculateExpense(cost, actor, item, targets);
		await CommonEvents.calculateExpense(actor, item, targets, expense);
		CommonSections.expense(renderData, actor, item, targets, flags, expense);

		await CommonEvents.feature(actor, item, [FeatureTraits.Dance], targets, renderData);

		const effectName = 'Previous Dance (' + item.name + ')';
		const effectDescription = '<p>The last dance you performed was the <strong>' + item.name + '</strong>.</p>';
		Effects.createTemporaryEffect(actor, 'temporary', effectName, {
			img: item.img,
			system: {
				duration: {
					event: 'endOfTurn',
					interval: 2,
				},
			},
			changes: [FlagUtility.getEffectChange(Flags.State.PreviousDance, currentDance)],
			description: effectDescription,
		});

		const builder = new FUChatBuilder(actor, item);
		builder.withFlags(flags);
		builder.withData(renderData);
		await builder.create();

		CommonEvents.skill(item.actor, item);
	}
}
