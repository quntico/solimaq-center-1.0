import React from 'react';

// Common props for Lucide-style consistency
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

export const ExtruderMachine = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M2 12h4" />
        <path d="M6 8h10l2 4-2 4H6z" />
        <path d="M18 8v8" />
        <path d="M20 12h2" />
        <circle cx="9" cy="12" r="1" />
        <circle cx="13" cy="12" r="1" />
    </svg>
);

export const Screw = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M22 17a5 5 0 0 0-5-5c-2 0-3 3-5 3s-3-3-5-3-3 3-5 3" />
        <path d="M22 12a5 5 0 0 0-5-5c-2 0-3 3-5 3s-3-3-5-3-3 3-5 3" />
        <path d="M2 7v10" />
        <path d="M22 7v10" />
    </svg>
);

export const DieHeadFlat = (props) => (
    <svg {...defaultProps} {...props}>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M2 12h20" />
        <path d="M12 6v12" />
        <path d="M6 12v-2" />
        <path d="M18 12v-2" />
    </svg>
);

export const DieHeadCircular = (props) => (
    <svg {...defaultProps} {...props}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v6" />
        <path d="M12 16v6" />
        <path d="M2 12h6" />
        <path d="M16 12h6" />
    </svg>
);

export const Hopper = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M4 4h16l-6 10v6h-4v-6z" />
        <path d="M4 4l2 4" />
        <path d="M20 4l-2 4" />
    </svg>
);

export const Rollers = (props) => (
    <svg {...defaultProps} {...props}>
        <circle cx="6" cy="6" r="4" />
        <circle cx="18" cy="6" r="4" />
        <circle cx="6" cy="18" r="4" />
        <circle cx="18" cy="18" r="4" />
        <path d="M10 6h4" />
        <path d="M10 18h4" />
        <path d="M6 10v4" />
        <path d="M18 10v4" />
    </svg>
);

export const Puller = (props) => (
    <svg {...defaultProps} {...props}>
        <rect x="2" y="6" width="20" height="4" rx="1" />
        <rect x="2" y="14" width="20" height="4" rx="1" />
        <path d="M4 10v4" />
        <path d="M20 10v4" />
        <path d="M12 10v4" />
    </svg>
);

export const Cutter = (props) => (
    <svg {...defaultProps} {...props}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M4 12h16" />
        <path d="M12 4v16" />
        <path d="M8 8l8 8" />
    </svg>
);

export const Winder = (props) => (
    <svg {...defaultProps} {...props}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 12l4-4" />
        <path d="M12 12l-4 4" />
        <path d="M12 20v2" />
        <path d="M20 12h2" />
        <path d="M12 4V2" />
        <path d="M4 12H2" />
    </svg>
);

export const ControlPanel = (props) => (
    <svg {...defaultProps} {...props}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 8h8" />
        <path d="M8 12h4" />
        <circle cx="16" cy="16" r="1" />
        <circle cx="12" cy="16" r="1" />
        <circle cx="8" cy="16" r="1" />
    </svg>
);

export const GearBox = (props) => (
    <svg {...defaultProps} {...props}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 8v-2" />
        <path d="M12 18v-2" />
        <path d="M16 12h2" />
        <path d="M6 12h2" />
    </svg>
);

export const Heater = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M4 6h16" />
        <path d="M4 18h16" />
        <path d="M4 6v12" />
        <path d="M20 6v12" />
        <path d="M8 6v12" />
        <path d="M12 6v12" />
        <path d="M16 6v12" />
    </svg>
);

// Map of Custom Icons for easier import
export const customIcons = {
    ExtruderMachine,
    Screw,
    DieHeadFlat,
    DieHeadCircular,
    Hopper,
    Rollers,
    Puller,
    Cutter,
    Winder,
    ControlPanel,
    GearBox,
    Heater
};
