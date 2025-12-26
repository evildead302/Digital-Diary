// drive.js - GitHub Pages Compatible Google Drive API
console.log("🚀 drive.js loading on GitHub Pages...");

// Global error tracking
window.driveSyncError = null;
window.driveSyncLoaded = false;

class GoogleDriveSync {
    constructor() {
        console.log("🔧 GoogleDriveSync constructor called");
        
        this.CLIENT_ID = null;
        this.API_KEY = null;
        this.SCOPES = 'https://www.googleapis.com/auth/drive.file';
        this.discoveryDocs = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
        
        this.tokenClient = null;
        this.gapiInited = false;
        this.gisInited = false;
        this.isConnected = false;
        this.accessToken = null;
        this.folderId = null;
        
        // Check if we're on GitHub Pages
        this.isGitHubPages = window.location.hostname.includes('github.io');
        console.log("🌐 Running on GitHub Pages:", this.isGitHubPages);
        
        // Initialize
        this.loadConfig();
    }
    
    // Load configuration from localStorage
    loadConfig() {
        try {
            const configStr = localStorage.getItem('gdriveConfig');
            
            if (!configStr || configStr === '{}') {
                this.isConfigured = false;
                this.isConnected = false;
                return false;
            }
            
            const config = JSON.parse(configStr);
            
            this.CLIENT_ID = config.clientId || null;
            this.API_KEY = config.apiKey || null;
            this.folderId = config.folderId || null;
            this.accessToken = config.accessToken || null;
            
            this.isConfigured = !!this.CLIENT_ID && !!this.API_KEY && !!this.folderId;
            this.isConnected = this.isConfigured && !!this.accessToken;
            
            console.log("✅ Config loaded - isConfigured:", this.isConfigured);
            return this.isConfigured;
            
        } catch (error) {
            console.error('Error loading config:', error);
            this.isConfigured = false;
            this.isConnected = false;
            window.driveSyncError = error;
            return false;
        }
    }
    
    // Save configuration to localStorage
    saveConfig(clientId, apiKey, folderId) {
        try {
            console.log("💾 Saving config on GitHub Pages...");
            
            if (!clientId || !clientId.trim()) {
                throw new Error('Client ID is required');
            }
            
            if (!apiKey || !apiKey.trim()) {
                throw new Error('API Key is required');
            }
            
            if (!folderId || !folderId.trim()) {
                throw new Error('Folder ID is required');
            }
            
            // For GitHub Pages, we MUST have the correct redirect URI
            const currentUrl = window.location.origin + window.location.pathname;
            console.log("🌐 Current URL:", currentUrl);
            
            if (this.isGitHubPages) {
                console.log("⚠️  IMPORTANT: Make sure your Google Cloud Console OAuth redirect URI matches:", currentUrl);
                alert('⚠️ For GitHub Pages:\n1. Go to Google Cloud Console\n2. Add Authorized Redirect URI:\n' + currentUrl + '\n3. Wait 5 minutes before testing');
            }
            
            const config = {
                clientId: clientId.trim(),
                apiKey: apiKey.trim(),
                folderId: folderId.trim(),
                accessToken: this.accessToken,
                lastSaved: new Date().toISOString(),
                githubPagesUrl: this.isGitHubPages ? currentUrl : null
            };
            
            localStorage.setItem('gdriveConfig', JSON.stringify(config));
            
            this.CLIENT_ID = config.clientId;
            this.API_KEY = config.apiKey;
            this.folderId = config.folderId;
            this.isConfigured = true;
            
            console.log("✅ Config saved successfully");
            return true;
            
        } catch (error) {
            console.error('Save config error:', error);
            window.driveSyncError = error;
            return false;
        }
    }
    
    // Get configuration status
    getConfigStatus() {
        return {
            isConfigured: this.isConfigured,
            isConnected: this.isConnected,
            hasClientId: !!this.CLIENT_ID,
            hasApiKey: !!this.API_KEY,
            hasFolderId: !!this.folderId,
            hasToken: !!this.accessToken,
            isGitHubPages: this.isGitHubPages
        };
    }
    
