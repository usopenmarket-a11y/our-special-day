import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Add error handler for unhandled errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Display error in console for debugging
  if (event.error) {
    console.error('Error stack:', event.error.stack);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Initialize i18n - import it but don't block rendering if it fails
import("./i18n/config").catch((err) => {
  console.error('Failed to initialize i18n:', err);
  // App should still work without i18n - components will use fallback text
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  // Create a fallback error display
  document.body.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; text-align: center; font-family: system-ui, sans-serif;">
      <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #dc2626;">Critical Error</h1>
      <p style="margin-bottom: 1rem; color: #6b7280;">Root element not found. Please check the HTML structure.</p>
    </div>
  `;
  throw new Error("Root element not found");
}

// Render with error boundary
try {
  const root = createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  rootElement.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; text-align: center; font-family: system-ui, sans-serif; background-color: #ffffff;">
      <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #dc2626;">Failed to Load</h1>
      <p style="margin-bottom: 1rem; color: #6b7280;">${error instanceof Error ? error.message : 'Unknown error occurred'}</p>
      <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background-color: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem;">Reload Page</button>
      <details style="margin-top: 2rem; text-align: left; max-width: 800px;">
        <summary style="cursor: pointer; color: #6b7280;">Error Details</summary>
        <pre style="margin-top: 1rem; padding: 1rem; background-color: #f3f4f6; border-radius: 0.5rem; overflow: auto; font-size: 0.875rem;">
          ${error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}
        </pre>
      </details>
    </div>
  `;
}
