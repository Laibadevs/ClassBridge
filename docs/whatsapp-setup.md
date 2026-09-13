# WhatsApp Business Cloud API setup (Phase 5)

ClassBridge sends two kinds of messages over WhatsApp: an approved AI parent
update, and a published important announcement. Both go out through the
official **Meta WhatsApp Business Cloud API** (HTTPS Graph API) — there is no
browser automation, QR-code login, or unofficial library involved anywhere
in this integration.

Until you complete the steps below, the backend automatically uses a
**mock provider** that never makes a network call and always "succeeds" —
this is what local development and the automated test suite run against, so
the rest of the feature (approve → send → status tracking → webhook) is
fully exercised without needing a Meta account at all. Real delivery only
starts once `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are set.

## 1. Create/use a Meta Business account

Go to [business.facebook.com](https://business.facebook.com) and create a
Business Manager account (or use an existing one).

## 2. Configure WhatsApp Business

In [Meta for Developers](https://developers.facebook.com/apps), create an
app of type "Business", then add the **WhatsApp** product to it. Meta
provisions a test phone number automatically, which is enough for
development — production sending requires your own verified business phone
number.

## 3. Obtain the phone number ID

In the app's WhatsApp > API Setup page, copy the **Phone number ID** shown
under "From" — this is `WHATSAPP_PHONE_NUMBER_ID`. Note this is Meta's
internal numeric ID for the sending number, not the phone number itself.

## 4. Obtain an access token

The same API Setup page shows a temporary access token (valid ~24 hours,
fine for testing). For anything longer-lived, create a **System User** under
Business Settings > Users > System Users, assign it the WhatsApp app with
`whatsapp_business_messaging` permission, and generate a permanent token
from there. Put it in `WHATSAPP_ACCESS_TOKEN`.

**Never** commit this token, paste it into chat, or log it. The backend
never returns it in any API response and never writes it to logs.

## 5. Configure the webhook

Delivery status (`sent` → `delivered` → `read`, or `failed`) only ever
arrives via Meta's webhook — the backend never polls for it. In the app's
WhatsApp > Configuration page:

- **Callback URL**: `https://<your-backend-host>/api/webhooks/whatsapp`
  (must be HTTPS in production; see "Local development" below for testing
  before you have a public HTTPS URL).
- **Verify token**: any string you choose — set the same value as
  `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in the backend's environment. Meta's GET
  handshake sends this value back and the backend only echoes the challenge
  if it matches (`app/routers/webhooks.py::verify_webhook`).
- Subscribe to the **messages** webhook field (this is what carries delivery
  status events).

## 6. Configure the app secret (recommended)

Meta signs every webhook POST body with your app's secret
(`X-Hub-Signature-256` header). Copy the App Secret from Settings > Basic in
the Meta app dashboard into `WHATSAPP_APP_SECRET`. When this is set, the
backend rejects any webhook POST whose signature doesn't match — this is
what stops a random caller from forging delivery-status updates. If left
empty, signature verification is skipped (fine for early local testing,
**not** recommended once the callback URL is public).

## 7. Business Account ID (optional, for reference)

`WHATSAPP_BUSINESS_ACCOUNT_ID` (found in WhatsApp > API Setup) isn't
required by anything the backend currently calls, but is captured for
future use (e.g. managing templates via the API) and for support tickets
with Meta.

## 8. Create/approve required message templates (only if needed)

Free-form text messages (what both flows use by default) can only be
delivered to a recipient within Meta's 24-hour customer-service window
(i.e. that WhatsApp number messaged your business number recently), or
under Meta's early-access "service window" allowances for your account.
**Outside that window, Meta requires a pre-approved message template** —
ClassBridge cannot know your account's exact policy state, so:

- If your test recipients have messaged your WhatsApp test number first,
  free-form sending works as-is.
- Otherwise, create a template in Business Manager > WhatsApp Manager >
  Message Templates, wait for Meta's approval, then set
  `WHATSAPP_TEMPLATE_NAME` / `WHATSAPP_TEMPLATE_LANGUAGE` to that exact
  approved name/language. `MetaCloudWhatsAppProvider.send_template_message`
  (`backend/app/services/whatsapp/meta_cloud.py`) is ready to use once wired
  up — the backend never assumes a template exists or guesses its name.

Never bypass this — sending outside Meta's policy risks the WhatsApp
Business account being restricted.

## 9. Environment variables

Set these on the backend (`backend/.env` locally, or your host's secret
store in production) — see `backend/.env.example` for the full list with
placeholders:

| Variable | Purpose |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Bearer token for the Graph API. Never exposed to the frontend. |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta's ID for your sending number. |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Reference only. |
| `WHATSAPP_API_VERSION` | Graph API version, e.g. `v21.0`. |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Must match what you set in Meta's webhook config. |
| `WHATSAPP_APP_SECRET` | Enables webhook signature verification. |
| `WHATSAPP_TEMPLATE_NAME` / `WHATSAPP_TEMPLATE_LANGUAGE` | Only if you need template messaging outside the service window. |
| `WHATSAPP_MAX_RECIPIENTS` | Safety cap on recipients per announcement send (default 100). |

## 10. Test with Meta's test recipient

In WhatsApp > API Setup, add your own phone number as a recipient (Meta
requires this allow-listing step for the free test number) and use the
"Send message" test button there first, to confirm the number/token work,
before triggering a send from ClassBridge.

## Local development: webhooks need a public HTTPS URL

Meta cannot reach `localhost`. To test the webhook locally before you have
a real HTTPS backend URL, run a development tunnel (e.g. any HTTPS tunnel
tool such as `ngrok http 8000` or an equivalent) and use the tunnel's HTTPS
URL as the Callback URL in Meta's webhook configuration. Don't hardcode a
tunnel URL anywhere in the codebase — it's only ever pasted into Meta's
dashboard, and changes every time you restart the tunnel (unless you're on
a paid plan with a fixed subdomain). In production, use your real backend's
HTTPS URL instead.

## What's mocked vs. real right now

- `app/services/whatsapp/mock.py` — the default provider. Always "succeeds"
  with a fake `provider_message_id`, never touches the network. This is what
  the test suite and local dev run against out of the box.
- `app/services/whatsapp/meta_cloud.py` — the real Meta Cloud API provider,
  used automatically once both `WHATSAPP_ACCESS_TOKEN` and
  `WHATSAPP_PHONE_NUMBER_ID` are set (see
  `app/dependencies/whatsapp.py::get_whatsapp_provider`).

**Provider integration is fully implemented, but live WhatsApp delivery
requires the Meta credentials/configuration described above.** Nothing in
this codebase fabricates a "delivered" or "read" status — those only ever
come from Meta's real webhook.
