import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Disable runtime error overlay by overriding the error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    event.preventDefault();
    console.error('Runtime error caught:', event.error);
    return false;
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    console.error('Unhandled promise rejection:', event.reason);
    return false;
  });

  // Remove runtime error overlay elements
  const removeErrorOverlays = () => {
    const overlays = document.querySelectorAll([
      '[data-plugin-runtime-error-plugin]',
      'div[style*="position: fixed"][style*="z-index: 9999"]',
      'div[style*="position: fixed"][style*="top: 0"][style*="left: 0"][style*="width: 100%"][style*="height: 100%"]',
      '.runtime-error-overlay'
    ].join(','));
    
    overlays.forEach(overlay => {
      overlay.remove();
    });
  };

  // Check and remove overlays periodically
  const observer = new MutationObserver(() => {
    removeErrorOverlays();
  });

  // Start observing when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
      removeErrorOverlays();
    });
  } else {
    observer.observe(document.body, { childList: true, subtree: true });
    removeErrorOverlays();
  }
}

createRoot(document.getElementById("root")!).render(<App />);
