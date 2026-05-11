# Backend Research

## How to connect test app
- Uptime Monitoring with test app's url
- App installs our sdk
- App manually reports crashes/errors to our backend
***

## Cloudflare Workers
- Cron Triggers limited to at most a ping per minute on the free tier
***

## Wrangler CLI
***

## Individual Research
| Name | Notes |
|------|-------|
| Michael | -Users will most likely download and install Watchtower sdk and import the lib into their project -This will capture events -Another option is to have the user manually report crashes in their code -Could use uptime monitoring to ping the user's applications from our backend -Use Cron triggers in cloudflare workers | 
| Bishal | | 
| Theo | | 
| Gabriella | |
***

## Observability Tool Integration Survey
### PostHog
- Connect PostHog to user applications using sdk's to capture events

1. Install dependencies
required
PostHog logs uses the standard OpenTelemetry SDK. No PostHog-specific packages required. Install the OTel SDK and the logs signal package:

`npm install @opentelemetry/sdk-node @opentelemetry/sdk-logs @opentelemetry/exporter-logs-otlp-http @opentelemetry/resources`

2. Configure the OTLP log exporter
required
Create a logger setup file that configures the OpenTelemetry log exporter to send logs to PostHog. Call this before your application starts.

```
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs'

const exporter = new OTLPLogExporter({
  url: 'https://us.i.posthog.com/otlp/v1/logs',
  headers: {
    Authorization: 'Bearer phc_ybsNzXe6Yicd44L2qePdEzh55FrhPhyQnFriaaXNrBzq',
  },
})

const loggerProvider = new LoggerProvider({
  resource: resourceFromAttributes({
    'service.name': 'my-app',
  }),
})

loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(exporter))

export const logger = loggerProvider.getLogger('my-app')
3. Send a log

required
Use the logger to emit logs from your application:

import { SeverityNumber } from '@opentelemetry/api-logs'
import { logger } from './logger'

logger.emit({
  severityNumber: SeverityNumber.INFO,
  severityText: 'INFO',
  body: 'Server started',
  attributes: {
    'server.port': 3000,
    'server.env': 'production',
  },
})

```
***

### Sentry
- Sentry connects to user application via an sdk

1. Run the command for your preferred package manager to add the Sentry SDK to your application:

   `npm install @sentry/browser --save`

2. Initialize Sentry as early as possible in your application's lifecycle. The setup differs slightly depending on how you installed the Sentry SDK. Be sure to follow the instructions in the related tab (npm, Loader, CDN):
```
import * as Sentry from "@sentry/browser";
Sentry.init({
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
  // Alternatively, use `process.env.npm_package_version` for a dynamic release version
  // if your build tool supports it.
  release: "my-project-name@2.3.12",
});
```

3. To verify that Sentry captures errors and creates issues in your Sentry project, add a button that throws an error when clicked.
   Open the page in a browser and click the button to throw an error.
```
<script>
  function triggerError() {
    throw new Error("Sentry Test Error");
  }
</script>
<button onclick="triggerError()">Break the World</button>
```
***

## Rest API
- Representational State Transfer
### Methods of Rest API
 - GET: Read data from db
 - POST: Create new records
 - PUT: Update or replace existing records
 - DELETE: Remove resource from server
***
