export const BRANDS = {
    solimaq: {
        id: 'solimaq',
        name: 'Solimaq',
        label: 'Solimaq Center',
        colors: {
            // #9BD428 -> HSL(80, 69%, 49%)
            primary: '80 69% 49%',
            // #258C28 -> HSL(122, 58%, 35%)
            secondary: '122 58% 35%',
            // White text on green
            primaryForeground: '0 0% 100%',
        },
        // Default logo path (can be overridden by quotation.logo)
        defaultLogo: '/solimaq_logo.png'
    },
    solifood: {
        id: 'solifood',
        name: 'Solifood',
        label: 'Solifood Industrial',
        colors: {
            primary: '48 96% 53%',
            secondary: '38 92% 50%',
            primaryForeground: '222.2 47.4% 11.2%',
        },
        defaultLogo: '/solifood-logo.png'
    },
    smq: {
        id: 'smq',
        name: 'SMQ',
        label: 'SMQ Engineering',
        colors: {
            primary: '215 100% 50%',
            secondary: '215 100% 30%',
            primaryForeground: '0 0% 100%',
        },
        defaultLogo: '/smq-logo.png'
    },
    msw: {
        id: 'msw',
        name: 'MSW',
        label: 'MSW Industrial',
        colors: {
            primary: '0 100% 50%', // Red as placeholder if not defined
            secondary: '0 100% 30%',
            primaryForeground: '0 0% 100%',
        },
        defaultLogo: '/msw-logo.png'
    }
};

export const DEFAULT_BRAND = 'solimaq';
