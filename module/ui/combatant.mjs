import {FRIENDLY, HOSTILE} from "./combat.mjs";

export class FUCombatant extends Combatant {

    /**
     * @return {"friendly" | "hostile"}
     */
    get faction() {
        return this.token?.disposition === foundry.CONST.TOKEN_DISPOSITIONS.FRIENDLY ? FRIENDLY : HOSTILE
    }

}