    // Clear configuration
    clearConfig() {
        try {
            localStorage.removeItem('gdriveConfig');
            this.CLIENT_ID = null;
            this.API_KEY = null;
            this.folderId = null;
            this.accessToken = null;
            this.isConfigured = false;
            this.isConnected = false;
            
            console.log("✅ Config cleared");
            return true;
        } catch (error) {
            console.error('Clear config error:', error);
            return false;
        }
    }
    
    // Initialize Google APIs - Modified for GitHub Pages
    async init() {
        console.log("🚀 Initializing Google APIs for GitHub Pages...");
        
        if (!this.isConfigured) {
            throw new Error('Google Drive not configured. Please enter credentials in Settings.');
        }
        
        try {
            // Check if scripts are blocked
            await this.checkScriptsLoaded();
            return true;
        } catch (error) {
            console.error('Failed to initialize:', error);
            
            if (this.isGitHubPages) {
                console.log("⚠️  GitHub Pages may block Google scripts. Trying alternative approach...");
                // Don't throw error, just warn
                return false;
            }
            
            throw error;
        }
    }
    
    // Check if required scripts are loaded
    async checkScriptsLoaded() {
        return new Promise((resolve, reject) => {
            console.log("🔍 Checking for Google scripts...");
            
            // Try to load GAPI if not present
            if (!window.gapi) {
                console.log("📥 GAPI not found, attempting to load...");
                this.loadScript('https://apis.google.com/js/api.js', 'gapi')
                    .then(() => {
                        console.log("✅ GAPI loaded");
                        resolve();
                    })
                    .catch(error => {
                        console.error("❌ Failed to load GAPI:", error);
                        if (this.isGitHubPages) {
                            // On GitHub Pages, we might need user interaction
                            console.log("ℹ️  On GitHub Pages, scripts may need to be loaded after user click");
                            resolve(); // Don't fail, just continue
                        } else {
                            reject(error);
                        }
                    });
            } else {
                console.log("✅ GAPI already loaded");
                resolve();
            }
        });
    }
    
    // Load script dynamically
    loadScript(src, name) {
        return new Promise((resolve, reject) => {
            // Check if already loading
            if (document.querySelector(`script[src="${src}"]`)) {
                console.log(`✅ ${name} script already loading`);
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                console.log(`✅ ${name} script loaded successfully`);
                resolve();
            };
            
            script.onerror = () => {
                console.error(`❌ Failed to load ${name} script`);
                reject(new Error(`Failed to load ${name}`));
            };
            
            console.log(`📥 Adding ${name} script to page...`);
            document.head.appendChild(script);
        });
    }
    
    // Connect to Google Drive - Modified for GitHub Pages
    async connect() {
        console.log("🔗 Attempting to connect on GitHub Pages...");
        
        if (!this.isConfigured) {
            throw new Error('Please configure Google Drive credentials first.');
        }
        
        if (this.isGitHubPages) {
            console.log("⚠️  GitHub Pages requires manual auth flow");
            
            // Show instructions for GitHub Pages
            const authUrl = this.getAuthUrl();
            const message = `GitHub Pages cannot open popups automatically.\n\nPlease:\n1. Click OK\n2. A new tab will open\n3. Login with Google\n4. Copy the authorization code\n5. Paste it back here`;
            
            if (confirm(message)) {
                window.open(authUrl, '_blank');
                
                // Prompt for auth code
                const authCode = prompt('After logging in, copy the authorization code from the URL and paste it here:');
                if (authCode) {
                    return this.exchangeCodeForToken(authCode);
                }
            }
            
            throw new Error('Authentication cancelled');
        }
        
        // Regular flow for non-GitHub Pages
        try {
            await this.init();
            return this.regularConnect();
        } catch (error) {
            console.error('Connect error:', error);
            throw error;
        }
    }
    
