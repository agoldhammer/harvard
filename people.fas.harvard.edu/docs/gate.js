/* ==========================================================================
   gate.js — the challenge in front of the homepage.

   index.html ships as an empty shell. The page itself lives in content.enc,
   and nothing renders until the visitor answers a question. A crawler that
   fetches the URL and reads the source finds no titles and no mail address:
   it has to run this file to see anything at all.

   Answering also sets a cookie that nginx requires before it will serve
   anything under docs/oeuvrecomplete/, so the articles themselves are behind
   the gate rather than merely behind names a crawler has not learned yet.

   What this is worth: it stops the crawlers and address harvesters that only
   read HTML, which is most of them. It does not stop a headless browser, and
   both the key and the cookie token below are in plain sight. A deterrent,
   not a wall.

   The gate only stands on the public host: on tiny the page opens straight
   away, see GUARDED_HOSTS. Either way the content is fetched over HTTP, so
   opening index.html as a file:// URL now shows nothing.
   ========================================================================== */

(function () {
  'use strict';

  /* Must match KEY in tools/encode-content.py. */
  var KEY = 'une-lecture-attentive';

  var GUARDED_HOSTS = ['art.ghmr.net'];

  /* One answer stands for thirty days. */
  var STORE_KEY = 'ag-gate';
  var TTL = 30 * 24 * 60 * 60 * 1000;

  /* The articles are what the harvesters are actually after, and they sat at
     plain static URLs that the gate never touched: anything holding a path
     could fetch them cold, without ever seeing a question. nginx on the
     public host now serves them only to a request carrying this cookie (see
     artsite.conf), which makes the file names stop mattering.

     The token is in plain sight here, exactly like KEY. A scraper that reads
     this file can forge the cookie; one that does not read it gets nothing.
     The same bargain as the rest of the gate: a deterrent, not a wall. */
  var COOKIE = 'agpass';
  var TOKEN = 'lecture-faite';

  /* Spelled out, so that the arithmetic has to be read rather than pattern
     matched. Answers stay under twenty: see WORDS. */
  var QUESTIONS = [
    ['What is seven plus four?', 11],
    ['What is nine plus three?', 12],
    ['What is six plus eight?', 14],
    ['What is twelve minus five?', 7],
    ['What is three times five?', 15],
    ['What is twenty minus seven?', 13],
    ['What is two times nine?', 18],
    ['What is fifteen minus six?', 9],
    ['What is eleven plus eight?', 19],
    ['What is sixteen minus ten?', 6]
  ];

  /* An answer may be typed either way: 11 or eleven. */
  var WORDS = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
    fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
    nineteen: 19, twenty: 20
  };

  var gate = document.getElementById('gate');
  var page = document.getElementById('page');

  /* ------------------------------------------------------------------ */

  function decode(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i) ^ KEY.charCodeAt(i % KEY.length);
    }
    return new TextDecoder().decode(bytes);
  }

  function parseAnswer(raw) {
    var text = raw.trim().toLowerCase();
    if (/^\d+$/.test(text)) return parseInt(text, 10);
    return Object.prototype.hasOwnProperty.call(WORDS, text) ? WORDS[text] : NaN;
  }

  /* localStorage throws in private windows on some browsers, and the gate
     should still open when it does. */
  function passRemembered() {
    try {
      var at = parseInt(localStorage.getItem(STORE_KEY), 10);
      return at > 0 && Date.now() - at < TTL;
    } catch (e) {
      return false;
    }
  }

  function rememberPass() {
    try {
      localStorage.setItem(STORE_KEY, String(Date.now()));
    } catch (e) {
      /* Nothing to do: the visitor sees the question again next time. */
    }
  }

  /* Set from reveal(), so that every way into the page grants the cookie and
     none can be forgotten: a fresh answer, a pass remembered from a previous
     visit, or a host that does not stand the gate at all. The cookie can also
     be cleared or expire while localStorage still remembers the pass, and a
     reader let through with no cookie would find every article forbidden. */
  function setPassCookie() {
    /* Secure would keep the cookie from ever being set over plain HTTP, which
       is how tiny serves; there the gate does not stand anyway. */
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = COOKIE + '=' + TOKEN + '; Path=/; Max-Age=' +
      Math.floor(TTL / 1000) + '; SameSite=Lax' + secure;
  }

  /* ------------------------------------------------------------------ */

  function reveal() {
    setPassCookie();

    fetch('docs/content.enc')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (body) {
        page.innerHTML = decode(body);
        if (gate) gate.remove();

        /* Land the reader at the top of the page they just opened, rather
           than leaving focus on a button that no longer exists. */
        var name = page.querySelector('.name');
        if (name) {
          name.setAttribute('tabindex', '-1');
          name.focus();
        }
      })
      .catch(function () {
        note('The page could not be loaded. Please reload and try again.', 'wrong');
      });
  }

  function note(text, state) {
    var el = document.getElementById('gate-note');
    if (!el) return;
    el.textContent = text;
    if (state) {
      el.setAttribute('data-state', state);
    } else {
      el.removeAttribute('data-state');
    }
  }

  function ask() {
    var question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    var field = document.getElementById('gate-answer');

    document.getElementById('gate-question').textContent = question[0];
    gate.hidden = false;
    field.focus();

    document.getElementById('gate-form').addEventListener('submit', function (ev) {
      ev.preventDefault();

      if (parseAnswer(field.value) === question[1]) {
        rememberPass();
        reveal();
        return;
      }

      /* A fresh question, so that a wrong answer cannot simply be retried
         until it lands. */
      question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
      document.getElementById('gate-question').textContent = question[0];
      field.value = '';
      field.focus();
      note('Not quite. Here is another.', 'wrong');
    });
  }

  /* ------------------------------------------------------------------ */

  if (GUARDED_HOSTS.indexOf(location.hostname) === -1 || passRemembered()) {
    reveal();
  } else {
    ask();
  }
})();
