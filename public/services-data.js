// Ace Detailing - Shared services data for Servicii, Configurator, and Rezervare pages

export const packages = [
    {
        id: 'essential-interior',
        name: 'ESSENTIAL Interior',
        tier: 'essential',
        priceRange: { min: 800, max: 1200 },
        duration: '3-4 ore',
        image: '/assets/P90449718-the-natural-leather-variants-castanea-pictured-and-amido-that-are-currently-available-as-options-in--600px.jpg',
        shortDescription: 'Curatare completa a interiorului cu atentie la fiecare detaliu.',
        included: [
            'Aspirare completa (scaune, covorase, portbagaj)',
            'Curatare si degresare plastic/vinil',
            'Curatare geamuri interior',
            'Curatare bord si consola centrala',
            'Dezinfectare cu ozon',
            'Parfumare profesionala',
            'Curatare praguri usi'
        ],
        notIncluded: [
            'Curatare tapiterie cu extractie',
            'Tratament piele',
            'Curatare plafon'
        ]
    },
    {
        id: 'essential-exterior',
        name: 'ESSENTIAL Exterior',
        tier: 'essential',
        priceRange: { min: 800, max: 1200 },
        duration: '3-4 ore',
        image: '/assets/car_detailing_carefree_arizona.webp',
        shortDescription: 'Spalare profesionala si protectie de baza pentru exterior.',
        included: [
            'Pre-spalare si spalare metoda 2-bucket',
            'Decontaminare chimica (iron remover, tar remover)',
            'Curatare jante si anvelope',
            'Uscare profesionala cu aer',
            'Aplicare ceara sau sealant',
            'Dressing anvelope',
            'Curatare geamuri exterior'
        ],
        notIncluded: [
            'Polish corectiv',
            'Protectie ceramica',
            'Decontaminare cu clay bar'
        ]
    },
    {
        id: 'premium-complet',
        name: 'PREMIUM Complet',
        tier: 'premium',
        priceRange: { min: 2500, max: 3500 },
        duration: '1-2 zile',
        image: '/assets/auburn-wa-usa-august-5-260nw-2188152971.webp',
        shortDescription: 'Interior + Exterior complet cu polish si protectie ceramica.',
        popular: true,
        included: [
            'Tot din ESSENTIAL Interior',
            'Tot din ESSENTIAL Exterior',
            'Decontaminare clay bar',
            'Polish corectiv 2 pasi (cut + finish)',
            'Protectie ceramica 1 strat (12 luni garantie)',
            'Curatare tapiterie cu extractie',
            'Tratament plastic exterior',
            'Curatare compartiment motor (basic)'
        ],
        notIncluded: [
            'Polish 3 pasi',
            'Ceramica 2 straturi',
            'Tratament piele premium'
        ]
    },
    {
        id: 'signature-full',
        name: 'SIGNATURE Full',
        tier: 'signature',
        priceRange: { min: 4500, max: 6000 },
        duration: '2-3 zile',
        image: '/assets/image.png',
        shortDescription: 'Transformare completa. Cel mai complet pachet de detailing.',
        included: [
            'Tot din PREMIUM Complet',
            'Polish corectiv 3 pasi (heavy cut + cut + finish)',
            'Protectie ceramica 2 straturi (24 luni garantie)',
            'Tratament piele premium (curatare + hidratare + protectie)',
            'Detailing complet compartiment motor',
            'Curatare plafon',
            'Instructiuni personalizate de mentenanta',
            'Inspectie de control dupa 30 zile (gratis)'
        ],
        notIncluded: []
    }
];

export const maintenancePlans = [
    {
        id: 'abonament-lunar',
        name: 'Abonament Lunar',
        priceRange: { min: 300, max: 500 },
        period: 'luna',
        description: 'Mentenanta lunara profesionala pentru a pastra masina impecabila.',
        included: [
            'Spalare profesionala completa',
            'Aspirare si curatare rapida interior',
            'Protectie rapida exterior (quick detailer)',
            'Check-up stare vopsea si protectie'
        ]
    },
    {
        id: 'vip-anual',
        name: 'VIP Anual',
        priceRange: { min: 6000, max: 9000 },
        period: 'an',
        bestValue: true,
        description: 'Pachetul complet de ingrijire anuala. Fara griji, fara surprize.',
        included: [
            '2x Pachet SIGNATURE Full pe an',
            'Mentenanta lunara inclusa (12 vizite)',
            'Programare prioritara',
            'Discount 15% la orice serviciu extra',
            'Inspectii trimestriale gratuite'
        ]
    }
];

export const addons = [
    { id: 'polish-faruri', name: 'Polish Faruri', price: 150, duration: '30-45 min', description: 'Restaurare faruri matuite si ingalbenite.' },
    { id: 'curatare-motor', name: 'Curatare Motor Detaliata', price: 300, duration: '60-90 min', description: 'Degresare si protectie completa compartiment motor.' },
    { id: 'tratament-piele', name: 'Tratament Piele', price: 400, duration: '90-120 min', description: 'Curatare, hidratare si protectie piele naturala/sintetica.' },
    { id: 'eliminare-mirosuri', name: 'Eliminare Mirosuri (Ozon)', price: 200, duration: '60 min', description: 'Tratament ozon pentru eliminarea mirosurilor persistente.' },
    { id: 'curatare-tapiterie', name: 'Curatare Tapiterie Extractie', price: 300, duration: '90-120 min', description: 'Curatare profunda cu extractie textil si uscare rapida.' },
    { id: 'detailing-jante', name: 'Detailing Jante Premium', price: 200, duration: '60 min', description: 'Curatare, decontaminare si protectie ceramica jante.' },
    { id: 'corectie-vopsea', name: 'Corectie Vopsea (per panou)', price: 250, duration: '60-90 min', description: 'Eliminare zgarieturi si swirl marks de pe un singur panou.' },
    { id: 'ppf-consult', name: 'Consultanta PPF', price: 0, duration: '30 min', description: 'Consultatie gratuita pentru folie de protectie vopsea (PPF).' }
];

export const sizeMultipliers = {
    mica: { label: 'Mica (Smart, Mini, Up)', multiplier: 0.85 },
    compacta: { label: 'Compacta (Golf, Focus, Corolla)', multiplier: 0.95 },
    sedan: { label: 'Sedan / Coupe (Seria 3, C-Class, A4)', multiplier: 1.0 },
    suv: { label: 'SUV / Van (X5, GLC, Q7, Touareg)', multiplier: 1.2 }
};

export const conditionMultipliers = {
    perfect: { label: 'Perfecta (masina noua / recent detailata)', multiplier: 0.9 },
    usoara: { label: 'Usoara (utilizare normala, curata)', multiplier: 1.0 },
    medie: { label: 'Medie (murdarie vizibila, cateva luni)', multiplier: 1.1 },
    grea: { label: 'Grea (foarte murdara, neglijata)', multiplier: 1.25 }
};

// Helper functions
export function getPackageById(id) {
    return packages.find(p => p.id === id);
}

export function getAddonById(id) {
    return addons.find(a => a.id === id);
}

export function calculatePrice(packageId, sizeKey, conditionKey) {
    const pkg = getPackageById(packageId);
    if (!pkg) return null;
    const sizeMult = sizeMultipliers[sizeKey]?.multiplier || 1.0;
    const condMult = conditionMultipliers[conditionKey]?.multiplier || 1.0;
    return {
        min: Math.round(pkg.priceRange.min * sizeMult * condMult),
        max: Math.round(pkg.priceRange.max * sizeMult * condMult)
    };
}
