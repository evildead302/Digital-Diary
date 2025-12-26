// drive.js - Google Drive API with GitHub Pages fix
console.log("🚀 drive.js loading...");

// Create global driveSync immediately
window.driveSync = {
    isConfigured: false,
    isConnected: false,
    CLIENT_ID: null,
    API_KEY: null,
    folderId: null,
    accessToken: null,
    gapiInited: false,
    gisInited: false,
    tokenClient: null
};

try {
    class GoogleDriveSync {
        constructor() {
            console.log("🔧 GoogleDriveSync constructor called");
            
            // Initialize from window.driveSync
            Object.assign(this, window.driveSync);
            
            // Load existing config
            this.loadConfig();
            
            // Pre-load Google scripts for GitHub Pages
            this.preloadGoogleScripts();
        }
        
        // Load configuration from localStorage
        loadConfig() {
            try {
                const config = JSON.parse(localStorage.getItem('gdriveConfig') || '{}');
                console.log("📊 Config loaded:", config);
                
                this.CLIENT_ID = config.clientId || null;
                this.API_KEY = config.apiKey || null;
                this.folderId = config.folderId || null;
                this.accessToken = config.accessToken || null;
                
                this.isConfigured = !!this.CLIENT_ID && !!this.API_KEY && !!this.folderId;
                this.isConnected = this.isConfigured && !!this.accessToken;
                
                console.log("✅ Config loaded - isConfigured:", this.isConfigured, "isConnected:", this.isConnected);
                return this.isConfigured;
            } catch (error) {
                console.error('Error loading config:', error);
                return false;
            }
        }
        
        // Save configuration to localStorage
        saveConfig(clientId, apiKey, folderId) {
            try {
                console.log("💾 Saving config...");
                
                // Validate
                if (!clientId || !clientId.trim()) throw new Error('Client ID required');
                if (!apiKey || !apiKey.trim()) throw new Error('API Key required');
                if (!folderId || !folderId.trim()) throw new Error('Folder ID required');
                
                const config = {
                    clientId: clientId.trim(),
                    apiKey: apiKey.trim(),
                    folderId: folderId.trim(),
                    accessToken: this.accessToken,
                    lastSaved: new Date().toISOString()
                };
                
                localStorage.setItem('gdriveConfig', JSON.stringify(config));
                
                // Update instance
                this.CLIENT_ID = config.clientId;
                this.API_KEY = config.apiKey;
                this.folderId = config.folderId;
                this.isConfigured = true;
                
                console.log("✅ Config saved successfully");
                return true;
                
            } catch (error) {
                console.error('Save config error:', error);
                throw error;
            }
        }
        
        // Pre-load Google scripts for GitHub Pages
        preloadGoogleScripts() {
            console.log("📥 Pre-loading Google scripts for GitHub Pages...");
            
            // Load GAPI
            const gapiScript = document.createElement('script');
            gapiScript.src = 'https://apis.google.com/js/api.js';
            gapiScript.async = true;
            gapiScript.defer = true;
            document.head.appendChild(gapiScript);
            
            // Load GIS
            const gisScript = document.createElement('script');
            gisScript.src = 'https://accounts.google.com/gsi/client';
            gisScript.async = true;
            gisScript.defer = true;
            document.head.appendChild(gisScript);
            
            console.log("✅ Google scripts added to page");
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
                gapiInited: this.gapiInited,
                gisInited: this.gisInited
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
        
        // Initialize Google APIs
        async init() {
            console.log("🚀 Initializing Google APIs...");
            
            if (!this.isConfigured) {
                throw new Error('Google Drive not configured');
            }
            
            try {
                await this.loadGAPI();
                await this.loadGIS();
                return true;
            } catch (error) {
                console.error('Failed to initialize Google APIs:', error);
                throw error;
            }
        }
        
        // Load Google API client library
        async loadGAPI() {
            return new Promise((resolve, reject) => {
                console.log("📡 Loading GAPI...");
                
                if (this.gapiInited) {
                    console.log("✅ GAPI already initialized");
                    resolve();
                    return;
                }
                
                // Check if already loaded
                if (window.gapi && window.gapi.load) {
                    console.log("✅ GAPI already loaded");
                    window.gapi.load('client', async () => {
                        try {
                            await window.gapi.client.init({
                                apiKey: this.API_KEY,
                                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                            });
                            this.gapiInited = true;
                            console.log("✅ GAPI client initialized");
                            resolve();
                        } catch (error) {
                            console.error('Error initializing GAPI client:', error);
                            reject(error);
                        }
                    });
                    return;
                }
                
                // Wait for script to load
                const checkInterval = setInterval(() => {
                    if (window.gapi && window.gapi.load) {
                        clearInterval(checkInterval);
                        window.gapi.load('client', async () => {
                            try {
                                await window.gapi.client.init({
                                    apiKey: this.API_KEY,
                                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                                });
                                this.gapiInited = true;
                                console.log("✅ GAPI client initialized");
                                resolve();
                            } catch (error) {
                                console.error('Error initializing GAPI client:', error);
                                reject(error);
                            }
                        });
                    }
                }, 100);
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    clearInterval(checkInterval);
                    reject(new Error('GAPI failed to load within 10 seconds'));
                }, 10000);
            });
        }
        
        // Load Google Identity Services
        async loadGIS() {
            return new Promise((resolve, reject) => {
                console.log("📡 Loading GIS...");
                
                if (this.gisInited) {
                    console.log("✅ GIS already initialized");
                    resolve();
                    return;
                }
                
                // Check if already loaded
                if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                    console.log("✅ GIS already loaded");
                    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                        client_id: this.CLIENT_ID,
                        scope: 'https://www.googleapis.com/auth/drive.file',
                        callback: ''
                    });
                    this.gisInited = true;
                    console.log("✅ GIS token client initialized");
                    resolve();
                    return;
                }
                
                // Wait for script to load
                const checkInterval = setInterval(() => {
                    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                        clearInterval(checkInterval);
                        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                            client_id: this.CLIENT_ID,
                            scope: 'https://www.googleapis.com/auth/drive.file',
                            callback: ''
                        });
                        this.gisInited = true;
                        console.log("✅ GIS token client initialized");
                        resolve();
                    }
                }, 100);
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    clearInterval(checkInterval);
                    reject(new Error('GIS failed to load within 10 seconds'));
                }, 10000);
            });
        }
        
        // Connect to Google Drive
        async connect() {
            console.log("🔗 Connecting to Google Drive...");
            
            if (!this.isConfigured) {
                throw new Error('Please configure Google Drive credentials first.');
            }
            
            try {
                // Initialize APIs
                await this.init();
                
                return new Promise((resolve, reject) => {
                    this.tokenClient.callback = async (resp) => {
                        console.log("🔑 Token callback:", resp);
                        
                        if (resp.error !== undefined) {
                            reject(resp);
                            return;
                        }
                        
                        this.accessToken = window.gapi.client.getToken().access_token;
                        this.isConnected = true;
                        
                        // Save token
                        this.saveConfig();
                        
                        // Verify folder
                        await this.verifyFolderAccess();
                        resolve(true);
                    };
                    
                    // Request token
                    if (window.gapi.client.getToken() === null) {
                        this.tokenClient.requestAccessToken({ prompt: 'consent' });
                    } else {
                        this.tokenClient.requestAccessToken({ prompt: '' });
                    }
                });
                
            } catch (error) {
                console.error('Connect error:', error);
                this.isConnected = false;
                throw error;
            }
        }
        
        // Verify folder access
        async verifyFolderAccess() {
            console.log("📁 Verifying folder access...");
            
            if (!this.folderId) throw new Error('No folder ID');
            
            const response = await window.gapi.client.drive.files.get({
                fileId: this.folderId,
                fields: 'id, name, capabilities, mimeType'
            });
            
            if (response.result.mimeType !== 'application/vnd.google-apps.folder') {
                throw new Error('Not a valid folder');
            }
            
            if (!response.result.capabilities.canEdit) {
                throw new Error('No write permission to folder');
            }
            
            console.log("✅ Folder access verified");
            return true;
        }
        
        // Test connection
        async testConnection() {
            console.log("🧪 Testing connection...");
            
            if (!this.isConfigured) {
                return { success: false, message: 'Not configured' };
            }
            
            try {
                await this.init();
                
                if (!this.isConnected) {
                    return { success: false, message: 'Not connected. Please connect first.' };
                }
                
                const files = await this.listFiles();
                return {
                    success: true,
                    message: `✅ Connected successfully! Found ${files.length} files in folder.`,
                    files: files.length
                };
                
            } catch (error) {
                console.error('Test failed:', error);
                return {
                    success: false,
                    message: `❌ Connection failed: ${error.message}`
                };
            }
        }
        
        // Upload entries to Drive
        async uploadEntries(entries) {
            console.log("📤 Uploading", entries.length, "entries...");
            
            if (!this.isConnected) {
                throw new Error('Not connected to Google Drive');
            }
            
            if (!entries || entries.length === 0) {
                throw new Error('No entries to upload');
            }
            
            // Generate filename
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const filename = `export_${timestamp}.csv`;
            
            // Convert to CSV
            const csvContent = this.entriesToCSV(entries);
            
            // Upload
            const result = await this.uploadExportFile(filename, csvContent);
            
            return {
                success: true,
                filename: filename,
                fileId: result.id,
                entriesCount: entries.length,
                driveUrl: `https://drive.google.com/file/d/${result.id}/view`
            };
        }
        
        // Upload file to Drive
        async uploadExportFile(filename, csvContent) {
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
                csvContent +
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
            
            return await request;
        }
        
        // List files
        async listFiles(prefix = '') {
            let query = `'${this.folderId}' in parents and trashed=false`;
            if (prefix) {
                query += ` and name contains '${prefix}'`;
            }
            
            const response = await window.gapi.client.drive.files.list({
                q: query,
                fields: 'files(id, name, createdTime, modifiedTime, size)',
                orderBy: 'name desc'
            });
            
            return response.result.files || [];
        }
        
        // Convert entries to CSV
        entriesToCSV(entries) {
            const headers = ['ID', 'Date', 'Description', 'Amount', 'MainCategory', 'SubCategory', 'SyncAction'];
            const rows = entries.map(entry => {
                return [
                    entry.id,
                    entry.date,
                    entry.desc || '',
                    entry.amount,
                    entry.main || '',
                    entry.sub || '',
                    entry.syncRemarks === 'deleted' ? 'deleted' : 
                    (entry.synced ? 'edited' : 'new')
                ];
            });
            
            const csv = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            ].join('\n');
            
            return csv;
        }
    }
    
    // Create instance
    console.log("🏗️ Creating GoogleDriveSync instance...");
    const instance = new GoogleDriveSync();
    
    // Update window.driveSync with instance methods
    Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).forEach(method => {
        if (method !== 'constructor') {
            window.driveSync[method] = instance[method].bind(instance);
        }
    });
    
    // Copy properties
    Object.assign(window.driveSync, instance);
    
    console.log("✅ drive.js fully loaded");
    console.log("📊 Status:", window.driveSync.getConfigStatus());
    
} catch (error) {
    console.error('❌ Error in drive.js:', error);
    // Ensure basic methods exist
    if (!window.driveSync.saveConfig) {
        window.driveSync.saveConfig = function(clientId, apiKey, folderId) {
            try {
                const config = { clientId, apiKey, folderId };
                localStorage.setItem('gdriveConfig', JSON.stringify(config));
                return true;
            } catch (e) {
                console.error('Fallback save error:', e);
                return false;
            }
        };
    }
}

// Debug helper
window.debugDrive = function() {
    console.log("=== DRIVE DEBUG ===");
    console.log("driveSync:", window.driveSync);
    console.log("getConfigStatus:", window.driveSync.getConfigStatus ? window.driveSync.getConfigStatus() : "Not available");
    console.log("localStorage config:", localStorage.getItem('gdriveConfig'));
    console.log("gapi loaded:", !!window.gapi);
    console.log("google loaded:", !!window.google);
    console.log("=== END DEBUG ===");
};