# Care Tracker - Vercel Deployment Guide

## Overview

This guide explains how to deploy the Care Tracker application to Vercel with the integrated PDF processing serverless function.

## Architecture Changes

✅ **Converted Python Backend to Vercel Serverless Function**
- Replaced standalone Python Flask server with Next.js API route
- PDF processing now runs as serverless function at `/api/upload`
- Uses `pdf-parse` library for PDF text extraction
- Integrates with Claude API for task extraction

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Claude API Key**: Get your API key from [Anthropic Console](https://console.anthropic.com)

## Deployment Steps

### 1. Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### 2. Deploy via GitHub Integration (Recommended)

1. **Connect Repository to Vercel**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - **IMPORTANT**: Deploy from the `vercel-serverless-pdf` branch
   - Leave root directory as default (Vercel will use root-level vercel.json configuration)

2. **Configure Build Settings**:
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: Leave blank (configured via vercel.json)
   - Build Command: Auto-detected from vercel.json
   - Output Directory: Auto-detected from vercel.json

3. **Set Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add: `ANTHROPIC_API_KEY` = `your_claude_api_key_here`

4. **Deploy**:
   - Click "Deploy"
   - Vercel will automatically build and deploy your application

### 3. Deploy via CLI (Alternative)

```bash
cd care-tracker
vercel
```

Follow the prompts and set your environment variables when asked.

## Environment Variables

The following environment variables need to be configured in Vercel:

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Claude API key for PDF processing | Yes |

## Vercel Configuration

The [`vercel.json`](vercel.json) file includes:

```json
{
  "functions": {
    "src/app/api/upload/route.ts": {
      "maxDuration": 60
    }
  },
  "env": {
    "ANTHROPIC_API_KEY": "@anthropic_api_key"
  }
}
```

- **maxDuration**: Allows up to 60 seconds for PDF processing
- **env**: References the environment variable for the API key

## API Endpoint

Once deployed, your PDF processing API will be available at:
```
https://your-app-name.vercel.app/api/upload
```

## Testing the Deployment

1. **Access Your App**: Visit your Vercel deployment URL
2. **Complete Onboarding**: Go through the 4-step onboarding process
3. **Upload PDF**: Test with a sample discharge instruction PDF
4. **Verify Processing**: Check that tasks appear in the timeline

## Monitoring and Debugging

### Vercel Dashboard
- **Functions**: Monitor serverless function performance
- **Analytics**: Track usage and performance metrics
- **Logs**: View real-time function logs

### Browser Console
- Use `window.pdfLogger.getLogs()` to view detailed upload logs
- Export logs with `window.pdfLogger.exportLogs(uploadId)`

## Performance Considerations

### Serverless Function Limits
- **Execution Time**: 60 seconds (configured in vercel.json)
- **Memory**: 1024MB (Vercel default)
- **Payload Size**: 4.5MB (Vercel limit)

### PDF Processing
- Large PDFs may take longer to process
- Claude API calls add latency
- Consider implementing caching for repeated uploads

## Troubleshooting

### Common Issues

1. **Environment Variable Not Set**
   ```
   Error: Missing Anthropic API Key
   ```
   **Solution**: Ensure `ANTHROPIC_API_KEY` is set in Vercel dashboard

2. **Function Timeout**
   ```
   Error: Function execution timed out
   ```
   **Solution**: Increase `maxDuration` in vercel.json or optimize PDF processing

3. **PDF Parse Error**
   ```
   Error: Failed to extract text from PDF
   ```
   **Solution**: Ensure PDF is not corrupted and contains extractable text

### Debug Steps

1. **Check Vercel Function Logs**:
   - Go to Vercel Dashboard → Functions
   - View real-time logs during PDF upload

2. **Use Browser Console**:
   ```javascript
   // View all logs
   window.pdfLogger.getLogs()
   
   // Export specific upload logs
   window.pdfLogger.exportLogs('upload-id-here')
   ```

3. **Test API Directly**:
   ```bash
   curl -X POST https://your-app.vercel.app/api/upload \
     -H "Content-Type: application/json" \
     -d '{"uploadMetadata":{"uploadId":"test","fileName":"test.pdf"},"fileData":{"base64Content":"..."}}'
   ```

## Migration from Python Backend

If you were previously using the Python backend:

1. **Remove Python Dependencies**: No longer need to run `python3 pdf-reader-ai.py`
2. **Update API Calls**: Frontend now calls `/api/upload` instead of `http://localhost:5000/api/upload`
3. **Environment Variables**: Move `ANTHROPIC_API_KEY` from `.env` to Vercel dashboard

## Next Steps

After successful deployment:

1. **Custom Domain**: Configure a custom domain in Vercel settings
2. **Analytics**: Enable Vercel Analytics for usage insights
3. **Monitoring**: Set up alerts for function errors
4. **Performance**: Monitor Core Web Vitals and optimize as needed

## Support

For deployment issues:
- Check [Vercel Documentation](https://vercel.com/docs)
- Review function logs in Vercel dashboard
- Use the troubleshooting guide above
- Check browser console for frontend errors

---

**Deployment Status**: ✅ Ready for Production
**Last Updated**: 2025-06-21