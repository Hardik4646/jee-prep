import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info.componentStack);
  }

  handleRecover = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="card p-6 my-4 flex flex-col items-center justify-center text-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--danger-bg)', border: '1px solid rgba(244,63,94,0.25)' }}
          >
            <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <h3 className="card-title">
              {this.props.fallbackLabel || 'Module encountered an unexpected error'}
            </h3>
            <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-tertiary)' }}>
              {this.state.errorMessage}
            </p>
          </div>
          <button onClick={this.handleRecover} className="btn-ghost mt-2">
            <RotateCcw size={13} />
            Retry View
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
