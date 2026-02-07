import { packages, maintenancePlans, addons, sizeMultipliers, conditionMultipliers, getPackageById, getAddonById, calculatePrice } from './services-data.js';

// Expose shared services dataset for the configurator Alpine component
window.configuratorServicesData = { packages, maintenancePlans, addons, sizeMultipliers, conditionMultipliers, getPackageById, getAddonById, calculatePrice };
window.dispatchEvent(new CustomEvent('configurator-services-ready', { detail: window.configuratorServicesData }));
