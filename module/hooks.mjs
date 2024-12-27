/**
 * @description An enumeration of all the hooks provided by the system, usable by the built-in Hooks API
 * @example Hooks.on(FUHooks.DAMAGE_PIPELINE, modifyAmountJustBecause);
 * @remarks For most callbacks returning false will prevent anything further down the call-chain from being invoked.
 */
export const FUHooks = {
	// Pipelines
	/**
	 * @description Append a step to the damage pipeline
	 * @example context.result = 42; return true;
	 */
	DAMAGE_PIPELINE: 'projectfu.pipelines.damage',
	/**
	 * @description Modify the amount before affinities have been applied (which is then stored as the result)
	 * @example context.amount += 42; return true;
	 */
	DAMAGE_PIPELINE_BEFORE_AFFINITIES: 'projectfu.pipelines.damage.beforeAffinities',
	/**
	 * @description Modify the result after affinities have been applied.
	 * @example context.result += 42; return true;
	 */
	DAMAGE_PIPELINE_AFTER_AFFINITIES: 'projectfu.pipelines.damage.afterAffinities',
	// TODO: Deprecate
	DAMAGE_APPLY_BEFORE: 'projectfu.damage.beforeApply',
	DAMAGE_APPLY_TARGET: 'projectfu.damage.applyTarget',
	// Actor
	DATA_PREPARED_ACTOR: 'projectfu.actor.dataPrepared',
	// Item
	DATA_PREPARED_ITEM: 'projectfu.item.dataPrepared',
	// Action
	ROLL_STUDY: 'studyRoll',
};
