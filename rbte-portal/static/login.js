'use strict';

const form = document.getElementById('portal-login');
if (form) {
  let pending = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending) return;
    pending = true;
    const button = form.querySelector('button[type="submit"]');
    const status = document.getElementById('login-status');
    const reload = document.getElementById('login-reload');
    button.disabled = true;
    status.textContent = 'Вход…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        mode: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
      });
      // An existing session can make LoginView redirect before validating a form.
      if (response.ok && response.redirected) {
        const target = new URL(response.url);
        if (target.origin !== location.origin) throw new Error('Invalid redirect');
        location.assign(target.href);
        return;
      }
      if (response.status === 403) {
        status.textContent = 'Страница входа устарела. Откройте её заново для продолжения.';
        reload.hidden = false;
        return; // Do not resubmit credentials or reuse a stale CSRF token.
      }
      if (response.status === 429) {
        status.textContent = 'Слишком много попыток. Повторите через 10 минут.';
      } else {
        const result = await response.json();
        if (response.ok && typeof result.redirect === 'string') {
          const target = new URL(result.redirect, location.origin);
          if (target.origin !== location.origin) throw new Error('Invalid redirect');
          location.assign(target.href);
          return;
        }
        if (response.status !== 400) throw new Error('Unexpected response');
        status.textContent = result.error;
      }
      pending = false;
      button.disabled = false;
    } catch {
      // The server may already have accepted the password. Never repeat the POST.
      status.textContent = 'Не удалось получить результат входа. Откройте страницу заново, чтобы проверить вход.';
      reload.hidden = false;
    } finally {
      clearTimeout(timeout);
    }
  });
}
