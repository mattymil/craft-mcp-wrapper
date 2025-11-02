# AWS Lambda Deployment Guide

## Quick Start

### 1. Prerequisites

- AWS CLI installed and configured
- Node.js 20.x or later
- AWS account with appropriate permissions

### 2. Configure AWS Credentials

```bash
aws configure
```

Provide:
- AWS Access Key ID
- AWS Secret Access Key  
- Default region (e.g., `us-east-1`)
- Output format (e.g., `json`)

### 3. Build and Deploy

```bash
# Build TypeScript
npm run build

# Deploy to AWS (creates Lambda + API Gateway)
npm run deploy
```

### 4. Get Your API Endpoint

After deployment, note the API Gateway endpoint URL:
```
https://{api-id}.execute-api.{region}.amazonaws.com/
```

## Deployment Commands

| Command | Description |
|---------|-------------|
| `npm run deploy` | Deploy to default stage (dev) |
| `npm run deploy:dev` | Deploy to dev stage |
| `npm run deploy:prod` | Deploy to production stage |
| `npm run package` | Package without deploying |
| `npm run info` | View deployment information |
| `npm run logs` | Tail Lambda logs in real-time |
| `npm run remove` | Remove Lambda deployment |
| `npm run offline` | Test locally with serverless-offline |

## Environment Variables

Set before deployment:

```bash
export MCP_API_KEY="your-secret-key"
npm run deploy
```

Or edit `serverless.yml`:
```yaml
provider:
  environment:
    MCP_API_KEY: ${env:MCP_API_KEY, ''}
```

## Testing Your Deployment

### Health Check

```bash
curl https://{your-api-id}.execute-api.us-east-1.amazonaws.com/health
```

Expected response:
```json
{
  "status": "ok",
  "activeConnections": 0
}
```

### SSE Endpoint

```bash
curl https://{your-api-id}.execute-api.us-east-1.amazonaws.com/sse
```

### Invoke Tools

First, establish SSE connection, then POST to `/messages`.

## Monitoring

### View Logs

```bash
# Real-time logs
npm run logs

# CloudWatch Logs Console
aws logs tail /aws/lambda/craft-mcp-wrapper-dev-api --follow
```

### CloudWatch Metrics

Monitor in AWS Console:
- Lambda → Functions → craft-mcp-wrapper-dev-api
- Metrics: Invocations, Duration, Errors, Throttles

## Cost Optimization

### Current Configuration

- Runtime: Node.js 20.x
- Memory: 512 MB
- Timeout: 30 seconds

### Estimated Costs

For 10,000 requests/month:
- Lambda: Free tier (1M requests included)
- API Gateway: $0.01/month
- Total: **~$0.01/month**

### Optimization Tips

1. **Reduce Memory**: Lower to 256 MB if sufficient
2. **Timeout**: Reduce if operations complete faster
3. **Reserved Concurrency**: Set if you have predictable traffic
4. **Provisioned Concurrency**: Eliminate cold starts (costs more)

## Troubleshooting

### Deployment Fails

**Error: "Credentials not configured"**
```bash
aws configure
```

**Error: "Stack already exists"**
```bash
npm run remove
npm run deploy
```

### Lambda Errors

**Check logs:**
```bash
npm run logs
```

**Common issues:**
- Missing environment variables
- config.json not included in package
- Incorrect IAM permissions

### Cold Starts

First request after idle period (~5-15 minutes) may be slow.

**Solutions:**
1. Accept 1-2 second delay (most cost-effective)
2. Use provisioned concurrency (costs more)
3. Implement keep-alive pings

## Updating Your Deployment

### Update Code

```bash
# Make changes to src/
npm run build
npm run deploy
```

### Update Configuration

Edit `serverless.yml`, then:
```bash
npm run deploy
```

### Update Environment Variables

```bash
export MCP_API_KEY="new-key"
npm run deploy
```

## Stages

Deploy multiple environments:

```bash
# Development
npm run deploy:dev

# Production  
npm run deploy:prod
```

Each stage creates separate:
- Lambda function
- API Gateway
- CloudWatch log groups

## Cleanup

Remove all AWS resources:

```bash
# Remove default stage
npm run remove

# Remove specific stage
npm run remove:prod
```

This deletes:
- Lambda function
- API Gateway
- CloudWatch log groups
- CloudFormation stack

## Security

### API Key Authentication

Set `MCP_API_KEY` environment variable:
```bash
export MCP_API_KEY="your-secure-key"
npm run deploy
```

Access with:
```bash
curl https://{api-id}.execute-api.us-east-1.amazonaws.com/sse?api_key=your-secure-key
```

### IAM Permissions

Lambda needs:
- `logs:CreateLogGroup`
- `logs:CreateLogStream`
- `logs:PutLogEvents`

Configured automatically in `serverless.yml`.

### Network Security

Consider adding:
- API Gateway resource policies
- VPC configuration (if accessing private resources)
- WAF (Web Application Firewall)
- CloudFront for CDN/DDoS protection

## Next Steps

1. **Custom Domain**: Add custom domain via API Gateway
2. **Monitoring**: Set up CloudWatch alarms
3. **CI/CD**: Automate deployment with GitHub Actions
4. **Backup**: Export `config.json` and `serverless.yml`
5. **Documentation**: Update with your API endpoint URL

## Support

- [Serverless Framework Docs](https://www.serverless.com/framework/docs)
- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)
- [API Gateway Docs](https://docs.aws.amazon.com/apigateway/)
