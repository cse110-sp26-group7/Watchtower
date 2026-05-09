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
***

## Rest API
***
