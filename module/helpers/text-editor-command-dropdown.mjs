import { FU } from './config.mjs';
import { InlineEffects } from './inline-effects.mjs';

async function promptDamageDialog(state, dispatch, view) {
	const result = await foundry.applications.api.DialogV2.prompt({
		window: { title: game.i18n.localize('FU.TextEditorDialogDamageTitle') },
		label: game.i18n.localize('FU.TextEditorDialogButtonInsert'),
		content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/dialog/dialog-command-damage.hbs', { damageTypes: FU.damageTypes }),
		options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
		ok: {
			callback: (event, button, dialog) => {
				const element = dialog.element;
				const type = element.querySelector('select[name=type]').value;
				const amount = element.querySelector('input[name=amount]').value;
				return { amount, type };
			},
		},
		render: (event, dialog) => {
			const element = dialog.element.querySelector('input[name=amount]');
			element.addEventListener('change', function () {
				element.value = '' + Math.floor(Number(element.value));
			});
		},
		rejectClose: false,
	});
	if (result) {
		const { amount, type } = result;
		dispatch(state.tr.insertText(` @DMG[${amount} ${type}] `));
	}
}

async function promptResourceGainDialog(state, dispatch, view) {
	const result = await foundry.applications.api.DialogV2.prompt({
		window: { title: game.i18n.localize('FU.TextEditorDialogResourceGainTitle') },
		label: game.i18n.localize('FU.TextEditorDialogButtonInsert'),
		content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/dialog/dialog-command-resource.hbs', { resources: FU.resources }),
		options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
		ok: {
			callback: (event, button, dialog) => {
				const element = dialog.element;
				const resource = element.querySelector('select[name=resource]').value;
				const amount = element.querySelector('input[name=amount]').value;
				return { amount, resource };
			},
		},
		render: (event, dialog) => {
			const element = dialog.element.querySelector('input[name=amount]');
			element.addEventListener('change', () => {
				element.value = '' + Math.floor(Number(element.value));
			});
		},
		rejectClose: false,
	});
	if (result) {
		const { amount, resource } = result;
		dispatch(state.tr.insertText(` @GAIN[${amount} ${resource}] `));
	}
}

async function promptResourceLossDialog(state, dispatch, view) {
	const result = await foundry.applications.api.DialogV2.prompt({
		window: { title: game.i18n.localize('FU.TextEditorDialogResourceLossTitle') },
		label: game.i18n.localize('FU.TextEditorDialogButtonInsert'),
		content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/dialog/dialog-command-resource.hbs', { resources: FU.resources }),
		options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
		ok: {
			callback: (event, button, dialog) => {
				const element = dialog.element;
				const resource = element.querySelector('select[name=resource]').value;
				const amount = element.querySelector('input[name=amount]').value;
				return { amount, resource };
			},
		},
		render: (event, dialog) => {
			const element = dialog.element.querySelector('input[name=amount]');
			element.addEventListener('change', () => {
				element.value = '' + Math.floor(Number(element.value));
			});
		},
		rejectClose: false,
	});
	if (result) {
		const { amount, resource } = result;
		dispatch(state.tr.insertText(` @LOSS[${amount} ${resource}] `));
	}
}

async function promptIconSelectionDialog(state, dispatch, view) {
	const result = await foundry.applications.api.DialogV2.prompt({
		window: { title: game.i18n.localize('FU.TextEditorDialogSelectIconTitle') },
		label: game.i18n.localize('FU.TextEditorDialogButtonInsert'),
		content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/dialog/dialog-command-icon.hbs', { allIcon: FU.allIcon }),
		options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
		ok: {
			callback: (event, button, dialog) => {
				const icon = dialog.element.querySelector('.icon-radio:checked').value;
				return { icon };
			},
		},
		rejectClose: false,
	});

	if (result) {
		const { icon } = result;
		dispatch(state.tr.insertText(` @ICON[${icon}] `));
	}
}

async function promptCheckDialog(state, dispatch, view) {
	const result = await foundry.applications.api.DialogV2.prompt({
		window: { title: game.i18n.localize('FU.TextEditorDialogCheckTitle') },
		label: game.i18n.localize('FU.TextEditorDialogButtonInsert'),
		content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/dialog/dialog-command-check.hbs', {
			difficultyLevels: FU.difficultyLevel,
			attributes: FU.attributes,
		}),
		options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
		ok: {
			callback: (event, button, dialog) => {
				const element = dialog.element;
				const first = element.querySelector('select[name=first]').value;
				const second = element.querySelector('select[name=second]').value;
				const level = element.querySelector('select[name=level]').value;
				return { level, first, second };
			},
		},
		rejectClose: false,
	});
	if (result) {
		const { first, second, level } = result;
		dispatch(state.tr.insertText(` @CHECK[${first} ${second} ${level}]`));
	}
}

async function promptWeaponEnchantmentDialog(state, dispatch, view) {
	const result = await foundry.applications.api.DialogV2.prompt({
		window: { title: game.i18n.localize('FU.TextEditorDialogWeaponEnchantmentTitle') },
		label: game.i18n.localize('FU.TextEditorDialogButtonInsert'),
		content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/dialog/dialog-command-weapon-enchantment.hbs', {
			damageTypes: FU.damageTypes,
		}),
		options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
		ok: {
			callback: (event, button, dialog) => {
				return dialog.element.querySelector('select[name=type]').value;
			},
		},
		rejectClose: false,
	});
	if (result) {
		dispatch(state.tr.insertText(` @WEAPON[${result}]`));
	}
}

function onGetProseMirrorMenuDropDowns(menu, config) {
	config['projectfu.textCommands'] = {
		title: 'FU.TextEditorTextCommands',
		icon: `<i class="star-label fus-star2-border" data-tooltip="FU.TextEditorTextCommands"></i>`,
		cssClass: 'right',
		entries: [
			{
				action: 'icon',
				title: 'FU.TextEditorButtonCommandIcon',
				group: 1,
				cmd: promptIconSelectionDialog,
			},
			{
				action: 'damage',
				title: 'FU.TextEditorButtonCommandDamage',
				group: 1,
				cmd: promptDamageDialog,
			},
			{
				action: 'resourceGain',
				title: 'FU.TextEditorButtonCommandGain',
				group: 1,
				cmd: promptResourceGainDialog,
			},
			{
				action: 'resourceLoss',
				title: 'FU.TextEditorButtonCommandLoss',
				group: 1,
				cmd: promptResourceLossDialog,
			},
			{
				action: 'effect',
				title: 'FU.TextEditorButtonCommandEffect',
				group: 1,
				cmd: InlineEffects.showEffectConfiguration,
			},
			{
				action: 'check',
				title: 'FU.TextEditorButtonCommandCheck',
				group: 1,
				cmd: promptCheckDialog,
			},
			{
				action: 'weapon',
				title: 'FU.TextEditorButtonCommandWeaponEnchantment',
				group: 1,
				cmd: promptWeaponEnchantmentDialog,
			},
		],
	};
}

function initialize() {
	Hooks.on('getProseMirrorMenuDropDowns', onGetProseMirrorMenuDropDowns);
}

export const TextEditorCommandDropdown = {
	initialize,
};
