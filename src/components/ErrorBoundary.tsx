import React, { Component, ErrorInfo, ReactNode } from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';

interface Props extends WithTranslation {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { t, i18n } = this.props;
    const isRTL = i18n.language === 'ar';

    if (this.state.hasError) {
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
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#dc2626' }}>
            {t('error.somethingWentWrong')}
          </h1>
          <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
            {this.state.error?.message || t('error.unexpectedError')}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            {t('error.reloadPage')}
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '2rem', textAlign: isRTL ? 'right' : 'left', maxWidth: '800px' }}>
              <summary style={{ cursor: 'pointer', color: '#6b7280' }}>{t('error.errorDetails')}</summary>
              <pre style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '0.5rem',
                overflow: 'auto',
                fontSize: '0.875rem',
                direction: 'ltr', // Keep code in LTR
                textAlign: 'left',
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryClass);

