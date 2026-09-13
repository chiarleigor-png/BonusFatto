const DEMO_KEY = 'bonusfatto_demo_checkout';
const realFetch = window.fetch.bind(window);

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

window.fetch = async function demoFetch(input, init = {}) {
  const url = typeof input === 'string' ? input : input?.url || '';

  if (url === '/api/checkout' && String(init.method || 'GET').toUpperCase() === 'POST') {
    try {
      const data = JSON.parse(init.body || '{}');
      if (!['base', 'report', 'whatsapp'].includes(data.plan)) {
        return jsonResponse({ error: 'Piano demo non valido.' }, 400);
      }
      const sessionId = `demo_local_${Date.now()}_${data.plan}`;
      sessionStorage.setItem(
        DEMO_KEY,
        JSON.stringify({
          sessionId,
          plan: data.plan,
          comune: data.comune,
          isee: Number(data.isee),
          figli: Number(data.figli),
          billing: data.billing || null,
        }),
      );
      return jsonResponse({
        demo: true,
        id: sessionId,
        url: `${window.location.origin}/?session_id=${encodeURIComponent(sessionId)}`,
      });
    } catch {
      return jsonResponse({ error: 'Impossibile creare la sessione demo.' }, 400);
    }
  }

  if (url.startsWith('/api/verify-checkout?')) {
    try {
      const requested = new URL(url, window.location.origin).searchParams.get('session_id');
      const saved = JSON.parse(sessionStorage.getItem(DEMO_KEY) || 'null');
      if (!saved || saved.sessionId !== requested) {
        return jsonResponse({ error: 'Sessione demo non trovata.' }, 400);
      }
      return jsonResponse({
        paid: false,
        demo: true,
        plan: saved.plan,
        comune: saved.comune,
        isee: saved.isee,
        figli: saved.figli,
        billing: saved.billing,
      });
    } catch {
      return jsonResponse({ error: 'Impossibile verificare la sessione demo.' }, 400);
    }
  }

  return realFetch(input, init);
};
