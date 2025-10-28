# Services Data Integration

## Overview
The Servicii and Configurator pages are now linked through a shared data source (`services-data.js`). This ensures consistency across both pages and makes updates easier.

## How It Works

### Shared Data Source
- **File**: `public/services-data.js`
- Contains all service information (titles, prices, descriptions, images, etc.)
- Exported as ES6 module for use in both pages

### Servicii Page
- **Location**: `public/servicii.html`
- Currently uses static HTML cards (lines 134-395)
- Imports `services-data.js` for reference and future dynamic rendering
- Service cards link to Configurator with URL parameters

### Configurator Page
- **Location**: `public/configurator.html`
- Displays compact service cards dynamically loaded from `services-data.js`
- Grid of 12 small cards showing all services (line 151)
- Clicking a card pre-selects that service in the configurator

## Updating Services

To update service information (prices, titles, descriptions, etc.):

1. **Edit** `public/services-data.js`
2. Update the relevant service object in the `servicesData` array
3. Changes will automatically appear in:
   - Configurator compact cards (dynamic)
   - Service modals (both pages)
   - Future: Servicii page cards (when converted to dynamic rendering)

## Service Data Structure

```javascript
{
    id: 'spalare-completa',              // Unique identifier
    title: 'Spălare Completă',           // Display name
    category: 'Exterior',                // Service category
    price: 80,                           // Base price (RON)
    priceText: 'De la 80 RON',          // Formatted price text
    duration: '45-60 minute',            // Service duration
    image: '/assets/...',                // Card background image
    shortDescription: '...',             // Brief description
    configuratorParam: 'spalare-exterior', // URL parameter for configurator
    extras: 'jante' (optional)           // Additional service parameters
}
```

## Integration Features

1. **URL Parameters**: Services link to Configurator with specific parameters
   - Example: `?service=spalare-exterior`
   - Example: `?service=curatare-interior&extras=tapiterie`

2. **Breadcrumb Navigation**: Both pages show navigation path
   - Acasă > Servicii > Configurator

3. **Visual Links**:
   - Servicii has CTA buttons to jump to Configurator
   - Configurator has info banner linking back to Servicii

4. **Pre-selection**: Clicking service cards pre-selects them in Configurator

## Future Improvements

- [ ] Convert Servicii page cards to dynamic rendering from `services-data.js`
- [ ] Add real-time price calculator integration
- [ ] Sync service availability status
- [ ] Add service comparison feature
