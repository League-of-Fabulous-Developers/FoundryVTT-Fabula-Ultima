/**
 * @typedef ClickModifiers
 * @prop {boolean} alt
 * @prop {boolean} ctrl
 * @prop {boolean} shift
 */

/**
 * @property {FUActor[]} targets
 * @property {InlineSourceInfo} sourceInfo
 * @property {Event | null} event
 * @property {ClickModifiers | null} clickModifiers
 * @property {String} chatTemplateName The name of the template used for rendering the request
 */
export class PipelineRequest {
	constructor(sourceInfo, targets) {
		this.sourceInfo = sourceInfo;
		this.targets = targets;
	}

	setEvent(event) {
		this.event = event;
		this.clickModifiers = {
			alt: event.altKey,
			ctrl: event.ctrlKey || event.metaKey,
			shift: event.shiftKey,
		};
	}

	setTemplate(template) {
		this.chatTemplateName = template;
	}
}

/**
 * @param {PipelineRequest} request
 * @param {Function} getUpdatesForActor
 * @returns {Promise<Awaited<unknown>[]>}
 */
async function process(request, getUpdatesForActor) {
	const updates = [];
	for (const actor of request.targets) {
		updates.push(getUpdatesForActor(actor));
	}
	return Promise.all(updates);
}

/**
 * @param {Event} event
 * @returns {FUActor[]}
 */
function getSingleTarget(event) {
	const dataId = $(event.target).closest('a').data('id');
	const actor = fromUuidSync(dataId);
	if (!actor) {
		ui.notifications.warn('FU.ChatApplyEffectNoActorsTargeted', { localize: true });
		return [];
	}
	return [actor];
}

export const Pipeline = {
	getSingleTarget,
	process,
};
