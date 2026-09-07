// ============================================================================
// InviteDaddy — Revolut payment: create order (serverless function)
// Invite Daddy Limited · CRO 759077 · Ireland
// ----------------------------------------------------------------------------
// Runs on Netlify's servers, NOT in the browser. The Revolut Secret key lives
// only in the Netlify environment variable REVOLUT_SECRET_KEY and is never sent
// to the client.
//
// Flow:
//   Browser (payment page) --> POST here with { amount, email? }
//   Here --> POST to Revolut "Create an order" --> get checkout_url
//   Here --> return { checkout_url } to the browser
//   Browser --> redirects the customer to checkout_url
// ============================================================================

// Which Revolut environment to use. Set REVOLUT_ENV = "sandbox" while testing;
// leave it unset (or "prod") for real payments.
const REVOLUT_BASE =
  (process.env.REVOLUT_ENV || "prod").toLowerCase() === "sandbox"
    ? "https://sandbox-merchant.revolut.com"
    : "https://merchant.revolut.com";

// Where the customer lands AFTER a successful payment.
const SUCCESS_URL = "https://invitedaddy.ie/payment-success/";

// Business rules for the amount the customer may type in.
const CURRENCY = "EUR";
const MIN_EUR = 1;       // reject anything under €1
const MAX_EUR = 10000;   // sanity ceiling; raise later if a service costs more

exports.handler = async (event) => {
  // Only allow POST.
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  // The secret key must be configured on Netlify.
  const secret = process.env.REVOLUT_SECRET_KEY;
  if (!secret) {
    return json(500, { error: "Payment is not configured yet. Please contact us." });
  }

  // Parse and validate the amount coming from the page.
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Bad request." });
  }

  const euros = Number(body.amount);
  if (!isFinite(euros) || euros < MIN_EUR || euros > MAX_EUR) {
    return json(400, {
      error: `Please enter an amount between €${MIN_EUR} and €${MAX_EUR}.`,
    });
  }

  // Revolut wants the amount in minor units (cents). Round to avoid float dust.
  const minor = Math.round(euros * 100);

  // Build the order payload.
  const payload = {
    amount: minor,
    currency: CURRENCY,
    description: "InviteDaddy — professional services (Invite Daddy Limited)",
    redirect_url: SUCCESS_URL,
  };

  // Optional: attach the customer's email so Revolut can send a receipt.
  const email = (body.email || "").trim();
  if (email) {
    payload.customer = { email };
  }

  // Call Revolut.
  let res, data;
  try {
    res = await fetch(`${REVOLUT_BASE}/api/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secret}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Revolut-Api-Version": "2024-09-01",
      },
      body: JSON.stringify(payload),
    });
    data = await res.json();
  } catch (e) {
    return json(502, { error: "Could not reach the payment provider. Please try again." });
  }

  if (!res.ok || !data.checkout_url) {
    // Log the real reason to the Netlify function log (not shown to the customer).
    console.error("Revolut order creation failed:", res.status, JSON.stringify(data));
    return json(502, { error: "The payment could not be started. Please try again or contact us." });
  }

  // Success — hand the checkout URL back to the browser.
  return json(200, { checkout_url: data.checkout_url });
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
