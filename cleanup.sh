echo "Cleaning up zombie Chrome processes..."
pkill -f chrome
pkill -f chromium
pkill -f chromedriver

echo "Cleaning up temporary browser data directories..."
# Find and remove Chrome temporary directories
find /tmp -maxdepth 1 -name 'chrome_*' -type d -exec rm -rf {} \; 2>/dev/null
find /tmp -maxdepth 1 -name 'puppeteer_*' -type d -exec rm -rf {} \; 2>/dev/null

echo "Cleanup complete!"
