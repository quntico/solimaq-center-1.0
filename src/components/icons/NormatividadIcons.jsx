import React from 'react';

// Common props for consistency with Lucide and previous custom icons
const defaultProps = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
};

// NOM-001 / NOM-029 / IEC-60204 (Electrical Safety)
export const ElectricalSafety = (props) => (
    <svg {...defaultProps} {...props}>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M12 7v6l-2-1" />
        <path d="M12 13l2-1" />
        <circle cx="12" cy="18" r="1.5" />
        <path d="M9 2h6" />
    </svg>
);

// NOM-004 / ISO-12100 (Machinery Safety)
export const MachineSafety = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
    </svg>
);

// NOM-006 (Material Handling)
export const MaterialHandling = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M10 21v-9H3l4-4M10 21h4M14 21v-4h7l-4-4" />
        <rect x="8" y="3" width="8" height="8" rx="1" />
    </svg>
);

// NOM-009 (Height Works)
export const HeightWork = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M6 3v18M18 3v18M6 7h12M6 12h12M6 17h12" />
        <path d="M10 3l2 2 2-2" />
    </svg>
);

// NOM-017 (PPE - Hard Hat style)
export const PPESafety = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M2 18h20" />
        <path d="M4 18v-3a8 8 0 0 1 16 0v3" />
        <path d="M12 7v4" />
    </svg>
);

// ISO 9001 (Quality Management)
export const ISO9001 = (props) => (
    <svg {...defaultProps} {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
        <text x="6" y="21" fontSize="5" fontWeight="bold" fill="currentColor" stroke="none">ISO 9001</text>
    </svg>
);

// ISO 14001 (Environmental)
export const ISO14001 = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8h-5.07A7 7 0 0 1 11 20z" />
        <path d="M11 20a7 7 0 0 0 7-7" />
    </svg>
);

// CE Mark
export const CEMark = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M9 16.5a4.5 4.5 0 1 1 0-9M12 12h3M21 16.5a4.5 4.5 0 1 1 0-9" />
    </svg>
);

// UL Mark
export const ULMark = (props) => (
    <svg {...defaultProps} {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 8v4a2 2 0 0 0 4 0V8M14 8v8h4" />
    </svg>
);

// IP65 (Protection)
export const IP65Protection = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        <circle cx="12" cy="13.5" r="3" />
    </svg>
);

export const normatividadIcons = {
    ElectricalSafety,
    MachineSafety,
    MaterialHandling,
    HeightWork,
    PPESafety,
    ISO9001,
    ISO14001,
    CEMark,
    ULMark,
    IP65Protection
};
