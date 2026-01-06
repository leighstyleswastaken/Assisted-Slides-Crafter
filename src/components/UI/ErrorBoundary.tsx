import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Fixed: Explicitly extending React.Component to resolve property errors for setState and props
class ErrorBoundary extends React.Component<Props, State> {
  // Fixed: Initializing state within the constructor to ensure it's correctly linked to the component instance
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    // Fixed: Correctly accessing the inherited setState method from React.Component
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-red-900/20 p-6 rounded-full mb-6 ring-4 ring-red-900/10">
            <AlertTriangle size={64} className="text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Something went wrong</h1>
          <p className="text-gray-400 max-w-md mb-8">
            The application encountered an unexpected error. We've logged this issue.
          </p>
          
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-8 max-w-lg w-full text-left overflow-auto max-h-40">
            <code className="text-xs font-mono text-red-300">
                {this.state.error?.message || 'Unknown Error'}
            </code>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={this.handleReset}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded font-bold transition-colors"
            >
              Try Again
            </button>
            <button 
              onClick={this.handleReload}
              className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-colors flex items-center gap-2"
            >
              <RefreshCw size={18} /> Reload App
            </button>
          </div>
        </div>
      );
    }

    // Fixed: Correctly accessing the inherited props from React.Component
    return this.props.children;
  }
}

export default ErrorBoundary;
