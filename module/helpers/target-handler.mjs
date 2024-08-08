export async function targetHandler() {
	const targetMode = game.settings.get('projectfu', 'optionDefaultTargetingMode');
	let targets = [];

	switch (targetMode) {
		case 'prioritizeSelected':
			targets = await getPrioritizedUserSelected();
			break;
		case 'prioritizeTargeted':
			targets = await getPrioritizedUserTargeted();
			break;
		case 'tokenSelected':
			targets = await getSelected();
			break;
		case 'tokenTargeted':
			targets = await getTargeted();
			break;
	}

	return targets || [];
}

export async function getPrioritizedUserSelected() {
	const targets = canvas.tokens.controlled.map((token) => token.document.actor).filter((actor) => actor);

	if (targets.length === 0) {
		if (game.user.character) {
			targets.push(game.user.character);
		} else {
			ui.notifications.warn('FU.ChatApplyEffectNoActorsSelected', { localize: true });
		}
	}
	return targets || [];
}

export async function getPrioritizedUserTargeted() {
	const targets = Array.from(game.user.targets)
		.map((target) => target.actor)
		.filter((actor) => actor);

	if (targets.length === 0) {
		if (game.user.character) {
			targets.push(game.user.character);
		} else {
			ui.notifications.warn('FU.ChatApplyEffectNoActorsTargeted', { localize: true });
		}
	}
	return targets || [];
}

export async function getSelected() {
	const targets = canvas.tokens.controlled.map((token) => token.document.actor).filter((actor) => actor);

	if (targets.length === 0) {
		ui.notifications.warn('FU.ChatApplyEffectNoActorsSelected', { localize: true });
	}
	return targets || [];
}

export async function getTargeted() {
	const targets = Array.from(game.user.targets)
		.map((target) => target.actor)
		.filter((actor) => actor);

	if (targets.length === 0) {
		ui.notifications.warn('FU.ChatApplyEffectNoActorsTargeted', { localize: true });
	}
	return targets || [];
}
