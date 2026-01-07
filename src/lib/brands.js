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
            // #FFC107 (Amber) or similar from image. 
            // Using a vibrant yellow/orange: #FBBF24 (Amber 400) -> 38 92% 56%
            // Let's try #FACC15 (Yellow 400) -> 48 96% 53%
            primary: '48 96% 53%',
            // Darker accent
            secondary: '38 92% 50%',
            // Dark text on yellow for readability
            primaryForeground: '222.2 47.4% 11.2%',
        },
        defaultLogo: '/solifood-logo.png'
    }
};

export const DEFAULT_BRAND = 'solimaq';
