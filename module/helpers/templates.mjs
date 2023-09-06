/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([

    // Actor partials.
    "systems/fabulaultima/templates/actor/parts/actor-bonds.html",
    "systems/fabulaultima/templates/actor/parts/actor-favorite.html",
    "systems/fabulaultima/templates/actor/parts/actor-features.html",
    "systems/fabulaultima/templates/actor/parts/actor-items.html",
    "systems/fabulaultima/templates/actor/parts/actor-spells.html",
    "systems/fabulaultima/templates/actor/parts/actor-effects.html",
    "systems/fabulaultima/templates/actor/parts/actor-behavior.html",
    "systems/fabulaultima/templates/actor/parts/actor-crafts.html",
    "systems/fabulaultima/templates/actor/parts/actor-settings.html",
    // Item partials
    "systems/fabulaultima/templates/item/parts/item-header.html",
  ]);
};


Handlebars.registerHelper('half', function(value) {
  var num = Number(value);
  if (isNaN(num)) {
    return "";
  }
  return Math.floor(num / 2);
});


Handlebars.registerHelper('affinity', function(affinity, options) {
  // Define an array of objects with the icon and label for each damage type
  var damageTypes = [
    {icon: "fa-solid fa-sword", label: "FU.DamageNormal"},
    {icon: "fa-solid fa-wind", label: "FU.DamageWind"},
    {icon: "fa-solid fa-bolt", label: "FU.DamageLightning"},
    {icon: "fa-solid fa-moon", label: "FU.DamageDark"},
    {icon: "fa-solid fa-hill-rockslide", label: "FU.DamageEarth"},
    {icon: "fa-solid fa-fire icon-aff", label: "FU.DamageFire"},
    {icon: "fa-solid fa-snowflake icon-aff", label: "FU.DamageIce"},
    {icon: "fa-solid fa-sun icon-aff", label: "FU.DamageLight"},
    {icon: "fa-solid fa-skull-crossbones", label: "FU.DamagePoison"}
  ];

  // Initialize an empty string to store the output
  var output = "";

  // Loop through the damage types and the affinity object
  for (var i = 0; i < damageTypes.length; i++) {
    // Get the key and value of the current resistance property
    var key = Object.keys(affinity)[i];
    var value = affinity[key];

    // Create a new context object with the icon, label, name and value
    var context = {
      icon: damageTypes[i].icon,
      label: damageTypes[i].label,
      name: "system.affinity." + key,
      value: value
    };

    // Execute the template block with the new context and append it to the output
    output += options.fn(context);
  }

  // Return the output
  return output;
});

