# Observability Tool Integration Survey

**Owner:** Bishal (Datadog, Grafana Cloud) 
**Purpose:** Help the team understand how real-world observability tools connect to a web app using a script tag — so we can design WatchTower's own integration the same way.

---

## Background — What Is This Document About?

When you want to monitor a web app (track errors, user clicks, page performance, etc.), you need to connect it to some monitoring tool. There are two common ways to do that:

- **npm package** — install it as a dependency and import it in your code. Requires a build step.
- **Script tag / snippet** — paste a small chunk of HTML into your page's `<head>`. Works on any website with zero build tooling. **This is what WatchTower will use.**

This document looks at how two established tools — **Datadog** and **Grafana Cloud (Faro)** — handle the script-tag approach. The goal is to learn from their patterns so we don't have to guess when designing WatchTower.

> **Glossary of terms used in this doc**
>
> - **SDK** — Software Development Kit. The library the tool gives you to interact with it from your app.
> - **CDN** — Content Delivery Network. A service that hosts files so anyone can load them via a URL. You don't need to install anything.
> - **RUM** — Real User Monitoring. Tracking what real users actually do and experience in your app.
> - **Payload** — The data (usually JSON) sent to the monitoring tool when an event happens.
> - **Ingestion endpoint / Collector** — The server URL that receives the data your app sends.
> - **CORS** — A browser security rule that controls which websites are allowed to send data to a given server.

---

## 1. Datadog — Browser RUM SDK

### What Is Datadog?

Datadog is a large commercial observability platform. It monitors everything from servers to databases to frontend apps. Their Browser RUM SDK is what you embed in a web page to track user behavior and errors.

---

### How Do You Add It to a Page? (Script-Tag Mode)

You don't install anything. You paste a snippet of code into the `<head>` section of your HTML file. Datadog offers two flavors:

#### Option A — Async (Recommended)

"Async" means the Datadog script loads in the background without slowing down your page. The trade-off is that if something happens on the page before the script finishes loading, it might be missed.

```html
<!-- Step 1: This invisible snippet loads the Datadog script in the background -->
<script>
  (function(h,o,u,n,d) {
    h=h[d]=h[d]||{q:[],onReady:function(c){h.q.push(c)}}
    d=o.createElement(u);d.async=1;d.src=n,d.crossOrigin=''
    n=o.getElementsByTagName(u)[0];n.parentNode.insertBefore(d,n)
  })(window,document,'script',
     'https://www.datadoghq-browser-agent.com/us1/v7/datadog-rum.js',
     'DD_RUM')
</script>

<!-- Step 2: Once the script is ready, initialize it with your project's credentials -->
<script>
  DD_RUM.onReady(function() {
    DD_RUM.init({
      clientToken: '<CLIENT_TOKEN>',      // like a password for your project
      applicationId: '<APPLICATION_ID>', // like a username for your project
      site: 'datadoghq.com',
      service: 'my-app',
      env: 'production',
      version: '1.0.0',
      sessionSampleRate: 100,          // monitor 100% of sessions
      trackUserInteractions: true,     // auto-track button clicks, etc.
    })
  })
</script>
```

The messy-looking first block is a standard "loader" pattern. What it does is simple: create a `<script>` tag that points to Datadog's CDN, load it asynchronously, and make sure any calls you make before it finishes loading are saved and replayed once it's ready.

#### Option B — Sync (Catches Everything)

"Sync" means the browser stops and waits for the Datadog script to fully load before doing anything else. Nothing is missed, but your page load is slightly slower.

```html
<!-- Loads Datadog first, before anything else on the page -->
<script
  src="https://www.datadoghq-browser-agent.com/us1/v7/datadog-rum.js"
  type="text/javascript"
  crossorigin>
</script>

<!-- Then initialize it -->
<script>
  window.DD_RUM && window.DD_RUM.init({ /* same options as above */ })
</script>
```

> **Which should WatchTower use?** The async pattern. It's the industry default for snippets because it doesn't hurt page performance.

---

### How Does Datadog Know Which Project the Data Belongs To?

When you create a new app in the Datadog UI, it generates two unique values for you:

| Field | What It Is | Plain English |
|---|---|---|
| `applicationId` | A UUID (unique ID) | "Which app is this data for?" |
| `clientToken` | A security token | "Is this request allowed?" |

Both get pasted into `DD_RUM.init()`. You can also add `service`, `env`, and `version` to make it easier to filter data later — e.g., "show me only errors from version 2.1 in production."

