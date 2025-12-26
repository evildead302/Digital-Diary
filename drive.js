// drive.js - Google Drive API with GitHub Pages fallback
console.log("🚀 drive.js loading...");

// Create global driveSync immediately
window.driveSync = {
    isConfigured: false,
    isConnected: false,
    CLIENT_ID: null,
    API_KEY: null,
    folderId: null,
    accessToken: null,
    isGitHubPages: window.location.hostname.includes('github.io'),
    
    // Basic methods that will always work
    loadConfig: function() {
        try {
            const configStr = localStorage.getItem('gdriveConfig');
            if (!configStr || configStr === '{}') {
                this.isConfigured = false;
                this.isConnected = false;
                return false;
            }
            
            const config = JSON.parse(configStr);
            console.log("📊 Config loaded from localStorage:", config);
            
            this.CLIENT_ID = config.clientId || null;
            this.API_KEY = config.apiKey || null;
            this.folderId = config.folderId || null;
            this.accessToken = config.accessToken || null;
            
            this.isConfigured = !!this.CLIENT_ID && !!this.API_KEY && !!this.folderId;
            this.isConnected = this.isConfigured && !!this.accessToken;
            
            console.log("✅ Config loaded - isConfigured:", this.isConfigured, "isConnected:", this.isConnected);
            return this.isConfigured;
        } catch (error) {
            console.error('❌ Error loading config:', error);
            this.isConfigured = false;
            this.isConnected = false;
            return false;
        }
    },
    
    saveConfig: function(clientId, apiKey, folderId) {
        try {
            console.log("💾 Saving config to localStorage...");
            
            // Validate inputs
            if (!clientId || !clientId.trim()) {
                throw new Error('Client ID is required');
            }
            
            if (!apiKey || !apiKey.trim()) {
                throw new Error('API Key is required');
            }
            
            if (!folderId || !folderId.trim()) {
                throw new Error('Folder ID is required');
            }
            
            const config = {
                clientId: clientId.trim(),
                apiKey: apiKey.trim(),
                folderId: folderId.trim(),
                accessToken: this.accessToken,
                savedAt: new Date().toISOString(),
                savedOnGitHubPages: this.isGitHubPages
            };
            
            console.log("📋 Config to save:", {
                clientId: config.clientId.substring(0, 20) + "...",
                apiKey: config.apiKey.substring(0, 10) + "...",
                folderId: config.folderId
            });
            
            // Save to localStorage
            localStorage.setItem('gdriveConfig', JSON.stringify(config));
            
            // Update instance
            this.CLIENT_ID = config.clientId;
            this.API_KEY = config.apiKey;
            this.folderId = config.folderId;
            this.isConfigured = true;
            
            console.log("✅ Config saved successfully to localStorage");
            
            // If on GitHub Pages, show special instructions
            if (this.isGitHubPages) {
                setTimeout(() => {
                    alert("✅ Credentials saved!\n\n⚠️ On GitHub Pages, full Google Drive connection may not work.\n\nTo use Google Drive:\n1. Export CSV from Backup page\n2. Upload manually to your Google Drive folder");
                }, 100);
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Save config error:', error);
            throw error;
        }
    },
    
    getConfigStatus: function() {
        const status = {
            isConfigured: this.isConfigured,
            isConnected: this.isConnected,
            hasClientId: !!this.CLIENT_ID,
            hasApiKey: !!this.API_KEY,
            hasFolderId: !!this.folderId,
            hasToken: !!this.accessToken,
            isGitHubPages: this.isGitHubPages,
            note: this.isGitHubPages ? "GitHub Pages - Export CSV for manual upload" : "Ready for Google Drive"
        };
        
        console.log("📊 Config status:", status);
        return status;
    },
    
    clearConfig: function() {
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
            console.error('❌ Clear config error:', error);
            return false;
        }
    }
};

