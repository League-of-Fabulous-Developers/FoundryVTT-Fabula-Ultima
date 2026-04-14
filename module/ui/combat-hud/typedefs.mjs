/**
 * @typedef {Object} CombatHUDTheme
 * @property {string} id
 * @property {string} name
 * @property {typeof BaseCombatHUD} cls
 */

/**
 * @typedef {Object} WindowPosition
 * @property {number} top
 * @property {number} left
 * @property {number} bottom
 * @property {number} right
 * @property {number} width
 */

/**
 * @typedef {Object} CombatHUDRenderContext
 * @extends {foundry.applications.api.ApplicationV2.RenderContext}
 *
 * @property {string} elementClass
 * @property {boolean} showPopoutButton
 * @property {boolean} isCompact
 * @property {number} opacity
 * @property {string} additionalStyle
 * @property {string[]} totalTurns
 * @property {string[]} turnsLeft
 * @property {boolean} turnStarted
 * @property {Combatant} combatant
 * @property {boolean} isGM
 * @property {object} icons
 * @property {Record<string, string>} icons
 *
 * @property {CombatHUDCombatantContext[]} npcs
 * @property {CombatHUDCombatantContext[]} characters
 * @property {CombatHUDCombatantContext[]} combatants - All combatants in the conflict, regardless of disposition
 */

/**
 * @typedef {Object} CombatHUDCombatantContext
 * @property {string} id
 * @property {string} name
 * @property {import("../../documents/actors/actor.mjs").Actor} actor
 * @property {boolean} isOwner
 * @property {number} totalTurns
 * @property {import("../../documents/actors/actor.mjs").Token} token
 * @property {string} faction
 * @property {Object} effects
 * @property {string} img
 * @property {string} trackedResourcePart1
 * @property {string} trackedResourcePart2
 * @property {string} trackedResourcePart3
 * @property {string} trackedResourcePart4
 * @property {number} opacity
 * @property {object} zeropower
 * @property {object} zeropower.progress
 * @property {number} zeropower.progress.current
 * @property {number} zeropower.progress.max
 *
 * @property {boolean} hasEffects
 * @property {string} rowClass
 * @property {boolean} shouldEffectsMarquee
 * @property {number} effectsMarqueeDirection
 * @property {string} marqueeDirection
 * @property {number} order
 * @property {boolean} hideTurns
 *
 * @property {boolean} showPressureClock
 * @property {object} pressure
 * @property {number} pressure.current
 * @property {number} pressure.max
 */