**How you get these values:** Go to Datadog UI → Digital Experience → Add an Application. The UI generates a ready-to-paste snippet with your credentials already filled in.

---

### What Does the Data Look Like? (Event Payload Shape)

Once the snippet is on your page, Datadog automatically collects:
- Page views and navigation
- JavaScript errors
- Network requests (how long they take, whether they fail)
- User clicks

You can also send **custom events** manually from your own code:

```js
// Track a custom action — e.g., user completed a checkout
DD_RUM.addAction('checkout_completed', {
  cartValue: 84.99,
  itemCount: 3,
  currency: 'USD',
})
```

You can report **custom errors** too:

```js
// Manually report an error with extra context
DD_RUM.addError(new Error('Payment failed'), {
  source: 'custom',
  orderId: 'ord_123',
})
```

Datadog batches these up internally and sends them to its servers periodically (not one-by-one). Everything goes as JSON over HTTPS.

**Want to filter or modify events before they're sent?** Use the `beforeSend` hook:

```js
DD_RUM.init({
  beforeSend: (event, context) => {
    // Return false to drop the event entirely
    if (event.type === 'error' && event.error.message.includes('ResizeObserver')) {
      return false
    }
  },
})
```

This is useful for privacy (strip personal data) or noise reduction (drop known harmless errors).

---

### Demo App Patterns

- **Backstage** (an open-source developer portal by Spotify) is a good real-world example. They paste the CDN async snippet into their main `index.html` and read `clientToken` and `applicationId` from a config file — clean, no build magic needed.
- Datadog's UI always generates a copy-pasteable snippet with your credentials pre-filled and the correct region URL. A new developer can be up and running in under 5 minutes.

---

## 2. Grafana Cloud — Faro Web SDK

### What Is Grafana Cloud / Faro?

Grafana is a well-known open-source observability stack (the dashboards tool). Grafana Cloud is their hosted version. **Faro** is their open-source browser SDK for frontend monitoring — think of it as Grafana's answer to Datadog RUM, but built on open standards (OpenTelemetry).

---

### How Do You Add It to a Page? (Script-Tag Mode)

Similar idea to Datadog, but slightly different pattern. Faro's CDN snippet uses an `onload` callback instead of a queuing mechanism:

```html
<script>
  (function () {
    // Create a new <script> element to load Faro from the CDN
    var script = document.createElement('script');

    // Once the script has loaded, initialize Faro
    script.onload = () => {
      window.GrafanaFaroWebSdk.initializeFaro({
        // This URL tells Faro where to send your data.
        // The {app-key} part is unique to YOUR project — you copy it from the Grafana UI.
        url: 'https://faro-collector-us-central-0.grafana.net/collect/{app-key}',

        app: {
          name: 'my-app',      // the name of your project
          version: '1.0.0',   // optional but helpful
        },
      });
    };

    // Point the script tag to Faro's CDN
    script.src =
      'https://unpkg.com/@grafana/faro-web-sdk@^1.0.0/dist/bundle/faro-web-sdk.iife.js';

    // Add the script to the page
    document.head.appendChild(script);
  })();
</script>
```

Once this snippet is in your `<head>`, Faro loads in the background and starts collecting data automatically.

> **Grafana Cloud also provides this snippet pre-filled in its UI.** Go to Observability → Frontend → your app → "Web SDK Configuration" → "CDN without Tracing" tab. Copy and paste. Done.

---

### How Does Faro Know Which Project the Data Belongs To?

This is slightly different from Datadog. Instead of passing a separate token and ID, **Faro bakes the project key directly into the collector URL**:

```
https://faro-collector-us-central-0.grafana.net/collect/{app-key}
```

The `{app-key}` is unique to your project. So the URL itself is the identifier — no extra fields needed.

| Field | What It Is | Plain English |
|---|---|---|
| `url` (with app-key) | Collector URL + project identifier in one | "Where to send data, and which project it belongs to" |
| `app.name` | Your app's name | Used to label data in dashboards |
| `app.version` | Your app's version | Optional; useful for comparing releases |
| CORS Allowed Origins | A list of domains allowed to send data | Security setting — prevents other websites from using your key |

**How you get these values:** Grafana Cloud UI → Observability → Frontend → Create new. Fill in your app name and allowed domains, click Create, and the UI shows you the exact snippet to copy.

---

### What Does the Data Look Like? (Event Payload Shape)

Once initialized, Faro auto-collects page performance, errors, and console output. For custom data, you call `faro.api.*` methods. There are four types of signals:

