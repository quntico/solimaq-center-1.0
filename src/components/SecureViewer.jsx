import React, { useEffect, useState } from 'react';

const SecureViewer = () => {
    const [url, setUrl] = useState(null);

    useEffect(() => {
        // Read URL from query parameter
        const params = new URLSearchParams(window.location.search);
        const urlParam = params.get('url');
        if (urlParam) {
            setUrl(decodeURIComponent(urlParam));
        }
    }, []);

    if (!url) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Documento no disponible</h1>
                    <p className="text-gray-400">La sesión del documento ha expirado o es inválida.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-screen bg-black overflow-hidden relative">
            {/* Security overlay for window title if needed, though browser handles this */}
            <iframe
                src={url}
                className="w-full h-full border-0"
                title="Secure Document"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />

            {/* Optional: Add a close/home button overlay if this opens in same tab, 
                but typically this will be a new tab so browser chrome is enough */}
        </div>
    );
};

export default SecureViewer;
