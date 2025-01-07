/**
 * @typedef ClickModifiers
 * @prop {boolean} alt
 * @prop {boolean} ctrl
 * @prop {boolean} shift
 */

/**
 * @property {InlineSourceInfo} sourceInfo
 * @property {FUActor[]} targets
 * @property {Set<String>} traits
 * @property {Event | null} event
 */
export class PipelineRequest {
	constructor(sourceInfo, targets) {
		this.sourceInfo = sourceInfo;
		this.targets = targets;
		this.traits = new Set();
	}
}

/**
 * @property {InlineSourceInfo} sourceInfo
 * @property {FUActor} sourceActor
 * @property {FUActor} actor The actor the pipeline is modifying
 * @property {Set<String>} traits
 * @property {Event | null} event
 * @property {?} result The result output
 */
export class PipelineContext {
	constructor(request, actor) {
		Object.assign(this, request);
		this.actor = actor;
		this.sourceActor = this.sourceInfo.resolveActor();
	}
}

/**
 * @callback PipelineStep
 * @param {PipelineContext} context
 * @returns {Boolean} False if the no further calls in the pipeline are needed
 * @remarks Only to be used synchronously
 */

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
