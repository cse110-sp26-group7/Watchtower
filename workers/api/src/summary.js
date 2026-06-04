/**
 * Aggregation helpers for GET /api/summary.
 *
 * Contract: docs/backend/api/endpoints-draft.md §GET /api/summary.
 * Storage shape (type-specific fields live in the JSON `payload` column, read
 * via json_extract): docs/backend/api/event-schema-draft.md.
 */

import { ValidationError } from './query.js';

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// "no error events in the last 15 minutes" → site_status "ok" (per
// endpoints-draft.md). Independent of the `window` param.
export const SITE_STATUS_WINDOW_MS = 15 * MINUTE;

// Web Vitals reported under totals.performance_p75. Fixed order so the response
// shape is stable; a metric with no samples this window comes back as null.
const METRICS = ['LCP', 'FCP', 'TTFB', 'CLS', 'INP'];

// Accepted `window` values → bucketing plan (matches the enum in
// endpoints-draft.md). Bucket size scales with the window so the chart stays
// legible: 1h→1m gives 60 points rather than a single bar. The `bucketFmt`
// strings are a closed internal whitelist (never user input) and are inlined
// into SQL below — strftime truncates the ISO-8601 timestamp to the bucket
// boundary, producing keys that match `new Date(...).toISOString()`. Buckets
// are always UTC; the `timezone` query param is accepted but not yet honored.
const WINDOWS = {
	'1h': { windowMs: HOUR, bucketMs: MINUTE, bucketSize: '1m', bucketFmt: '%Y-%m-%dT%H:%M:00.000Z' },
	'24h': { windowMs: 24 * HOUR, bucketMs: HOUR, bucketSize: '1h', bucketFmt: '%Y-%m-%dT%H:00:00.000Z' },
	'7d': { windowMs: 7 * DAY, bucketMs: HOUR, bucketSize: '1h', bucketFmt: '%Y-%m-%dT%H:00:00.000Z' },
	'30d': { windowMs: 30 * DAY, bucketMs: DAY, bucketSize: '1d', bucketFmt: '%Y-%m-%dT00:00:00.000Z' },
};

/**
 * Parse and validate the GET /api/summary query string. `timezone` is accepted
 * but read-and-ignored (buckets are always UTC); see the inline note below.
 *
 * @param {URL} url - The request URL whose `searchParams` carry `project_id`,
 *   the optional `window` (defaults to `'24h'`), and the ignored `timezone`.
 * @returns {{ projectId: string, window: string }} The validated query, where
 *   `window` is one of the keys in `WINDOWS`.
 * @throws {ValidationError} `missing_param` when `project_id` is absent, or
 *   `invalid_param` when `window` is not an accepted value.
 */
export function parseSummaryQuery(url) {
	const sp = url.searchParams;

	const projectId = sp.get('project_id');
	if (!projectId) throw new ValidationError('missing_param', 'project_id');

	const window = sp.get('window') ?? '24h';
	if (!Object.prototype.hasOwnProperty.call(WINDOWS, window)) {
		throw new ValidationError('invalid_param', 'window');
	}

	// `timezone` is an accepted query param (per endpoints-draft.md) but not yet
	// honored — buckets are always UTC — so it is read-and-ignored here, not
	// threaded downstream.

	return { projectId, window };
}

/**
 * Build the bucket grid for a window. Floors `now` to the current bucket
 * boundary, then walks back so the grid covers the trailing window. The Unix
 * epoch is UTC-midnight aligned, so integer division by bucketMs gives clean
 * hour/day boundaries without any timezone math.
 *
 * Returns the SQL bucket format, the window lower-bound (windowStartISO, used
 * for `timestamp >= ?`), and gridKeys — the full ordered list of bucket-key
 * strings used to zero-fill the timeseries.
 *
 * @param {string} window - An accepted `window` value (a key in `WINDOWS`).
 * @param {number} nowMs - The current time in epoch milliseconds; floored to
 *   the current bucket boundary to anchor the trailing window.
 * @returns {{ bucketSize: string, bucketFmt: string, windowStartISO: string,
 *   gridKeys: string[] }} The bucket size label, the SQL strftime format, the
 *   ISO-8601 window lower-bound, and the ordered bucket-key grid.
 */
