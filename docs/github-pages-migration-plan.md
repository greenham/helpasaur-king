# GitHub Pages Migration Plan

This document outlines the complete migration process for moving the Helpasaur King web application from Docker container hosting to GitHub Pages static hosting.

## Phase 1: Pre-Migration Preparation (Before PR Merge)

### 1.1 GitHub Repository Setup
- [ ] **Enable GitHub Pages** in repository settings
  - Go to Settings → Pages
  - Source: Deploy from a branch
  - Branch: `gh-pages` (will be created by the workflow)
  - Folder: `/` (root)

### 1.2 GitHub Secrets Configuration
- [ ] **Add required secrets** to repository (Settings → Secrets and variables → Actions):
  - `API_HOST`: Set to `https://api.helpasaur.com`
  - `TWITCH_APP_CLIENT_ID`: Your Twitch app client ID
  - Verify `DROPLET_IP`, `DROPLET_USER`, `DROPLET_SSH_KEY`, `DEPLOY_PATH` exist for backend deployment

### 1.3 Initial GitHub Pages Deployment Test
- [ ] **Merge the PR** to main branch
- [ ] **Manually trigger** the GitHub Pages workflow:
  - Go to Actions → Deploy to GitHub Pages → Run workflow
  - Verify successful build and deployment
- [ ] **Check deployment** at: `https://greenham.github.io/helpasaur-king/`
  - Test basic functionality
  - Verify API calls work (CORS should be configured)
  - Check console for any errors

## Phase 2: DNS Pre-Configuration

### 2.1 Current DNS Setup Review
- [ ] **Document current DNS records** for helpasaur.com:
  - A record pointing to your server IP
  - Any other records (MX, TXT, etc.)

### 2.2 Prepare DNS Changes
- [ ] **Plan new DNS configuration**:
  ```
  helpasaur.com:
  - REMOVE: A record → Your server IP
  - ADD: CNAME record → greenham.github.io
  
  api.helpasaur.com: (no change)
  - Keep: A record → Your server IP
  
  rw.helpasaur.com: (no change)  
  - Keep: A record → Your server IP
  
  status.helpasaur.com: (if implementing monitoring)
  - Keep: A record → Your server IP
  ```

## Phase 3: Migration Execution

### 3.1 Final Pre-Migration Checks
- [ ] **Verify GitHub Pages is working** at github.io URL
- [ ] **Test all critical paths**:
  - Command search
  - Stream listing
  - Twitch authentication flow
  - Admin functions (if applicable)

### 3.2 DNS Cutover
- [ ] **Update DNS records** at your registrar:
  1. Delete A record for helpasaur.com
  2. Add CNAME record: helpasaur.com → greenham.github.io
  3. Keep TTL low initially (300-600 seconds) for quick rollback if needed

### 3.3 Server-Side Cleanup
- [ ] **Deploy backend changes** using production deployment workflow:
  ```bash
  # This will automatically:
  # 1. Deploy web to GitHub Pages
  # 2. Update backend services without web container
  ```
- [ ] **Verify nginx is no longer listening** for helpasaur.com
- [ ] **Clean up old web container** remnants:
  ```bash
  docker ps -a | grep helpa-web  # Should return nothing
  docker images | grep helpa-web  # Remove if exists
  ```

## Phase 4: Post-Migration Verification

### 4.1 DNS Propagation Monitoring
- [ ] **Monitor DNS propagation**:
  - Use https://www.whatsmydns.net/#CNAME/helpasaur.com
  - Wait for global propagation (usually 1-4 hours with low TTL)

### 4.2 Functionality Testing
- [ ] **Test from multiple locations/devices**:
  - Clear browser cache
  - Test all major features
  - Verify HTTPS certificate (GitHub provides automatically)
  - Check that old direct links still work

### 4.3 Performance Verification
- [ ] **Compare performance metrics**:
  - Page load times (should be faster via CDN)
  - Time to First Byte (TTFB)
  - Global accessibility (test from different regions)

## Phase 5: Finalization

### 5.1 TTL Adjustment
- [ ] **After 24-48 hours of stable operation**:
  - Increase DNS TTL to normal values (3600-86400 seconds)

### 5.2 Documentation Updates
- [ ] **Update any documentation** referencing the old setup
- [ ] **Update README** if it mentions local web container

### 5.3 Cleanup
- [ ] **Remove old SSL certificates** for helpasaur.com from server:
  ```bash
  # After confirming everything works
  sudo rm -rf /etc/letsencrypt/live/helpasaur.com/
  sudo rm -rf /etc/letsencrypt/archive/helpasaur.com/
  sudo rm -rf /etc/letsencrypt/renewal/helpasaur.com.conf
  ```

## Rollback Plan (If Needed)

If issues arise, you can quickly rollback:

### Option 1: DNS Rollback (Fastest - 5-10 minutes with low TTL)
- Change CNAME back to A record pointing to your server
- Deploy old nginx configuration with web proxy

### Option 2: Full Rollback (Complete reversion)
- Revert the PR changes
- Rebuild and deploy web container
- Restore nginx configuration
- Update DNS back to A record

## Timeline Estimate

- **Phase 1**: 30 minutes
- **Phase 2**: 15 minutes  
- **Phase 3**: 1-2 hours (including DNS propagation wait)
- **Phase 4**: 2-4 hours (monitoring period)
- **Phase 5**: 15 minutes (after 24-48 hour stability period)

**Total Active Time**: ~3-4 hours  
**Total Duration**: 24-48 hours for full completion

## Success Criteria

✅ Web app accessible via helpasaur.com through GitHub Pages  
✅ All functionality working (auth, API calls, etc.)  
✅ Performance improved or maintained  
✅ No web container running on server  
✅ Backend services (API, bots) functioning normally  
✅ SSL certificates automatically managed by GitHub  

## Notes

- GitHub Pages automatically provides SSL certificates for custom domains
- The CNAME file in the repository root ensures the custom domain persists across deployments
- Client-side routing is handled by the 404.html fallback
- API CORS settings should already allow requests from helpasaur.com

## Related Files

- Workflow: `.github/workflows/deploy-gh-pages.yml`
- Production deployment: `.github/workflows/deploy-to-prod.yml`
- Nginx config: `nginx/nginx.prod.conf`
- PR: #89