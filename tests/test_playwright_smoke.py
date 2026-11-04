import socket
import subprocess
import time
import pytest
from playwright.sync_api import sync_playwright

pytest.importorskip("playwright.sync_api", reason="Playwright is optional in local test environments.")

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

@pytest.fixture(scope="module")
def next_server():
    server_process = None
    if not is_port_open(3000):
        # Start Next.js development server
        server_process = subprocess.Popen("pnpm dev", shell=True)
        # Wait up to 30 seconds for the server to start
        for _ in range(30):
            if is_port_open(3000):
                break
            time.sleep(1)
    yield "http://localhost:3000"
    if server_process:
        # Kill the child processes gracefully on Windows
        subprocess.call("taskkill /F /T /PID " + str(server_process.pid), shell=True)

def test_routes_desktop_and_mobile(next_server):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # Test desktop
        page_desktop = browser.new_page(viewport={"width": 1280, "height": 720})
        page_desktop.set_default_navigation_timeout(60000)
        # Test mobile
        page_mobile = browser.new_page(viewport={"width": 375, "height": 667})
        page_mobile.set_default_navigation_timeout(60000)

        routes = [
            "/",
            "/dashboard",
            "/perspectives",
            "/robots",
            "/inventory",
            "/contributions",
            "/analytics",
            "/database",
            "/submit-data",
            "/profile",
            "/admin"
        ]

        # Process each viewport
        for page in [page_desktop, page_mobile]:
            # Login as Admin first to ensure all pages render without permission errors
            page.goto(f"{next_server}/profile")
            page.wait_for_timeout(1000)
            
            # Click the Login as Admin button
            admin_btn = page.query_selector('button:has-text("Login as Administrator")')
            if admin_btn:
                admin_btn.click()
                page.wait_for_timeout(1000)

            # Now visit all pages and check for loading
            for route in routes:
                url = f"{next_server}{route}"
                response = page.goto(url)
                assert response.status == 200, f"Failed to load {route} (status: {response.status})"
                
                # Check for h1 tag indicating a loaded screen
                h1_el = page.query_selector("h1")
                assert h1_el is not None, f"Blank page on {route}"
                assert len(h1_el.inner_text().strip()) > 0, f"Empty h1 on {route}"

        browser.close()
