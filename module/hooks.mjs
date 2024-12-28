/**
 * @description An enumeration of all the hooks provided by the system, usable by the built-in Hooks API
 * @example Hooks.on(FUHooks.DAMAGE_PIPELINE_BEFORE_AFFINITIES, modifyAmountJustBecause);
 * @remarks For most callbacks returning false will prevent anything further down the call-chain from being invoked.
 */
export const FUHooks = {
	/**
	 * @description Modify the bonuses and modifiers before the result is calculated.
	 * @example callback(context) { context.modifiers.set("foobar", 42); return true; }
	 * @example callback(context) { context.modifiers.delete("affinity"); return true; }
	 */
	DAMAGE_PIPELINE_BEFORE_RESULT: 'projectfu.pipelines.damage.beforeResult',
	/**
	 * @description Modify the result after it's been calculated.
	 * @example callback(context) { context.result += 42; return true; }
	 */
	DAMAGE_PIPELINE_AFTER_RESULT: 'projectfu.pipelines.damage.afterResult',
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
