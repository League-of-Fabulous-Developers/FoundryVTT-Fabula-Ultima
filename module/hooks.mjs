/**
 * @description An enumeration of all the hooks provided by the system, usable by the built-in Hooks API
 * @example Hooks.on(FUHooks.DAMAGE_PIPELINE_BEFORE_AFFINITIES, modifyAmountJustBecause);
 * @remarks For most callbacks returning false will prevent anything further down the call-chain from being invoked.
 */
export const FUHooks = {
	/**
	 * @description Append a step to the damage pipeline
	 * @example callback(context) { context.result = 42; return true; }
	 */
	DAMAGE_PIPELINE_STEP: 'projectfu.pipelines.damage',
	/**
	 * @description Modify the amount before affinities have been applied (which is then stored as the result)
	 * @example callback(context) { context.amount += 42; return true; }
	 */
	DAMAGE_PIPELINE_BEFORE_AFFINITIES: 'projectfu.pipelines.damage.beforeAffinities',
	/**
	 * @description Modify the result after affinities have been applied.
	 * @example callback(context) { context.result += 42; return true; }
	 */
	DAMAGE_PIPELINE_AFTER_AFFINITIES: 'projectfu.pipelines.damage.afterAffinities',
	/**
	 * @deprecated Replaced by {DAMAGE_PIPELINE_BEFORE_AFFINITIES}
	 * @example calllback(data) { ... }
	 */
	DAMAGE_APPLY_BEFORE: 'projectfu.damage.beforeApply',
	/**
	 * @deprecated Replaced by {DAMAGE_PIPELINE_BEFORE_AFFINITIES}
	 * @example calllback(data) { ... }
	 */
	DAMAGE_APPLY_TARGET: 'projectfu.damage.applyTarget',
	/**
	 * @description Invoked when the data model for an FUActor is set
	 * @example callback(actor { ... }
	 */
	DATA_PREPARED_ACTOR: 'projectfu.actor.dataPrepared',
	/**
	 * @description Invoked when the data model for an FUItem is set
	 * @example callback(item) { ... }
	 */
	DATA_PREPARED_ITEM: 'projectfu.item.dataPrepared',
	/**
	 * @description Invoked when a study roll is made
	 * @example callback(actor, journalEntry) { ... }
	 */
	ROLL_STUDY: 'studyRoll',
};
