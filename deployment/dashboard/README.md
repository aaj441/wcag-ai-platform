# WCAG AI Platform - Health Dashboard

Real-time production metrics monitoring dashboard with automatic 5-second refresh.

## Features

### System Health Monitoring
- ✅ Overall health status (Healthy/Degraded/Down)
- ⏱️ Uptime tracking
- ⚡ Response time monitoring
- 🚨 Error rate tracking

### Scan Performance Metrics
- 📊 Total scans processed
- 📦 Queue depth monitoring
- ⏲️ Average scan duration
- ✅ Success rate percentage

### AI Usage & Cost Tracking
- 🤖 Input/output token counts
- 💰 Estimated API costs (USD)
- 🔧 Current AI model in use
- 📈 Token consumption trends

### WCAG Violation Analytics
- 🔴 Total violations detected
- ⚠️ Critical severity count
- 🟡 Serious severity count
- 🔵 Moderate severity count

### Intelligent Alerting
- 🚨 High queue depth warnings (> 100)
- ❌ Elevated error rate alerts (> 10/min)
- 💸 High cost notifications (> $100)
- ⏰ Automatic 5-second refresh

## Quick Start

### Option 1: Local Development

```bash
# Start your API server
cd packages/api
npm run dev

# Open dashboard
open deployment/dashboard/index.html

# Enter API URL: http://localhost:8080
# Click "Connect to API"
```

### Option 2: Production Monitoring

```bash
# Open dashboard
open deployment/dashboard/index.html

# Enter your production Railway URL:
# https://your-app.railway.app

# Click "Connect to API"
```

### Option 3: Host on Vercel/Netlify

Deploy the dashboard as a static site:

```bash
# Vercel
cd deployment/dashboard
vercel --prod

# Or Netlify
netlify deploy --dir=deployment/dashboard --prod
```

## Configuration

The dashboard automatically:
- ✅ Fetches from `/health` endpoint
- ✅ Parses Prometheus metrics from `/metrics`
- ✅ Refreshes every 5 seconds
- ✅ Saves API URL to localStorage
- ✅ Displays real-time alerts

### Required API Endpoints

Your API must expose:

**1. Health Endpoint** (`/health`)
```json
{
  "status": "ok",
  "uptime": 3600,
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**2. Metrics Endpoint** (`/metrics`)
```
# Prometheus format
wcagai_scans_total 12345
wcagai_queue_length 5
wcagai_scan_duration_seconds_sum 1234.5
wcagai_scan_duration_seconds_count 100
wcagai_ai_tokens_input_total 50000
wcagai_ai_tokens_output_total 25000
wcagai_ai_cost_usd_total 12.50
wcagai_violations_total 500
wcagai_violations_critical_total 50
wcagai_violations_serious_total 150
wcagai_violations_moderate_total 300
wcagai_api_errors_total 2
```

## Metrics Reference

### System Metrics

| Metric | Description | Healthy Range |
|--------|-------------|---------------|
| `uptime` | Seconds since restart | > 3600s (1 hour) |
| `response_time` | Average API response | < 1000ms |
| `error_rate` | Errors per minute | < 5 |

### Scan Metrics

| Metric | Description | Source |
|--------|-------------|--------|
| `wcagai_scans_total` | Total scans processed | Prometheus counter |
| `wcagai_queue_length` | Scans in queue | Prometheus gauge |
| `wcagai_scan_duration_seconds` | Scan duration histogram | Prometheus histogram |
| `wcagai_scans_failed_total` | Failed scans | Prometheus counter |

### AI Metrics

| Metric | Description | Cost Calculation |
|--------|-------------|------------------|
| `wcagai_ai_tokens_input_total` | Total input tokens | $0.01 / 1K tokens |
| `wcagai_ai_tokens_output_total` | Total output tokens | $0.03 / 1K tokens |
| `wcagai_ai_cost_usd_total` | Estimated total cost | Auto-calculated |
| `wcagai_ai_model` | Current model name | - |

### Violation Metrics

| Metric | Description | Severity |
|--------|-------------|----------|
| `wcagai_violations_total` | All violations | All |
| `wcagai_violations_critical_total` | Critical issues | Blocker |
| `wcagai_violations_serious_total` | Serious issues | High |
| `wcagai_violations_moderate_total` | Moderate issues | Medium |

## Alert Thresholds

The dashboard triggers alerts when:

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Queue Depth | > 100 | Scale up workers |
| Error Rate | > 10/min | Check logs |
| AI Cost | > $100 | Review usage |
| Response Time | > 2000ms | Investigate performance |

## Customization

### Change Refresh Rate

Edit `index.html`:
```javascript
const REFRESH_RATE = 5000; // Change to 10000 for 10 seconds
```

### Add Custom Metrics

1. Expose new metric in your API:
```typescript
prometheus.register.gauge({
  name: 'wcagai_custom_metric',
  help: 'My custom metric'
});
```

2. Parse in dashboard:
```javascript
document.getElementById('custom-metric').textContent =
  (metrics.wcagai_custom_metric || 0).toLocaleString();
