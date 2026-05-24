# Legacy Notes — Children of Mithya Foundry System

Every file that uses a deprecated or legacy pattern is listed here.
Each row maps to a `// LEGACY:` comment in the source code.
This is the migration debt register for the E full release.

| File | Legacy pattern | v14 action required | Priority |
|---|---|---|---|
| `module/ui/application.mjs` | `Application` class (base class for `FUApplication`) | Rewrite as `ApplicationV2` | High |
| `module/checks/group-check.mjs` | `FUApplication` (inherits `Application`) | Rewrite as `ApplicationV2` | High |
| `module/documents/items/classFeature/chanter/verses-application.mjs` | `FUApplication` (inherits `Application`) | Rewrite as `ApplicationV2` | High |
| `module/documents/items/classFeature/gourmet/cooking-application.mjs` | `FUApplication` (inherits `Application`) | Rewrite as `ApplicationV2` | High |
| `module/documents/items/classFeature/invoker/game-wellspring-manager.mjs` | `FUApplication` (inherits `Application`) | Rewrite as `ApplicationV2` | High |
| `module/documents/items/classFeature/invoker/invocation-selection-application.mjs` | `FUApplication` (inherits `Application`) | Rewrite as `ApplicationV2` | High |
| `module/enrichers/inline-effect-configuration.mjs` | `FUApplication` (inherits `Application`) | Rewrite as `ApplicationV2` | High |
| `module/helpers/equipment-handler.mjs` | `FUApplication` (inherits `Application`) | Rewrite as `ApplicationV2` | High |
| `module/helpers/item-customizer.mjs` | `FUApplication` (inherits `Application`) | Rewrite as `ApplicationV2` | High |
| `module/ui/advancement-browser.mjs` | `FUApplication` (inherits `Application`) | Rewrite as `ApplicationV2` | High |
| `module/ui/compendium/compendium-browser.mjs` | `FUApplication` (inherits `Application`) | Rewrite as `ApplicationV2` | High |
| `module/ui/metacurrency/MetaCurrencyTrackerApplication.mjs` | `FUApplication` (inherits `Application`) | Rewrite as `ApplicationV2` | High |
| `module/ui/npc-profile.mjs` | `FUApplication` (inherits `Application`) | Rewrite as `ApplicationV2` | High |
| `module/ui/themes/theme-menu.mjs` | `FUApplication` (inherits `Application`) | Rewrite as `ApplicationV2` | High |
| `module/ui/pressureGauges/modern-pressure-gauge.mjs` | `canvas.stage.scale` — Foundry canvas API | Verify `canvas.stage` access pattern is unchanged in v14; update if broken | Medium |
| `module/ui/pressureGauges/pixel-pressure-gauge.mjs` | `canvas.stage.scale` — Foundry canvas API | Verify `canvas.stage` access pattern is unchanged in v14; update if broken | Medium |
| `module/ui/pressureGauges/pressure-gauge.mjs` | `canvas.stage.scale` — Foundry canvas API | Verify `canvas.stage` access pattern is unchanged in v14; update if broken | Medium |
