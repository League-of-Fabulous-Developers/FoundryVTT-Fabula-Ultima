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
	};

	const content = await renderTemplate('/systems/projectfu/templates/dialog/dialog-choose-infusion.hbs', data);

	const selectedInfusion = await new Promise((resolve) => {
		const dialog = new Dialog({
			title: 'FU.ClassFeatureInfusionsDialogTitle',
			label: 'FU.Submit',
			rejectClose: false,
			content: content,
			render: (jQuery) => {
				jQuery.find('[data-action=select][data-index]').on('click', function () {
					const category = this.dataset.category;
					resolve(data.infusions[category][Number(this.dataset.index)] ?? null);
					dialog.close();
				});
			},
			close: () => resolve(null),
			buttons: {},
		});
		dialog.render(true);
	});

	return selectedInfusion || null;
}

export const ChooseInfusionDialog = Object.freeze({
	prompt,
});