// Try to initialize Google APIs, but with fallback
try {
    console.log("🔧 Attempting to initialize Google APIs...");
    
    // Check if Google APIs are available
    if (window.driveSync.isGitHubPages) {
        console.log("🌐 Running on GitHub Pages - Google APIs may be limited");
    }
    
    // Enhanced GoogleDriveSync class with better error handling
    class GoogleDriveSync {
        constructor() {
            console.log("🔧 GoogleDriveSync constructor called");
            Object.assign(this, window.driveSync);
            this.loadConfig();
            this.attemptGoogleLoad();
        }
        
        attemptGoogleLoad() {
            // Try to load Google scripts
            if (!this.isGitHubPages) {
                this.loadGoogleScripts();
            }
        }
        
        loadGoogleScripts() {
            console.log("📥 Loading Google scripts...");
            
            // Load GAPI
            if (!document.querySelector('script[src*="apis.google.com"]')) {
                const gapiScript = document.createElement('script');
                gapiScript.src = 'https://apis.google.com/js/api.js';
                gapiScript.async = true;
                gapiScript.defer = true;
                gapiScript.onload = () => console.log("✅ GAPI script loaded");
                gapiScript.onerror = () => console.warn("⚠️ Failed to load GAPI script");
                document.head.appendChild(gapiScript);
            }
            
            // Load GIS
            if (!document.querySelector('script[src*="accounts.google.com/gsi"]')) {
                const gisScript = document.createElement('script');
                gisScript.src = 'https://accounts.google.com/gsi/client';
                gisScript.async = true;
                gisScript.defer = true;
                gisScript.onload = () => console.log("✅ GIS script loaded");
                gisScript.onerror = () => console.warn("⚠️ Failed to load GIS script");
                document.head.appendChild(gisScript);
            }
        }
        
        async init() {
            console.log("🚀 Initializing Google APIs...");
            
            if (!this.isConfigured) {
                throw new Error('Google Drive not configured. Please save credentials first.');
            }
            
            // Check if we're on GitHub Pages
            if (this.isGitHubPages) {
                console.log("⚠️ On GitHub Pages - Google API may be blocked");
                return false;
            }
            
            try {
                // Wait for gapi to load
                await this.waitForGAPI();
                
                // Initialize gapi client
                if (window.gapi && window.gapi.client) {
                    await window.gapi.client.init({
                        apiKey: this.API_KEY,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                    });
                    console.log("✅ GAPI client initialized");
                    return true;
                } else {
                    throw new Error('GAPI not available');
                }
            } catch (error) {
                console.error('❌ Failed to initialize Google APIs:', error);
                console.log("⚠️ Falling back to local storage only mode");
                return false;
            }
        }
        
        waitForGAPI() {
            return new Promise((resolve, reject) => {
                console.log("⏳ Waiting for GAPI...");
                
                let attempts = 0;
                const maxAttempts = 30; // 3 seconds max
                
                const checkInterval = setInterval(() => {
                    attempts++;
                    
                    if (window.gapi && window.gapi.load) {
                        clearInterval(checkInterval);
                        console.log("✅ GAPI found after", attempts, "attempts");
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        clearInterval(checkInterval);
                        console.error("❌ GAPI not found after", maxAttempts, "attempts");
                        reject(new Error('Google API failed to load'));
                    }
                }, 100);
            });
        }
        
        async connect() {
            console.log("🔗 Connecting to Google Drive...");
            
            if (!this.isConfigured) {
                throw new Error('Please configure Google Drive credentials first.');
            }
            
            if (this.isGitHubPages) {
                const message = "⚠️ GitHub Pages cannot connect to Google Drive directly.\n\n" +
                              "Please:\n" +
                              "1. Export CSV from Backup page\n" +
                              "2. Upload manually to your Google Drive folder\n" +
                              "3. Or run the app locally (open index.html from your computer)";
                alert(message);
                throw new Error(message);
            }
            
            try {
                // Initialize APIs
                const initialized = await this.init();
                if (!initialized) {
                    throw new Error('Failed to initialize Google APIs');
                }
                
                // Wait for GIS
                await this.waitForGIS();
                
                return new Promise((resolve, reject) => {
                    console.log("🔑 Creating token client...");
                    
                    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
                        reject(new Error('Google Identity Services not available'));
                        return;
                    }
                    
                    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                        client_id: this.CLIENT_ID,
                        scope: 'https://www.googleapis.com/auth/drive.file',
                        callback: (response) => {
                            console.log("🔑 Token callback:", response);
                            
                            if (response.error) {
                                console.error('❌ Token error:', response);
                                reject(response);
                                return;
                            }
                            
                            try {
                                this.accessToken = window.gapi.client.getToken().access_token;
                                this.isConnected = true;
                                
                                // Update localStorage with token
                                const config = JSON.parse(localStorage.getItem('gdriveConfig') || '{}');
                                config.accessToken = this.accessToken;
                                localStorage.setItem('gdriveConfig', JSON.stringify(config));
                                
                                console.log("✅ Connected to Google Drive!");
                                resolve(true);
                            } catch (error) {
                                console.error('❌ Error processing token:', error);
                                reject(error);
                            }
                        }
                    });
                    
                    // Request token
                    console.log("🔑 Requesting access token...");
                    if (window.gapi.client.getToken() === null) {
                        this.tokenClient.requestAccessToken({ prompt: 'consent' });
                    } else {
                        this.tokenClient.requestAccessToken({ prompt: '' });
                    }
                });
                
            } catch (error) {
                console.error('❌ Connection error:', error);
                this.isConnected = false;
                
                // Show user-friendly error
                let userMessage = error.message;
                if (error.message.includes('popup blocked')) {
                    userMessage = 'Popup was blocked. Please allow popups for this site.';
                } else if (error.message.includes('access_denied')) {
                    userMessage = 'Access denied. Please grant permissions when prompted.';
                }
                
                throw new Error(userMessage);
            }
        }
        
        waitForGIS() {
            return new Promise((resolve, reject) => {
                console.log("⏳ Waiting for GIS...");
                
                let attempts = 0;
                const maxAttempts = 30;
                
                const checkInterval = setInterval(() => {
                    attempts++;
                    
                    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                        clearInterval(checkInterval);
                        console.log("✅ GIS found after", attempts, "attempts");
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        clearInterval(checkInterval);
                        console.error("❌ GIS not found after", maxAttempts, "attempts");
                        reject(new Error('Google Identity Services failed to load'));
                    }
                }, 100);
            });
        }
        
        async testConnection() {
            console.log("🧪 Testing connection...");
            
            if (!this.isConfigured) {
                return {
                    success: false,
                    message: '❌ Not configured. Please save credentials first.'
                };
            }
            
            if (this.isGitHubPages) {
                return {
                    success: false,
                    message: '⚠️ GitHub Pages cannot connect to Google Drive.\n\nExport CSV for manual upload or run locally.'
                };
            }
            
            try {
                if (!this.isConnected) {
                    return {
                        success: false,
                        message: '❌ Not connected. Click "Connect to Google Drive" first.'
                    };
                }
                
                // Try to list files to test connection
                if (window.gapi && window.gapi.client && window.gapi.client.drive) {
                    const response = await window.gapi.client.drive.files.list({
                        pageSize: 1,
                        fields: 'files(id, name)',
                        q: `'${this.folderId}' in parents`
                    });
                    
                    return {
                        success: true,
                        message: `✅ Connected successfully! Found ${response.result.files?.length || 0} files.`
                    };
                } else {
                    return {
                        success: false,
                        message: '⚠️ Google Drive API not loaded.'
                    };
                }
            } catch (error) {
                console.error('❌ Test failed:', error);
                return {
                    success: false,
                    message: `❌ Connection failed: ${error.message}`
                };
            }
        }
        
        // Upload entries (with fallback)
        async uploadEntries(entries) {
            console.log("📤 Attempting to upload", entries.length, "entries...");
            
            if (this.isGitHubPages) {
                throw new Error('Cannot upload directly from GitHub Pages. Export CSV and upload manually.');
            }
            
            if (!this.isConnected) {
                throw new Error('Not connected to Google Drive. Please connect first.');
            }
            
            if (!entries || entries.length === 0) {
                throw new Error('No entries to upload');
            }
            
            try {
                // Generate CSV
                const csv = this.entriesToCSV(entries);
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `accounts-export-${timestamp}.csv`;
                
                console.log("📄 Generated CSV, size:", csv.length, "bytes");
                
                // Upload to Drive
                const file = await this.uploadToDrive(filename, csv);
                
                return {
                    success: true,
                    filename: filename,
                    fileId: file.id,
                    entriesCount: entries.length,
                    message: `✅ Uploaded ${entries.length} entries to Google Drive`
                };
            } catch (error) {
                console.error('❌ Upload error:', error);
                throw new Error(`Upload failed: ${error.message}`);
            }
        }
        
        uploadToDrive(filename, content) {
            return new Promise((resolve, reject) => {
                const boundary = '-------314159265358979323846';
                const delimiter = "\r\n--" + boundary + "\r\n";
                const close_delim = "\r\n--" + boundary + "--";
                
                const metadata = {
                    'name': filename,
                    'mimeType': 'text/csv',
                    'parents': [this.folderId]
                };
                
                const multipartRequestBody =
                    delimiter +
                    'Content-Type: application/json\r\n\r\n' +
                    JSON.stringify(metadata) +
                    delimiter +
                    'Content-Type: text/csv\r\n\r\n' +
                    content +
                    close_delim;
                
                const request = window.gapi.client.request({
                    'path': '/upload/drive/v3/files',
                    'method': 'POST',
                    'params': {'uploadType': 'multipart'},
                    'headers': {
                        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
                    },
                    'body': multipartRequestBody
                });
                
                request.execute(resolve, reject);
            });
        }
        
        entriesToCSV(entries) {
            const headers = ['ID', 'Date', 'Description', 'Amount', 'MainCategory', 'SubCategory', 'SyncAction'];
            const rows = entries.map(entry => {
                return [
                    entry.id || '',
                    entry.date || '',
                    entry.desc || '',
                    entry.amount || 0,
                    entry.main || '',
                    entry.sub || '',
                    entry.syncRemarks || 'new'
                ];
            });
            
            const csv = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            ].join('\n');
            
            return csv;
        }
        
        disconnect() {
            console.log("🔓 Disconnecting...");
            
            if (window.gapi && window.gapi.client && window.gapi.client.getToken) {
                const token = window.gapi.client.getToken();
                if (token !== null) {
                    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                        window.google.accounts.oauth2.revoke(token.access_token);
                    }
                    window.gapi.client.setToken('');
                }
            }
            
            this.accessToken = null;
            this.isConnected = false;
            
            // Update localStorage
            const config = JSON.parse(localStorage.getItem('gdriveConfig') || '{}');
            config.accessToken = null;
            localStorage.setItem('gdriveConfig', JSON.stringify(config));
            
            console.log("✅ Disconnected from Google Drive");
            return true;
        }
    }
    
    // Create enhanced instance
    console.log("🏗️ Creating enhanced GoogleDriveSync instance...");
    const enhancedSync = new GoogleDriveSync();
    
    // Merge enhanced methods into window.driveSync
    Object.getOwnPropertyNames(GoogleDriveSync.prototype).forEach(method => {
        if (method !== 'constructor' && enhancedSync[method]) {
            window.driveSync[method] = enhancedSync[method].bind(enhancedSync);
        }
    });
    
    console.log("✅ Enhanced drive.js loaded");
    
} catch (error) {
    console.error('❌ Error initializing enhanced GoogleDriveSync:', error);
    console.log("⚠️ Using basic localStorage-only mode");
    
    // Ensure basic methods exist
    if (!window.driveSync.saveConfig) {
        window.driveSync.saveConfig = function(clientId, apiKey, folderId) {
            try {
                const config = {
                    clientId: clientId.trim(),
                    apiKey: apiKey.trim(),
                    folderId: folderId.trim(),
                    savedAt: new Date().toISOString(),
                    error: "Using fallback mode"
                };
                localStorage.setItem('gdriveConfig', JSON.stringify(config));
                alert("✅ Credentials saved (fallback mode)\n\nExport CSV for manual Google Drive upload.");
                return true;
            } catch (e) {
                console.error('Fallback save error:', e);
                return false;
            }
        };
    }
    
    // Add fallback methods
    window.driveSync.connect = async function() {
        alert("⚠️ Full Google Drive connection not available.\n\nPlease:\n1. Export CSV from Backup page\n2. Upload manually to Google Drive\n3. Or run app locally (open index.html from computer)");
        throw new Error("Google Drive connection requires running locally");
    };
    
    window.driveSync.testConnection = async function() {
        return {
            success: false,
            message: "⚠️ Test connection requires running app locally\n\nOpen index.html from your computer for full Google Drive access"
        };
    };
    
    window.driveSync.uploadEntries = async function(entries) {
        alert("⚠️ Direct upload not available.\n\nPlease export CSV and upload manually to Google Drive.");
        throw new Error("Manual CSV export required");
    };
}

// Load config
window.driveSync.loadConfig();

// Debug helper
window.debugDrive = function() {
    console.log("=== DRIVE DEBUG ===");
    console.log("driveSync:", window.driveSync);
    console.log("isConfigured:", window.driveSync.isConfigured);
    console.log("isConnected:", window.driveSync.isConnected);
    console.log("isGitHubPages:", window.driveSync.isGitHubPages);
    console.log("localStorage config:", localStorage.getItem('gdriveConfig'));
    console.log("gapi loaded:", !!window.gapi);
    console.log("google loaded:", !!window.google);
    console.log("=== END DEBUG ===");
};

console.log("✅ drive.js fully loaded");
