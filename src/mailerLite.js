let scriptPromise;

export function loadMailerLiteForm(accountId) {
  if (!accountId || !/^\d+$/.test(accountId)) {
    return Promise.reject(new Error('Falta el identificador público de la cuenta MailerLite.'));
  }

  window.ml = window.ml || function mailerLiteQueue() {
    (window.ml.q = window.ml.q || []).push(arguments);
  };
  window.ml('account', accountId);

  if (window.ml.__noticiasGroupLoaded) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://assets.mailerlite.com/js/universal.js';
      script.async = true;
      script.onload = () => {
        window.ml.__noticiasGroupLoaded = true;
        resolve();
      };
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('No se pudo cargar el formulario seguro de MailerLite.'));
      };
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
}
