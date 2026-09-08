/* ==========================================================================
   InviteDaddy — callback modal
   --------------------------------------------------------------------------
   Usage on any page:
     1. Give the CTA button the data attribute:
        <button type="button" class="btn btn-gold" data-callback-modal>Request a Callback</button>
     2. Load this file once, before </body>:
        <script src="/callback-modal.js" defer></script>

   Optional per-button overrides:
     data-cb-title="Request a callback"
     data-cb-intro="Leave your details and we'll get back to you."

   Submissions go to Netlify Forms under the form name "callback".
   The static detection stub lives in /forms/callback.html — keep field names
   in sync with the markup below.
   ========================================================================== */
(function () {
  'use strict';

  var FORM_NAME = 'callback';
  var overlay = null;
  var lastFocused = null;

  function encode(data) {
    return Object.keys(data)
      .map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
      })
      .join('&');
  }

  function build() {
    var el = document.createElement('div');
    el.className = 'cb-overlay';
    el.hidden = true;
    el.innerHTML = [
      '<div class="cb-dialog" role="dialog" aria-modal="true" aria-labelledby="cb-title">',
      '  <button type="button" class="cb-close" data-cb-close aria-label="Close">&#10005;</button>',
      '  <form name="' + FORM_NAME + '" method="POST" data-netlify="true" data-netlify-honeypot="bot-field" novalidate>',
      '    <h2 id="cb-title">Request a callback</h2>',
      '    <p class="cb-intro">Leave your details and one of our consultants will get back to you shortly.</p>',
      '    <input type="hidden" name="form-name" value="' + FORM_NAME + '">',
      '    <input type="hidden" name="page" value="">',
      '    <p class="cb-hp"><label>Do not fill this in: <input type="text" name="bot-field" tabindex="-1" autocomplete="off"></label></p>',
      '    <label class="cb-field" for="cb-name">Name <span aria-hidden="true">*</span></label>',
      '    <input type="text" id="cb-name" name="name" required autocomplete="name">',
      '    <label class="cb-field" for="cb-contact">Phone or email <span aria-hidden="true">*</span></label>',
      '    <input type="text" id="cb-contact" name="contact" required autocomplete="tel">',
      '    <label class="cb-field" for="cb-message">Comment <span class="cb-optional">(optional)</span></label>',
      '    <textarea id="cb-message" name="message" rows="4"></textarea>',
      '    <button type="submit" class="btn btn-navy">Send Request</button>',
      '    <p class="cb-note">We use your details only to contact you about your enquiry. See our <a href="/privacy-policy.html">Privacy Policy</a>.</p>',
      '  </form>',
      '  <div class="cb-done" data-cb-done hidden>',
      '    <h2 tabindex="-1">Thank you!</h2>',
      '    <p>We have received your request and will contact you shortly.</p>',
      '  </div>',
      '</div>'
    ].join('\n');
    document.body.appendChild(el);

    var form = el.querySelector('form');
    var done = el.querySelector('[data-cb-done]');
    var submit = form.querySelector('button[type="submit"]');

    el.addEventListener('click', function (e) {
      if (e.target === el || e.target.hasAttribute('data-cb-close')) close();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var prevError = form.querySelector('.cb-error');
      if (prevError) prevError.remove();

      var data = {};
      new FormData(form).forEach(function (value, key) { data[key] = value; });

      submit.disabled = true;
      submit.textContent = 'Sending…';

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encode(data)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          form.hidden = true;
          done.hidden = false;
          done.querySelector('h2').focus();
        })
        .catch(function () {
          var p = document.createElement('p');
          p.className = 'cb-error';
          p.textContent =
            'Sorry, we could not send your request. Please try again, or email us at info@invitedaddy.ie.';
          form.appendChild(p);
        })
        .then(function () {
          submit.disabled = false;
          submit.textContent = 'Send Request';
        });
    });

    return el;
  }

  function onKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') close();
  }

  function open(trigger) {
    if (!overlay) overlay = build();

    var dialog = overlay.querySelector('.cb-dialog');
    var form = overlay.querySelector('form');
    var title = overlay.querySelector('#cb-title');
    var intro = overlay.querySelector('.cb-intro');

    if (trigger) {
      if (trigger.dataset.cbTitle) title.textContent = trigger.dataset.cbTitle;
      if (trigger.dataset.cbIntro) intro.textContent = trigger.dataset.cbIntro;
    }
    form.querySelector('input[name="page"]').value = location.pathname;

    lastFocused = document.activeElement;
    overlay.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeydown);
    (form.hidden ? dialog.querySelector('[data-cb-close]') : form.querySelector('#cb-name')).focus();
  }

  function close() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', onKeydown);
    if (lastFocused) lastFocused.focus();
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-callback-modal]');
    if (!trigger) return;
    e.preventDefault();
    open(trigger);
  });
})();
