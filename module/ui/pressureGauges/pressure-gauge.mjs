import { SYSTEM } from '../../helpers/config.mjs';
import { SETTINGS } from '../../settings.js';

export class FUPressureGauge extends globalThis.PIXI.Container {
	static get name() {
		return 'FU.CombatHudDefault';
	}

	static get combatHudTheme() {
		return 'fu-default';
	}

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

		const fg = new globalThis.PIXI.Sprite(this._createProgressTexture(width, height));
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
		switch (game.settings.get(SYSTEM, SETTINGS.optionPressureGaugePosition)) {
			case 'bottom':
				this.y = this.token.document.getSize().height + 5;
				if (this.token.nameplate) this.token.nameplate.y = this.y + this.height;
				break;
			default:
				this.y = -(this.height + 5);
				if (this.token.tooltip) this.token.tooltip.y = this.y;
				break;
		}
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

	lastCanvasScale = { x: 0, y: 0 };
	/** Called on canvasPan hook to handle inverting the PIXI stage's scale, to preserve pixel precision */
	onCanvasScale() {
		if (!(this.lastCanvasScale.x === canvas.stage.scale.y && this.lastCanvasScale.y === canvas.stage.scale.y)) {
			// Scale has changed, invert our own scale
			this.scale.set(1 / canvas.stage.scale.x, 1 / canvas.stage.scale.y);
			this.lastCanvasScale = { x: canvas.stage.scale.x, y: canvas.stage.scale.y };
			this.refresh();
		}
	}

	_getScaledSize() {
		return {
			width: this.token.document.getSize().width * canvas.stage.scale.x,
			height: this.barHeight * canvas.stage.scale.y,
		};
	}

	_getChildElement(namePart) {
		return this.getChildByName(`${this.token.id}.Pressure.${namePart}`);
	}

	_setChildElement(namePart, elem) {
		elem.name = `${this.token.id}.Pressure.${namePart}`;
		this.addChild(elem);
	}

	_drawBorder() {
		const border = this._getChildElement('Border');
		if (!border) return;

		const { width, height } = this._getScaledSize();
		border.clear();
		border.lineStyle(1, this.borderColor, 1);
		border.drawRect(0, 0, width, height);
	}

	_drawShadow() {
		const shadow = this._getChildElement('Shadow');
		if (!shadow) return;

		const { width, height } = this._getScaledSize();

		shadow.clear();
		shadow.lineStyle(2, this.shadowColor, 0.25);
		shadow.moveTo(1, 1);
		shadow.lineTo(width - 2, 1);

		shadow.moveTo(1, 1);
		shadow.lineTo(1, height - 2);
	}

	/**
	 * Called hwen the gauge should be redrawn
	 * @param {boolean} force - If true, will destroy then recreate display objects
	 */
	refresh(force = false) {
		try {
			const { width, height } = this._getScaledSize();
			if (force) {
				this._destroyChildren();
				this._createElements(width, height);
			}
			if (!this.shouldDrawPressureGauge) {
				this.visible = false;
				return;
			} else {
				this.visible = true;
			}

			const [bg, fg, border, mask] = ['BG', 'FG', 'Border', 'FGMask', 'Shadow'].map((name) => this._getChildElement(name));

			if (!(bg && fg && border && mask)) throw new Error(`Pressure gauge PIXI elements not created for ${this.token.id}!`);

			this._drawBorder();
			this._drawShadow();

			const { current, max } = this.clock;
			bg.tint = this.bgColor;
			bg.width = border.width;
			bg.height = border.height;

			bg.x = bg.y = fg.x = fg.y = 0;

			fg.height = height;
			if (current !== this.lastValue) {
				this._animateWidth(fg.mask, width * (current / max));
				this.lastValue = current;
			} else {
				fg.width = width * (current / max);
			}

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
		const { width, height } = this._getScaledSize();
		this.lastCanvasScale = { x: canvas.stage.scale.x, y: canvas.stage.scale.y };
		this.scale.set(1 / this.lastCanvasScale.x, 1 / this.lastCanvasScale.y);
		this._createElements(width, height);
		this.refresh();
	}
}
