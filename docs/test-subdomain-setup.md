# Test Subdomain Setup for GitHub Pages

## DNS Configuration

Add the following CNAME record to your DNS provider:

| Type | Host | Value |
|------|------|-------|
| CNAME | preview | greenham.github.io |

**Note**: Use `preview` as the host (not `preview.helpasaur.com`) - your DNS provider will automatically append the domain.

## API CORS Configuration

Update the production API server's `API_CORS_ORIGINS_WHITELIST` environment variable to include the test subdomain:

```
API_CORS_ORIGINS_WHITELIST=https://helpasaur.com,https://greenham.github.io,https://preview.helpasaur.com
```

After updating the `.env` file:
```bash
docker compose up -d --force-recreate api-server
```

## Deployment

### Deploy to test subdomain (preview.helpasaur.com)
```bash
# Using GitHub UI:
# Go to Actions → Deploy to GitHub Pages → Run workflow
# Enter "preview.helpasaur.com" in the custom_domain field

# Using gh CLI:
gh workflow run deploy-gh-pages.yml -f custom_domain=preview.helpasaur.com
```

### Deploy to github.io (current default)
```bash
# Using GitHub UI:
# Go to Actions → Deploy to GitHub Pages → Run workflow
# Leave custom_domain empty

# Using gh CLI:
gh workflow run deploy-gh-pages.yml
```

## Verification Steps

1. **Check DNS propagation** (wait 5-30 minutes):
   ```bash
   dig preview.helpasaur.com
   # Should show CNAME to greenham.github.io
   ```

2. **Verify GitHub Pages settings**:
   - Repository Settings → Pages
   - Should show "Your site is live at https://preview.helpasaur.com"

3. **Test the site**:
   - Navigate to https://preview.helpasaur.com
   - Check browser console for errors
   - Verify API calls work (no CORS errors)
   - Test all navigation links (should be root-relative, not subdirectory)

## Differences from github.io deployment

| Aspect | github.io/helpasaur-king | preview.helpasaur.com |
|--------|--------------------------|----------------------|
| PUBLIC_URL | /helpasaur-king | / |
| Parcel build flag | --public-url /helpasaur-king/ | (none) |
| CNAME file | Not created | Created with domain |
| Asset paths | /helpasaur-king/assets/... | /assets/... |
| Router basename | /helpasaur-king | / |

## Final Migration Plan

Once testing on `preview.helpasaur.com` is successful:

1. Update DNS: Change `helpasaur.com` and `www.helpasaur.com` from A records to CNAME → greenham.github.io
2. Deploy with `custom_domain=helpasaur.com`
3. Remove `preview.helpasaur.com` CNAME record (optional)