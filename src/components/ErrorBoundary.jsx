import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center p-4 z-[9999] overflow-auto text-center">
                    <h1 className="text-3xl font-bold text-red-500 mb-4">Algo salió mal</h1>
                    <p className="text-lg mb-4">La aplicación ha encontrado un error crítico.</p>
                    <div className="bg-gray-900 p-4 rounded-md border border-gray-800 max-w-2xl w-full text-left overflow-x-auto">
                        <pre className="text-red-400 font-mono text-sm whitespace-pre-wrap">
                            {this.state.error && this.state.error.toString()}
                        </pre>
                        <div className="mt-4 text-gray-500 text-xs font-mono whitespace-pre-wrap">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-8 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
                    >
                        Recargar Página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