export function buildBucketPlan(window, nowMs) {
	const { windowMs, bucketMs, bucketSize, bucketFmt } = WINDOWS[window];
	const latest = Math.floor(nowMs / bucketMs) * bucketMs;
	const bucketCount = Math.round(windowMs / bucketMs);
	const start = latest - (bucketCount - 1) * bucketMs;

	const gridKeys = [];
	for (let i = 0; i < bucketCount; i++) {
		gridKeys.push(new Date(start + i * bucketMs).toISOString());
	}

	return { bucketSize, bucketFmt, windowStartISO: gridKeys[0], gridKeys };
}

function round1(n) {
	return Math.round(n * 10) / 10;
}

/**
 * Assemble the GET /api/summary response from the four aggregate result sets
 * and the bucket plan. Pure (no I/O): the handler runs the queries, this shapes
 * the JSON. Every aggregate observes the same (windowStart, now] interval, so
 * totals, the grid, p75, and site_status cannot diverge. Empty hours are
 * zero-filled to a continuous grid so the chart can tell "zero errors" apart
 * from "no data". feedback_avg and per-metric p75 come back null when there is
 * nothing to average.
 *
 * @param {object} args - The aggregate result sets and bucket plan.
 * @param {string} args.projectId - The project the summary is scoped to.
 * @param {string} args.window - The requested window (echoed in the response).
 * @param {{ bucketSize: string, gridKeys: string[] }} args.plan - The bucket
 *   plan from {@link buildBucketPlan}; `gridKeys` drives the zero-filled grid.
 * @param {string} args.generatedAt - ISO-8601 timestamp for `generated_at`.
 * @param {Array<{ bucket: string, count: number }>} args.errorRows - Error
 *   counts per bucket key.
 * @param {Array<{ bucket: string, count: number, sum_rating: number }>}
 *   args.feedbackRows - Feedback count and rating sum per bucket key.
 * @param {Array<{ metric_name: string, p75: number }>} args.perfP75Rows - The
 *   p75 per Web Vital metric that had samples this window.
 * @param {number} args.recentErrorCount - Error count in the site-status
 *   window; drives `site_status` ("issues" when > 0, else "ok").
 * @returns {object} The GET /api/summary response: `project_id`, `window`,
 *   `generated_at`, `totals`, `timeseries`, and `site_status`.
 */
export function assembleSummary({
	projectId,
	window,
	plan,
	generatedAt,
	errorRows,
	feedbackRows,
	perfP75Rows,
	recentErrorCount,
}) {
	// errors timeseries + total (sum of buckets in-window)
	const errorByBucket = new Map(errorRows.map((r) => [r.bucket, r.count]));
	let errorTotal = 0;
	const errors = plan.gridKeys.map((t) => {
		const count = errorByBucket.get(t) ?? 0;
		errorTotal += count;
		return { t, count };
	});

	// feedback timeseries + count-weighted window average. Per-bucket avg =
	// sum/count; window avg = totalSum/totalCount (carrying sum_rating per bucket
	// keeps the window average exact rather than averaging bucket averages).
	const feedbackByBucket = new Map(feedbackRows.map((r) => [r.bucket, r]));
	let feedbackCount = 0;
	let feedbackSum = 0;
	const feedback = plan.gridKeys.map((t) => {
		const row = feedbackByBucket.get(t);
		const count = row?.count ?? 0;
		const sum = row?.sum_rating ?? 0;
		feedbackCount += count;
		feedbackSum += sum;
		return { t, avg: count > 0 ? round1(sum / count) : null, count };
	});

	// performance p75 per metric — computed in SQL (nearest-rank via a window
	// function; see handleGetSummary). One row per metric that had samples this
	// window; metrics with no data are absent here and surface as null.
	const p75ByMetric = new Map(perfP75Rows.map((r) => [r.metric_name, r.p75]));
	const performanceP75 = {};
	for (const m of METRICS) performanceP75[m] = p75ByMetric.has(m) ? p75ByMetric.get(m) : null;

	return {
		project_id: projectId,
		window,
		generated_at: generatedAt,
		totals: {
			errors: errorTotal,
			feedback_count: feedbackCount,
			feedback_avg: feedbackCount > 0 ? round1(feedbackSum / feedbackCount) : null,
			performance_p75: performanceP75,
		},
		timeseries: {
			bucket_size: plan.bucketSize,
			errors,
			feedback,
		},
		site_status: recentErrorCount > 0 ? 'issues' : 'ok',
	};
}
