// TODO: Deprecate once users switch to newer hooks
/**
 * @property {Event | null} event
 * @property {FUActor[]} targets
 * @property {string | null} sourceUuid
 * @property {string | null} sourceName
 * @property {import('./typedefs.mjs').BaseDamageInfo} baseDamageInfo
 * @property {import('./damage-customizer.mjs').ExtraDamageInfo} extraDamageInfo
 * @property {ClickModifiers | null} clickModifiers
 * @deprecated Replaced in the newer pipeline by PipelineContext
 */
export class BeforeApplyHookData {
	/**
	 * @param {DamageRequest} request
	 */
	constructor(request) {
		this.event = request.event;
		this.targets = request.targets;
		this.sourceUuid = request.sourceInfo.actorUuid;
		this.sourceName = request.sourceInfo.name;
		this.baseDamageInfo = request.baseDamageInfo;
		this.extraDamageInfo = request.extraDamageInfo;
		this.clickModifiers = request.clickModifiers;
	}
}

/**
 * @property {FUActor} target
 * @property {string | null} sourceUuid
 * @property {string | null} sourceName
 * @property {DamageType} damageType
 * @property {number} total
 * @property {ClickModifiers | null} clickModifiers
 * @property {ExtraDamageInfo} extraDamageInfo
 * @property {ApplyTargetOverrides} overrides
 * @deprecated Replaced in the newer pipeline by PipelineContext
 */
export class ApplyTargetHookData {
	/**
	 * @param {DamageRequest} request
	 * @param {FUActor} target
	 * @param {Number} total
	 */
	constructor(request, target, total) {
		this.target = target;
		this.total = total;
		this.sourceUuid = request.sourceInfo.actorUuid;
		this.sourceName = request.sourceInfo.name;
		this.damageType = request.damageType;
		this.baseDamageInfo = request.baseDamageInfo;
		this.extraDamageInfo = request.extraDamageInfo;
		this.clickModifiers = request.clickModifiers;
		this.overrides = request.overrides;
	}
}
