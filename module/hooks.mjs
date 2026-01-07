/**
 * @description An enumeration of all the hooks provided by the system, usable by the built-in Hooks API
 * @example Hooks.on(FUHooks.DAMAGE_PIPELINE_BEFORE_AFFINITIES, modifyAmountJustBecause);
 * @remarks For most callbacks returning false will prevent anything further down the call-chain from being invoked.
 */
export const FUHooks = {
	/**
	 * @description Add/modify the bonuses and modifiers before the result is calculated.
	 * @example callback(context) { context.modifiers.set("foobar", 42); return true; }
	 * @example callback(context) { context.modifiers.delete("affinity"); return true; }
	 */
	DAMAGE_PIPELINE_PRE_CALCULATE: 'projectfu.pipelines.damage.preCalculate',
	/**
	 * @description Modify the result after it's been calculated.
	 * @example callback(context) { context.result += 42; return true; }
	 */
	DAMAGE_PIPELINE_POST_CALCULATE: 'projectfu.pipelines.damage.postCalculate',
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
	 * @description Invoked when a study roll has been resolved
	 * @example callback(actor, journalEntry) { ... }
	 */
	ROLL_STUDY: 'studyRoll',
	/**
	 * @description Invoked when there's a change in the combat state
	 * @example callback(event)
	 * @remarks Uses {@link CombatEvent}
	 */
	COMBAT_EVENT: 'projectfu.events.combat',
	/**
	 * @description Invoked after an attack (involving an accuracy check) has been performed by an actor
	 * @example callback(event)
	 * @remarks Uses {@link AttackEvent}
	 */
	ATTACK_EVENT: 'projectfu.events.attack',
	/**
	 * @description Invoked after a spell (without a magic check) has been performed by an actor
	 * @example callback(event)
	 * @remarks Uses {@link SpellEvent}
	 */
	SPELL_EVENT: 'projectfu.events.spell',
	/**
	 * @description Invoked after a skill (without an accuracy check) has been performed by an actor
	 * @example callback(event)
	 * @remarks Uses {@link SkillEvent}
	 */
	SKILL_EVENT: 'projectfu.events.skill',
	/**
	 * @description Invoked after damage has been applied to an actor
	 * @example callback(event)
	 * @remarks Uses {@link DamageEvent}
	 */
	DAMAGE_EVENT: 'projectfu.events.damage',
	/**
	 * @description Invoked after resource gain has been applied to an actor
	 * @example callback(event)
	 * @remarks Uses {@link GainEvent}
	 */
	GAIN_EVENT: 'projectfu.events.gain',
	/**
	 * @description Dispatched after resource loss has been applied to an actor
	 * @example callback(event)
	 * @remarks Uses {@link LossEvent}.
	 */
	LOSS_EVENT: 'projectfu.events.loss',
	/**
	 * @description Dispatched after a resource update has been applied to an actor
	 * @example callback(event)
	 * @remarks Uses {@link ResourceUpdateEvent}.
	 */
	RESOURCE_UPDATE: 'projectfu.events.resource',
	/**
	 * @description Dispatched after a resource update has been expended to perform an action/
	 * @example callback(event)
	 * @remarks Uses {@link ResourceExpendEvent}.
	 */
	RESOURCE_EXPEND_EVENT: 'projectfu.events.expendResource',
	/**
	 * @description Dispatched after an actor enters crisis.
	 * @example callback(event)
	 * @remarks Uses {@link CrisisEvent}. This can happen after a {@link DAMAGE_EVENT}.
	 */
	CRISIS_EVENT: 'projectfu.events.crisis',
	/**
	 * @description Invoked after an actor is reduced to 0 hit points
	 * @example callback(event)
	 * @remarks Uses {@link DefeatEvent}. This can happen after a {@link DAMAGE_EVENT}.
	 */
	DEFEAT_EVENT: 'projectfu.events.defeat',
	/**
	 * @description Dispatched after an actor has a status effect applied or removed on them.
	 * @example callback(event)
	 * @remarks Uses {@link StatusEvent}. It happens AFTER the status effect has been applied.
	 */
	STATUS_EVENT: 'projectfu.events.status',
	/**
	 * @description Dispatched after an actor uses a consumable
	 * @example callback(event)
	 * @remarks Uses {@link ItemEvent}
	 */
	ITEM_EVENT: 'projectfu.events.item',
	/**
	 * @description Dispatched after an actor performs a study check
	 * @example callback(event)
	 * @remarks Uses {@link StudyEvent}
	 */
	STUDY_EVENT: 'projectfu.events.study',
	/**
	 * @description Dispatched after a character gains an opportunity
	 * @example callback(event)
	 * @remarks Uses {@link OpportunityEvent}
	 */
	OPPORTUNITY_EVENT: 'projectfu.events.opportunity',
	/**
	 * @description Dispatched when a check is being initialized.
	 * @example callback(event)
	 * @remarks Uses {@link InitializeCheckEvent}
	 */
	INITIALIZE_CHECK_EVENT: 'projectfu.events.checks.initialize',
	/**
	 * @description Dispatched when a check is about to be performed.
	 * @example callback(event)
	 * @remarks Uses {@link PerformCheckEvent}
	 */
	PERFORM_CHECK_EVENT: 'projectfu.events.checks.perform',
	/**
	 * @description Dispatched when a check has been resolved.
	 * @example callback(event)
	 * @remarks Uses {@link ResolveCheckEvent}
	 */
	RESOLVE_CHECK_EVENT: 'projectfu.events.checks.resolve',
	/**
	 * @description Dispatched when a check is about to be rendered.
	 * @example callback(event)
	 * @remarks Uses {@link RenderCheckEvent}
	 */
	RENDER_CHECK_EVENT: 'projectfu.events.checks.render',
	/**
	 * @description Dispatched whenever there is a change in active wellsprings.
	 * @remarks Uses {@link WellspringDataModel}
	 */
	HOOK_WELLSPRING_CHANGED: 'projectfu.wellspringChanged',
	/**
	 * @description Dispatched after an actor rests
	 * @example callback(event)
	 * @remarks Uses {@link RestEvent}
	 */
	REST_EVENT: 'projectfu.events.rest',
	/**
	 * @description Dispatched after information is revealed about an actor
	 * @example callback(event)
	 * @remarks Uses {@link RevealEvent}
	 */
	REVEAL_EVENT: 'projectfu.events.reveal',
	/**
	 * @description Dispatched after an adversary entry has been added to the active party sheet
	 * @example callback(entry)
	 * @remarks Uses {@link NpcProfileData}
	 */
	PARTY_ADVERSARY_EVENT: 'projectfu.events.party.adversary',

	/**
	 * @description Dispatched when a websocket message arrives, after it has been processed by the socket handler.
	 * @example callback(event)
	 * @remarks Uses {@link SocketMessage}
	 */
	SOCKET_RECEIVE_EVENT: 'projectfu.events.socket.received',

	/**
	 * @description Dispatched after a websocket message is sent
	 * @example callback(event)
	 * @remarks Uses {@link SocketMessage}
	 */
	SOCKET_SEND_EVENT: 'projectfu.events.socket.sent',
	/**
	 * @description Dispatched after a progress tracker has been updated.
	 * @example callback(event)
	 * @remarks Uses {@link ProgressEvent}
	 */
	PROGRESS_EVENT: 'projectfu.events.progress',
	/**
	 * @description Dispatched on first render of a character sheet
	 * @example
	 * const callback = (contextOptions: ContextMenuOption[], sheet: ActorSheet, actor: Actor) => {...};
	 * Hook.on("projectfu.getItemContextMenuOptions", callback)
	 */
	ITEM_TABLE_CONTEXT_OPTIONS: 'projectfu.getItemTableContextOptions',
	/**
	 * @description Dispatched when a request to apply damage is being processed.
	 * @example callback(event)
	 * @remarks Uses {@link CalculateDamageEvent}
	 */
	CALCULATE_DAMAGE_EVENT: 'projectfu.events.calculateDamage',
	/**
	 * @description Dispatched when a request to apply a resource change is being processed.
	 * @example callback(event)
	 * @remarks Uses {@link CalculateResourceEvent}
	 */
	CALCULATE_RESOURCE_EVENT: 'projectfu.events.calculateResource',
	/**
	 * @description Dispatched when something happens, tagged by an identifier.
	 * @example callback(event)
	 * @remarks Uses {@link NotificationEvent}
	 */
	NOTIFICATION_EVENT: 'projectfu.events.notification',
	/**
	 * @description Dispatched when an active effect is toggled.
	 * @example callback(event)
	 * @remarks Uses {@link NotificationEvent}
	 */
	EFFECT_TOGGLED_EVENT: 'projectfu.events.effectToggled',
	/**
	 * @description Dispatched when a consumable is created.
	 * @example callback(event)
	 * @remarks Uses {@link CreateConsumableEvent}
	 */
	CONSUMABLE_CREATE_EVENT: 'projectfu.events.consumables.create',
};
