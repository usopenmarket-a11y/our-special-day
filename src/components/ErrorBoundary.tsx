import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    console.error('Error stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
    
    // Also log to window for easier debugging
    (window as any).__lastError = { error, errorInfo };
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private getTranslations() {
    // Try to get translations from i18n if available
    try {
      const i18n = (window as any).i18n;
      if (i18n && i18n.t) {
        const lang = i18n.language || 'en';
        const isRTL = lang === 'ar';
        return {
          somethingWentWrong: i18n.t('error.somethingWentWrong', { defaultValue: 'Something went wrong' }),
          unexpectedError: i18n.t('error.unexpectedError', { defaultValue: 'An unexpected error occurred' }),
          reloadPage: i18n.t('error.reloadPage', { defaultValue: 'Reload Page' }),
          errorDetails: i18n.t('error.errorDetails', { defaultValue: 'Error Details' }),
          isRTL,
        };
      }
    } catch (e) {
      // i18n not available
    }
    
    // Fallback to English
    return {
      somethingWentWrong: 'Something went wrong',
      unexpectedError: 'An unexpected error occurred',
      reloadPage: 'Reload Page',
      errorDetails: 'Error Details',
      isRTL: false,
    };
  }

  public render() {
    if (this.state.hasError) {
      const translations = this.getTranslations();
      const isRTL = translations.isRTL;
      const errorMessage = this.state.error?.message || translations.unexpectedError;
      const errorStack = this.state.error?.stack || 'No stack trace available';

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          direction: isRTL ? 'rtl' : 'ltr',
          backgroundColor: '#ffffff',
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#dc2626' }}>
            {translations.somethingWentWrong}
          </h1>
          <p style={{ marginBottom: '1rem', color: '#6b7280', maxWidth: '600px' }}>
            {errorMessage}
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem',
              marginBottom: '1rem',
            }}
          >
            {translations.reloadPage}
          </button>
          {/* Always show error details in production for debugging */}
          <details style={{ marginTop: '1rem', textAlign: isRTL ? 'right' : 'left', maxWidth: '800px', width: '100%' }}>
            <summary style={{ cursor: 'pointer', color: '#6b7280', marginBottom: '1rem' }}>{translations.errorDetails}</summary>
            <pre style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#f3f4f6',
              borderRadius: '0.5rem',
              overflow: 'auto',
              fontSize: '0.875rem',
              direction: 'ltr',
              textAlign: 'left',
              maxHeight: '400px',
            }}>
              {errorStack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