```

### Modify Alert Thresholds

Edit `checkAlerts()` function:
```javascript
if (metrics.wcagai_queue_length > 50) { // Change from 100
  alerts.push('Queue depth warning');
}
```

## CORS Configuration

If you encounter CORS errors, add these headers to your API:

```typescript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
```

## Troubleshooting

### Connection Failed

**Problem:** "Connection failed: Failed to fetch"

**Solutions:**
1. Check API is running: `curl http://localhost:8080/health`
2. Verify CORS headers are set
3. Check browser console for detailed errors
4. Try using `http://` instead of `https://` for local development

### Metrics Not Updating

**Problem:** Dashboard shows "Checking..." indefinitely

**Solutions:**
1. Verify `/metrics` endpoint returns Prometheus format
2. Check browser Network tab for failed requests
3. Ensure metric names match exactly (case-sensitive)
4. Verify health endpoint returns valid JSON

### Incorrect Metric Values

**Problem:** Metrics show `NaN` or `--`

**Solutions:**
1. Check metric parsing in `parsePrometheusMetrics()`
2. Verify Prometheus format: `metric_name value`
3. Ensure numeric values (not strings)
4. Check for typos in metric names

## Advanced Features

### Multi-Environment Monitoring

Monitor multiple environments simultaneously:

```html
<!-- Add environment selector -->
<select id="environment">
  <option value="http://localhost:8080">Local</option>
  <option value="https://staging.railway.app">Staging</option>
  <option value="https://production.railway.app">Production</option>
</select>
```

### Export Metrics Data

Add export functionality:

```javascript
function exportMetrics() {
  const data = {
    timestamp: new Date().toISOString(),
    metrics: currentMetrics,
    health: currentHealth
  };

  const blob = new Blob([JSON.stringify(data, null, 2)],
    { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `metrics-${Date.now()}.json`;
  a.click();
}
```

### Historical Charts

Integrate Chart.js for time-series visualization:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<canvas id="queueChart"></canvas>

<script>
const ctx = document.getElementById('queueChart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Queue Depth',
      data: [],
      borderColor: 'rgb(59, 130, 246)'
    }]
  }
});

// Update chart on each fetch
function updateChart(queueDepth) {
  chart.data.labels.push(new Date().toLocaleTimeString());
  chart.data.datasets[0].data.push(queueDepth);

  // Keep last 20 data points
  if (chart.data.labels.length > 20) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }

  chart.update();
}
</script>
```

## Integration with Monitoring Tools

### Grafana

Import metrics into Grafana:
1. Add Prometheus data source pointing to `/metrics`
2. Create dashboard with panels for each metric
3. Set up alerts based on thresholds

### PagerDuty

Trigger PagerDuty alerts from the dashboard:

```javascript
async function triggerPagerDuty(alert) {
  await fetch('https://events.pagerduty.com/v2/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routing_key: 'YOUR_INTEGRATION_KEY',
      event_action: 'trigger',
      payload: {
        summary: alert,
        severity: 'error',
        source: 'WCAG AI Dashboard'
      }
    })
  });
}
```

## Screenshots

### Healthy System
![Healthy Dashboard](docs/healthy.png)

### Active Alerts
![Dashboard with Alerts](docs/alerts.png)

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## License

MIT - See LICENSE file for details

---

**Need help?** Open an issue or see the main deployment README.
