import { SYSTEM, SETTINGS } from '../settings.js';

export class CombatHUD extends Application {
    constructor(options) {
        super(options);

        Hooks.callAll('combatHudInit', this);
        Hooks.on("createCombatant", this._onUpdateHUD.bind(this));
        Hooks.on("deleteCombatant", this._onUpdateHUD.bind(this));

        Hooks.on("updateActor", this._onUpdateHUD.bind(this));
        Hooks.on("updateToken", this._onUpdateHUD.bind(this));

        Hooks.on("updateItem", this._onUpdateHUD.bind(this));
        Hooks.on("createItem", this._onUpdateHUD.bind(this));
        Hooks.on("deleteItem", this._onUpdateHUD.bind(this));

        Hooks.on("createActiveEffect", this._onUpdateHUD.bind(this));
        Hooks.on("updateActiveEffect", this._onUpdateHUD.bind(this));
        Hooks.on("deleteActiveEffect", this._onUpdateHUD.bind(this));

        Hooks.on("deleteCombat", this.close.bind(this));
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: 'combat-hud',
            template: 'systems/projectfu/templates/ui/combat-hud.hbs',
            popOut: false,
            classes: [...super.defaultOptions.classes, 'projectfu'],
        });
    }

    async getData(options = {}) {
		const data = await super.getData(options);
		data.cssClasses = this.options.classes.join(' ');
        data.cssId = this.options.id;

        data.npcs = [];
        data.characters = [];

        if (!game.combat) return data;

        for (const combatant of game.combat.combatants) {
            if (!combatant.actor || !combatant.token) continue;

            const actorData = {
                actor: combatant.actor,
                token: combatant.token,
                effects: game.release.generation >= 11 ? Array.from(combatant.actor.allApplicableEffects()) : combatant.actor.effects
            };

            if (combatant.token.disposition === foundry.CONST.TOKEN_DISPOSITIONS.FRIENDLY)
                data.characters.push(actorData);
            else
                data.npcs.push(actorData);
        }
        
		return data;
	}

    activateListeners(html) {
        super.activateListeners(html);

        const rows = html.find('.combat-row');
        rows.hover(this._onHoverIn.bind(this), this._onHoverOut.bind(this));

        const combatantImages = html.find('.combat-row .token-image');
        combatantImages.click((event) => this._onCombatantClick(event));
        combatantImages.on('dblclick', (event) => this._onCombatantDoubleClick(event));   

        const popOutButton = html.find('.window-popout');
        popOutButton.click(this._doPopOut.bind(this));
    }

    _doPopOut() {
        if (!PopoutModule || !PopoutModule.singleton) return;

        ui.windows[this.appId] = this;
        this._poppedOut = true;
        this.element.find('.window-popout').css("display", "none");
        PopoutModule.singleton.onPopoutClicked(this);
    }

    _onCombatantClick(event) {
        event.preventDefault();

        const combatRow = event.currentTarget.closest('.combat-row');
        const token = canvas.tokens.get(combatRow.dataset.tokenId);
        
        const isShiftActive = game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT);
        if (token) {
            token.control({ releaseOthers: !isShiftActive });
        }
    }

    _onCombatantDoubleClick(event) {

    }

    async _render(force, options) {
        await super._render(force, options);
        if (this._poppedOut) { 
            this.element.css("width", "calc(100% - 4px)");
            this.element.css("height", "100%");
            this.element.css("left", "0px");  
            return;
        }

        const hOffset = -5;

        const uiMiddle = $("#ui-middle");
        this.element.css("width", uiMiddle.width() + hOffset);

        this.element.css("left", uiMiddle.position().left);

        const uiBottom = $("#ui-bottom");
        this.element.css("bottom", uiBottom.height() + 10);
    }

    _onUpdateHUD() {
        this.render(true);
    }

    _onHoverIn(event) {
        event.preventDefault();
        if (!canvas.ready) return;

        const combatRow = event.currentTarget;
        const token = canvas.tokens.get(combatRow.dataset.tokenId);
        if (token && token.isVisible) {
            if (!token.controlled) 
                token._onHoverIn(event, {hoverOutOthers: true});

            this._hoveredToken = token;
        }
    }

    _onHoverOut(event) {
        event.preventDefault();
        if (!canvas.ready) return;

        if (this._hoveredToken) {
            this._hoveredToken._onHoverOut(event);
        }

        this._hoveredToken = null;
    }

    static init() {
        ui.combatHud = new CombatHUD();
        ui.combatHud.render(true);
    }

    static close() {
        if (ui.combatHud) {
            ui.combatHud.close();
        }

        ui.combatHud = null;
    }

    close() {
        if (this._poppedOut) {
            this._poppedOut = false;
            this.element.find('.window-popout').css("display", "block");
            return;
        }
        super.close();
    }
}