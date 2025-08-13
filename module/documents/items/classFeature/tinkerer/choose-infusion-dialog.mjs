import { FU } from '../../../../helpers/config.mjs';

/**
 * @param {InfusionsDataModel} infusions
 * @return {Promise<InfusionDataModel|null>} chosen weapon or false for no equipped weapons or null for no selection
 */
async function prompt(infusions) {
	/** @type InfusionDataModel[] */
	const availableInfusions = {
		superior: [],
		advanced: [],
		basic: [],
	};

	if (infusions.rank === 'superior') {
		availableInfusions.superior.unshift(...infusions.superiorInfusions);
		availableInfusions.advanced.unshift(...infusions.advancedInfusions);
		availableInfusions.basic.unshift(...infusions.basicInfusions);
	} else if (infusions.rank === 'advanced') {
		availableInfusions.advanced.unshift(...infusions.advancedInfusions);
		availableInfusions.basic.unshift(...infusions.basicInfusions);
	} else if (infusions.rank === 'basic') {
		availableInfusions.basic.unshift(...infusions.basicInfusions);
	}

	const data = {
		infusions: availableInfusions,
		FU,
		dialogId: foundry.utils.randomID(),
	};

	const content = await foundry.applications.handlebars.renderTemplate('/systems/projectfu/templates/dialog/dialog-choose-infusion.hbs', data);

	const result = await foundry.applications.api.DialogV2.input({
		window: { title: game.i18n.localize('FU.ClassFeatureInfusionsDialogTitle') },
		classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
		label: game.i18n.localize('FU.Submit'),
		rejectClose: false,
		content: content,
		ok: {
			label: 'FU.Confirm',
		},
		submit: (result) => {
			if (result.infusion) {
				const [rank, index] = result.infusion.split(/:/);
				result.infusion = infusions[rank][index];
			}
		},
	});

	if (!result?.infusion) {
		ui.notifications.warn('No infusion selected.');
	}

	return result?.infusion || null;
}

export const ChooseInfusionDialog = Object.freeze({
	prompt,
});