    // Regular connection flow
    regularConnect() {
        return new Promise((resolve, reject) => {
            if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
                this.loadScript('https://accounts.google.com/gsi/client', 'gis')
                    .then(() => {
                        this.setupTokenClient(resolve, reject);
                    })
                    .catch(reject);
            } else {
                this.setupTokenClient(resolve, reject);
            }
        });
    }
    
    // Setup token client
    setupTokenClient(resolve, reject) {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: this.CLIENT_ID,
            scope: this.SCOPES,
            callback: (resp) => {
                if (resp.error) {
                    reject(resp);
                    return;
                }
                
                this.accessToken = window.gapi.client.getToken().access_token;
                this.isConnected = true;
                this.saveConfig();
                resolve(true);
            }
        });
        
        if (window.gapi.client.getToken() === null) {
            this.tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            this.tokenClient.requestAccessToken({ prompt: '' });
        }
    }
    
    // Generate auth URL for manual flow (GitHub Pages)
    getAuthUrl() {
        const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
        const scope = encodeURIComponent(this.SCOPES);
        
        return `https://accounts.google.com/o/oauth2/v2/auth?` +
               `client_id=${this.CLIENT_ID}&` +
               `redirect_uri=${redirectUri}&` +
               `response_type=code&` +
               `scope=${scope}&` +
               `access_type=offline&` +
               `prompt=consent`;
    }
    
    // Exchange auth code for token (GitHub Pages)
    async exchangeCodeForToken(code) {
        console.log("🔄 Exchanging code for token...");
        
        // This would require a backend server
        // For GitHub Pages, you need a serverless function
        alert('For GitHub Pages, you need a backend server to exchange the code.\n\nUse:\n1. Google Cloud Functions\n2. AWS Lambda\n3. Vercel/Netlify functions\n\nSee app.js comments for implementation.');
        
        throw new Error('Server-side token exchange required for GitHub Pages');
    }
    
    // Test connection
    async testConnection() {
        console.log("🧪 Testing connection...");
        
        if (!this.isConfigured) {
            return { success: false, message: 'Not configured' };
        }
        
        try {
            if (this.isGitHubPages) {
                return {
                    success: false,
                    message: '⚠️ GitHub Pages limitation: Full OAuth requires backend server.\n\nYou can save credentials but connecting needs serverless function.'
                };
            }
            
            await this.init();
            
            if (!this.isConnected) {
                return { success: false, message: 'Not connected. Please connect first.' };
            }
            
            return {
                success: true,
                message: '✅ Connected successfully!'
            };
            
        } catch (error) {
            console.error('Test failed:', error);
            return {
                success: false,
                message: `❌ Connection failed: ${error.message}`
            };
        }
    }
    
    // Stub methods for compatibility
    async listFiles() { 
        console.log("⚠️  listFiles requires connection");
        return []; 
    }
    
    async uploadEntries(entries) {
        console.log("⚠️  uploadEntries requires connection");
        return { success: false, message: 'GitHub Pages limitation' };
    }
    
    async restoreFromDrive() {
        console.log("⚠️  restoreFromDrive requires connection");
        return [];
    }
}

// Create global instance
try {
    console.log("🏗️ Creating driveSync instance...");
    const driveSync = new GoogleDriveSync();
    window.driveSync = driveSync;
    window.driveSyncLoaded = true;
    
    console.log("✅ drive.js loaded on GitHub Pages");
    console.log("📊 Initial status:", driveSync.getConfigStatus());
    
} catch (error) {
    console.error('❌ Error creating driveSync:', error);
    
    // Create minimal fallback
    window.driveSync = {
        isConfigured: false,
        isConnected: false,
        saveConfig: function(clientId, apiKey, folderId) {
            try {
                const config = { clientId, apiKey, folderId };
                localStorage.setItem('gdriveConfig', JSON.stringify(config));
                return true;
            } catch (e) {
                console.error('Fallback save error:', e);
                return false;
            }
        },
        getConfigStatus: function() {
            return { isConfigured: false, isConnected: false };
        },
        clearConfig: function() {
            localStorage.removeItem('gdriveConfig');
            return true;
        }
    };
}

// Debug helper
window.debugDriveSync = function() {
    console.log("=== DRIVE SYNC DEBUG ===");
    console.log("GitHub Pages:", window.location.hostname.includes('github.io'));
    console.log("driveSync exists:", typeof window.driveSync !== 'undefined');
    console.log("driveSync status:", window.driveSync?.getConfigStatus?.());
    console.log("localStorage config:", localStorage.getItem('gdriveConfig'));
    console.log("=== END DEBUG ===");
};