**Custom Events** — things that happen in your app (button clicks, user actions, etc.):
```js
// Simple: just a name
faro.api.pushEvent('user_signed_in')

// With extra data attached
faro.api.pushEvent('add_to_cart', {
  itemId: 'sku_42',
  qty: 2,
}, 'shop') // 'shop' is an optional category/domain label
```

**Errors** — auto-captured, but you can also send them manually:
```js
faro.api.pushError(new Error('Payment failed'), {
  type: 'network',                     // what kind of error
  context: { orderId: 'ord_123' },     // any extra info you want attached
  fingerprint: 'checkout-payment-failure', // groups similar errors together
  fatal: false,                        // was this a crash?
})
```

**Logs** — freeform messages, like a browser console but sent to Grafana:
```js
faro.api.pushLog(['Cart subtotal computed'], {
  level: LogLevel.INFO,
  context: { total: 84.99 },
})
```

**Measurements** — custom numeric metrics:
```js
faro.api.pushMeasurement({
  type: 'page_load_time',
  values: { duration: 342 }, // in milliseconds
})
```

**Setting user info** — call this once after login and it gets attached to everything automatically:
```js
faro.api.setUser({
  id: 'usr_99',
  email: 'alice@example.com',
  attributes: { plan: 'pro' }, // any extra fields you want
})
```

Just like Datadog, Faro batches events and sends them as JSON to its collector. It also has a `beforeSend` hook for filtering or modifying data before it goes out.

> **One small gotcha:** Faro de-duplicates events by default — if you fire the exact same event twice in a row, it only sends it once. You can override this with `{ skipDedupe: true }` if needed.

---

### Demo App Patterns

- The official Grafana demo is a minimal Node/Express app with a plain HTML file. The snippet goes in `<head>`, and button click handlers call `faro.api.pushEvent()` directly — no framework, no bundler. Easy to copy as a starting point for WatchTower's own Test App.
- For environments where the Grafana Cloud URL is blocked by ad-blockers or CORS rules, the recommended fix is to proxy the collector through your own backend server.

---

## Side-by-Side Comparison

| | Datadog RUM | Grafana Faro |
|---|---|---|
| **How you add it to a page** | Paste async or sync `<script>` snippet into `<head>` | Paste async `<script>` snippet into `<head>` |
| **Global variable name** | `window.DD_RUM` | `window.GrafanaFaroWebSdk` |
| **How your project is identified** | Two fields: `applicationId` + `clientToken` | App key baked into the collector URL |
| **Where data is sent** | Datadog's servers (paid SaaS) | Grafana Cloud or your own self-hosted server |
| **Track a custom event** | `DD_RUM.addAction('name', { data })` | `faro.api.pushEvent('name', { data })` |
| **Report an error** | `DD_RUM.addError(error, context)` | `faro.api.pushError(error, { type, context })` |
| **Set who the user is** | `DD_RUM.setUser({ id, name, email })` | `faro.api.setUser({ id, email, attributes })` |
| **Modify events before sending** | `beforeSend` callback in `init()` | `beforeSend` callback in `initializeFaro()` |
| **Snippet generated by UI?** | Yes — copy-paste ready | Yes — copy-paste ready |
| **Open source?** | No (proprietary) | Yes (Apache 2.0) |

---

## What This Means for WatchTower

Both tools follow the same basic playbook. That's great news — it means there's a proven pattern we can follow.

Here are the key design decisions WatchTower should adopt:

**1. One snippet, pasted into `<head>`**
The Test App shouldn't need to install anything or run a build. They paste one block of HTML and it works. This is the universal standard.

**2. Queue calls before the SDK loads**
Between when the snippet is pasted and when the SDK actually finishes loading, the Test App might already be sending events. WatchTower's snippet should save those calls and replay them once the SDK is ready — just like `DD_RUM.onReady()` does.

**3. A single project key at init time**
Datadog uses two fields (ID + token), Faro uses one (key embedded in URL). Either works, but a single explicit `projectKey` or `apiKey` field in WatchTower's `init()` config is probably the cleanest and easiest to explain to a new developer.

**4. Separate methods for different signal types**
Don't just have one `track()` function for everything. Having `trackEvent()`, `trackError()`, `trackLog()` etc. makes it clearer what you're sending, and easier to process on the backend.

**5. Set user once, attach everywhere**
Both tools have a `setUser()` method. You call it once after login, and the user info is automatically included in every event that follows. WatchTower should do the same.

**6. A `beforeSend` hook**
Giving developers a way to inspect and filter events before they're sent is a small feature with big value — useful for privacy compliance (strip emails/passwords) and noise reduction (ignore known benign errors).
