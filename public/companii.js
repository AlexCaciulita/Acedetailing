const form = document.querySelector('[data-b2b-form]');
const status = document.querySelector('[data-b2b-status]');
const submitButton = form?.querySelector('button[type="submit"]');

function setStatus(message, state = '') {
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!form.reportValidity()) return;

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  payload.privacy = formData.get('privacy') === 'on';

  submitButton.disabled = true;
  submitButton.setAttribute('aria-busy', 'true');
  setStatus('Trimitem solicitarea…', 'loading');

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('/api/create-b2b-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Solicitarea nu a putut fi trimisă.');
    }

    form.reset();
    setStatus(data.message, 'success');
    status?.focus();
  } catch (error) {
    const message = error.name === 'AbortError'
      ? 'Serverul răspunde greu. Te rugăm să încerci din nou sau să ne suni.'
      : error.message;
    setStatus(message, 'error');
    status?.focus();
  } finally {
    window.clearTimeout(timeout);
    submitButton.disabled = false;
    submitButton.removeAttribute('aria-busy');
  }
});
