function addFabulaPointDisplay(app, html, data) {
	if (game.user.isGM) {
		html.find('#player-list .player[data-user-id]').append(function () {
			const user = game.users.get(this.dataset.userId);
			if (!user.isGM && user.character) {
				const fabulaPoints = user.character.system.resources.fp.value;
				if (fabulaPoints < 10) {
					return `<span class="flex0 mats-o font-size-20" data-tooltip="${game.i18n.localize('FU.FabulaPoints')}: ${fabulaPoints}">counter_${fabulaPoints}</span>`;
				} else {
					return `<span class="flex0 mats-o font-size-20" data-tooltip="${game.i18n.localize('FU.FabulaPoints')}: ${fabulaPoints}">add_circle</span>`;
				}
			}
		});
	} else {
		const character = game.user.character;
		if (character) {
			html.find(`#player-list .player[data-user-id=${game.userId}]`).append(() => {
				const fabulaPoints = character.system.resources.fp.value;
				if (fabulaPoints < 10) {
					return `<a class="flex0" data-action="spendFabula"><span class="mats-o font-size-20" data-tooltip="${game.i18n.localize('FU.FabulaPoints')}: ${fabulaPoints}">counter_${fabulaPoints}</span></a>`;
				} else {
					return `<a class="flex0" data-action="spendFabula"><span class="mats-o font-size-20" data-tooltip="${game.i18n.localize('FU.FabulaPoints')}: ${fabulaPoints}">add_circle</span></a>`;
				}
			});
			html.find(`#player-list .player[data-user-id=${game.userId}] a[data-action=spendFabula]`).on('click', () => character.spendMetaCurrency());
		}
	}
}

function rerenderPlayerList() {
	ui.players.render();
}

export const PlayerListEnhancements = Object.freeze({
	initialize() {
		Hooks.on('renderPlayerList', addFabulaPointDisplay);
		Hooks.on('updateActor', rerenderPlayerList);
	},
});
