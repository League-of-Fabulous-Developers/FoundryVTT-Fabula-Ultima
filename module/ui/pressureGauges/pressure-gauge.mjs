import { SYSTEM } from '../../helpers/config.mjs';
import { SETTINGS } from '../../settings.js';

export class FUPressureGauge extends globalThis.PIXI.Container {
	static get name() {
		return 'FU.CombatHudDefault';
	}

	static get combatHudTheme() {
		return 'fu-default';
	}

	// TODO: It would be lovely to be able to pull the colors directly from CSS, but that would necessitate
	fgStartColor = globalThis.getComputedStyle(document.documentElement).getPropertyValue(`--background-critical-start`);
	fgEndColor = globalThis.getComputedStyle(document.documentElement).getPropertyValue(`--background-critical-end`);

	borderColor = '#c7c7c7';
	bgColor = '#656565';
	shadowColor = '#000000';

	animationDuration = 250;
	barHeight = 5;

	lastValue = 0;

	get clock() {
		return this.token?.actor?.resolveProgress('pressure');
	}

	get usePressureSystem() {
		return !!game?.settings.get(SYSTEM, SETTINGS.pressureSystem);
	}

	get shouldDrawPressureGauge() {
		return !!(this.usePressureSystem && game.settings.get(SYSTEM, SETTINGS.optionPressureGaugeShow) && this.clock && this.token.inCombat);
	}

	/**
	 * Creates necessary PIXI display objects for this particular gauge style
	 */
	_createElements(width = 100, height = this.barHeight) {
		const bg = new globalThis.PIXI.Sprite(globalThis.PIXI.Texture.WHITE);
		bg.name = `${this.token.id}.Pressure.BG`;
		this.addChild(bg);

		const fg = new globalThis.PIXI.Sprite();
		fg.name = `${this.token.id}.Pressure.FG`;
		this.addChild(fg);

		const mask = new globalThis.PIXI.Sprite(globalThis.PIXI.Texture.WHITE);
		mask.name = `${this.token.id}.Pressure.FGMask`;
		this.addChild(mask);
		fg.mask = mask;

		const shadow = new globalThis.PIXI.Graphics();
		shadow.name = `${this.token.id}.Pressure.Shadow`;
		this.addChild(shadow);

		const border = new globalThis.PIXI.Graphics();
		border.name = `${this.token.id}.Pressure.Border`;
		this.addChild(border);

		const { current = 0, max = 0 } = this.clock ?? {};
		this._animateWidth(fg.mask, width * (current / max), true);
	}

	_createProgressTexture(width, height) {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');

		const gradient = ctx.createLinearGradient(0, 0, width, 0);
		gradient.addColorStop(0, this.fgStartColor);
		gradient.addColorStop(1, this.fgEndColor);

		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		return globalThis.PIXI.Texture.from(canvas);
	}

	_positionGauge() {
		this.y = -(this.height + 5);
		if (this.token.tooltip) this.token.tooltip.y = this.y;
	}

	_animateWidth(mask, width, suppressAnimation = false) {
		if (!mask?.transform) return;

		if (!this.token.isPreview && !suppressAnimation) {
			globalThis.gsap.killTweensOf(mask);
			globalThis.gsap.to(mask, { width, duration: this.animationDuration / 1000 });
		} else {
			mask.width = width;
		}
	}

	/**
	 * Called hwen the gauge should be redrawn
	 * @param {boolean} force - If true, will destroy then recreate display objects
	 */
	refresh(force = false) {
		try {
			if (force) {
				this._destroyChildren();
				this._createElements();
			}
			if (!this.shouldDrawPressureGauge) {
				this.visible = false;
				return;
			} else {
				this.visible = true;
			}

			const [bg, fg, border, mask, shadow] = ['BG', 'FG', 'Border', 'FGMask', 'Shadow'].map((name) => this.getChildByName(`${this.token.id}.Pressure.${name}`));

			if (!(bg && fg && border && mask)) throw new Error(`Pressure gauge PIXI elements not created for ${this.token.id}!`);

			const { width } = this.token.document.getSize();

			const { current, max } = this.clock;
			bg.tint = this.bgColor;
			bg.width = width;
			bg.height = this.barHeight;
			bg.x = bg.y = 0;

			// Should probably migrate away from redrawing this texture on every refresh,
			// it may be not great on performance
			fg.texture = this._createProgressTexture(width, this.barHeight);

			if (current !== this.lastValue) {
				this._animateWidth(fg.mask, fg.width * (current / max));
				this.lastValue = current;
			}

			fg.x = bg.x;
			fg.y = bg.y;

			border.clear();
			border.lineStyle(1, this.borderColor, 1);
			border.drawRect(0, 0, width, this.barHeight);

			shadow.clear();
			shadow.lineStyle(1, this.shadowColor, 0.25);
			shadow.moveTo(2, 2);
			shadow.lineTo(width - 2, 2);

			shadow.moveTo(1, 2);
			shadow.lineTo(1, this.barHeight - 1);

			this._positionGauge();
		} catch (err) {
			console.error(err);
		}
	}

	destroy() {
		this._destroyChildren();
		globalThis.gsap.killTweensOf(this);
		super.destroy();
	}

	_destroyChildren() {
		const children = [...this.children];
		this.removeChildren();
		children.forEach((child) => {
			globalThis.gsap.killTweensOf(child);
			child.destroy();
		});
	}

	constructor(token) {
		if (!(token instanceof foundry.canvas.placeables.Token)) throw new Error(`Invalid token provided`);

		super();

		this.token = token;
		this._createElements();
	}
}
