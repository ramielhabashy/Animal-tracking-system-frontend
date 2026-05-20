import React, { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
    return (
      <div className="p-4 text-center">
        <h5>Something went wrong</h5>
        <p className="text-[#666] mb-4">
          {this.state.error?.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={this.handleReset}
          className="px-4 py-2 rounded-lg border-0 bg-brand-secondary text-white cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
    }

    return this.props.children;
  }
}

export class ErrorBoundaryRoute extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Route error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <h5>Page failed to load</h5>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg border-0 bg-brand-secondary text-white cursor-pointer">
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

