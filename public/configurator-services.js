import { servicesData } from './services-data.js';

// Expose shared services dataset for the configurator Alpine component
window.configuratorServicesData = servicesData;
window.dispatchEvent(new CustomEvent('configurator-services-ready', { detail: servicesData }));
