
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component to catch JavaScript errors anywhere in their child
 * component tree, log those errors, and display a fallback UI instead of the
 * component tree that crashed.
 */
// Fix: Explicitly importing and extending Component from 'react' with Props and State generics 
// ensures that TypeScript correctly recognizes 'this.props' and 'this.state' within the class.
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    // Initialize state within the constructor.
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    // Check component state to determine if an error should be displayed
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center">
            <div className="mx-auto bg-red-100 dark:bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="text-red-600 dark:text-red-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              We encountered an unexpected error. Our team has been notified.
            </p>
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg text-left mb-6 overflow-auto max-h-32">
                <code className="text-xs text-red-500 font-mono">
                    {this.state.error?.message}
                </code>
            </div>
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw size={16} className="mr-2" /> Reload Application
            </Button>
          </div>
        </div>
      );
    }

    // Access the children prop to render the component tree when no error is caught
    return this.props.children;
  }
}
