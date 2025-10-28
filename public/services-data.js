// Shared services data for Servicii and Configurator pages
export const servicesData = [
    {
        id: 'spalare-completa',
        title: 'Spălare Completă',
        category: 'Exterior',
        price: 80,
        priceText: 'De la 80 RON',
        duration: '45-60 minute',
        image: '/assets/car_detailing_carefree_arizona.webp',
        shortDescription: 'Spălare profesională exterioară completă',
        configuratorParam: 'spalare-exterior'
    },
    {
        id: 'curatare-profunda',
        title: 'Curățare Profundă',
        category: 'Interior',
        price: 120,
        priceText: 'De la 120 RON',
        duration: '60-90 minute',
        image: '/assets/P90449718-the-natural-leather-variants-castanea-pictured-and-amido-that-are-currently-available-as-options-in--600px.jpg',
        shortDescription: 'Curățare completă a interiorului',
        configuratorParam: 'curatare-interior'
    },
    {
        id: 'protectie-ceramica',
        title: 'Protecție Ceramică',
        category: 'Premium',
        price: 400,
        priceText: 'De la 400 RON',
        duration: '3-4 ore',
        image: '/assets/auburn-wa-usa-august-5-260nw-2188152971.webp',
        shortDescription: 'Coating ceramic profesional',
        configuratorParam: 'protectie-ceramica'
    },
    {
        id: 'polish-faruri',
        title: 'Polish Faruri',
        category: 'Exterior',
        price: 100,
        priceText: 'De la 100 RON',
        duration: '30-45 minute',
        image: '/assets/rs=h_1000,cg_true.webp',
        shortDescription: 'Restaurare faruri mătuite',
        configuratorParam: 'polish-faruri'
    },
    {
        id: 'curatare-tapiterie',
        title: 'Curățare Tapițerie',
        category: 'Interior',
        price: 150,
        priceText: 'De la 150 RON',
        duration: '90-120 minute',
        image: '/assets/P90449718-the-natural-leather-variants-castanea-pictured-and-amido-that-are-currently-available-as-options-in--600px.jpg',
        shortDescription: 'Curățare profundă tapițerie',
        configuratorParam: 'curatare-interior',
        extras: 'tapiterie'
    },
    {
        id: 'curatare-motor',
        title: 'Curățare Motor',
        category: 'Exterior',
        price: 80,
        priceText: 'De la 80 RON',
        duration: '30-45 minute',
        image: '/assets/car_detailing_carefree_arizona.webp',
        shortDescription: 'Degreasing compartiment motor',
        configuratorParam: 'curatare-motor'
    },
    {
        id: 'tratament-piele',
        title: 'Tratament Piele',
        category: 'Interior',
        price: 200,
        priceText: 'De la 200 RON',
        duration: '120-150 minute',
        image: '/assets/P90449718-the-natural-leather-variants-castanea-pictured-and-amido-that-are-currently-available-as-options-in--600px.jpg',
        shortDescription: 'Îngrijire specializată piele',
        configuratorParam: 'curatare-interior',
        extras: 'piele'
    },
    {
        id: 'detailing-jante',
        title: 'Detailing Jante',
        category: 'Exterior',
        price: 50,
        priceText: 'De la 50 RON',
        duration: '45-60 minute',
        image: '/assets/auburn-wa-usa-august-5-260nw-2188152971.webp',
        shortDescription: 'Curățare și protecție jante',
        configuratorParam: 'spalare-exterior',
        extras: 'jante'
    },
    {
        id: 'eliminare-mirosuri',
        title: 'Eliminare Mirosuri',
        category: 'Interior',
        price: 100,
        priceText: 'De la 100 RON',
        duration: '60-90 minute',
        image: '/assets/car_detailing_carefree_arizona.webp',
        shortDescription: 'Tratament cu ozon',
        configuratorParam: 'curatare-interior',
        extras: 'ozon'
    },
    {
        id: 'detailing-complet',
        title: 'Detailing Complet',
        category: 'Premium',
        price: 500,
        priceText: 'De la 500 RON',
        duration: '4-6 ore',
        image: '/assets/auburn-wa-usa-august-5-260nw-2188152971.webp',
        shortDescription: 'Pachet complet premium',
        configuratorParam: 'complet',
        isPackage: true
    },
    {
        id: 'corectie-vopsea',
        title: 'Corecție Vopsea',
        category: 'Premium',
        price: 300,
        priceText: 'De la 300 RON',
        duration: '3-5 ore',
        image: '/assets/car_detailing_carefree_arizona.webp',
        shortDescription: 'Eliminare zgârieturi și swirl marks',
        configuratorParam: 'protectie-ceramica',
        extras: 'corectie'
    },
    {
        id: 'ingrijire-sezoniera',
        title: 'Îngrijire Sezonieră',
        category: 'Premium',
        price: 150,
        priceText: 'De la 150 RON',
        duration: '90-120 minute',
        image: '/assets/rs=h_1000,cg_true.webp',
        shortDescription: 'Program adaptat sezonului',
        configuratorParam: 'spalare-exterior',
        configuratorParam2: 'curatare-interior'
    }
];

// Helper function to get service by ID
export function getServiceById(id) {
    return servicesData.find(service => service.id === id);
}

// Helper function to get services by category
export function getServicesByCategory(category) {
    return servicesData.filter(service => service.category === category);
}

// Helper function to get all categories
export function getCategories() {
    return [...new Set(servicesData.map(service => service.category))];
}
