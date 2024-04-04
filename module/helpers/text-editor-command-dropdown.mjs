import { FU } from './config.mjs';

async function promptDamageDialog(state, dispatch, view) {
	const result = await Dialog.prompt({
		title: game.i18n.localize('FU.TextEditorDialogDamageTitle'),
		label: game.i18n.localize('FU.TextEditorDialogButtonInsert'),
		content: await renderTemplate('systems/projectfu/templates/dialog/dialog-command-damage.hbs', { damageTypes: FU.damageTypes }),
		options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
		callback: (jQuery) => {
			const type = jQuery.find('select[name=type]').val();
			const amount = jQuery.find('input[name=amount]').val();
			return { amount, type };
		},
		render: (jQuery) => {
			jQuery.find('input[name=amount]').change(function () {
				this.value = '' + Math.floor(Number(this.value));
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
	const result = await Dialog.prompt({
		title: game.i18n.localize('FU.TextEditorDialogResourceGainTitle'),
		label: game.i18n.localize('FU.TextEditorDialogButtonInsert'),
		content: await renderTemplate('systems/projectfu/templates/dialog/dialog-command-resource.hbs', { resources: FU.resources }),
		options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
		callback: (jQuery) => {
			const resource = jQuery.find('select[name=resource]').val();
			const amount = jQuery.find('input[name=amount]').val();
			return { amount, resource };
		},
		render: (jQuery) => {
			jQuery.find('input[name=amount]').change(function () {
				this.value = '' + Math.floor(Number(this.value));
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
	const result = await Dialog.prompt({
		title: game.i18n.localize('FU.TextEditorDialogResourceLossTitle'),
		label: game.i18n.localize('FU.TextEditorDialogButtonInsert'),
		content: await renderTemplate('systems/projectfu/templates/dialog/dialog-command-resource.hbs', { resources: FU.resources }),
		options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
		callback: (jQuery) => {
			const resource = jQuery.find('select[name=resource]').val();
			const amount = jQuery.find('input[name=amount]').val();
			return { amount, resource };
		},
		render: (jQuery) => {
			jQuery.find('input[name=amount]').change(function () {
				this.value = '' + Math.floor(Number(this.value));
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
    const result = await Dialog.prompt({
		title: game.i18n.localize('FU.TextEditorDialogSelectIconTitle'),
        content: await renderTemplate('systems/projectfu/templates/dialog/dialog-command-icon.hbs', { allIcon: FU.allIcon }),
        options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
        callback: (html) => {
            const icon = html.find('.icon-radio:checked').val();
            return { icon };
        },
        render: (html) => {
            html.find('.icon-radio').change(function () {
                const icon = $(this).val();
            });
        },
        rejectClose: false,
    });

    if (result) {
        const { icon } = result;
        dispatch(state.tr.insertText(` @ICON[${icon}] `));
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
		],
	};
}

function initialize() {
	Hooks.on('getProseMirrorMenuDropDowns', onGetProseMirrorMenuDropDowns);
}

export const TextEditorCommandDropdown = {
	initialize,
};
