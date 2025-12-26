// drive.js - Dynamic Google Drive API with browser configuration
console.log("🚀 drive.js starting to load...");

// Global error tracking
window.driveSyncError = null;
window.driveSyncLoaded = false;

try {
    class GoogleDriveSync {
        constructor() {
            console.log("🔧 GoogleDriveSync constructor called");
            
            // Credentials will be loaded from localStorage
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
            
            console.log("📝 Starting initialization...");
            
            // Initialize
            this.loadConfig();
            console.log("✅ GoogleDriveSync initialized");
            console.log("📊 Status - isConfigured:", this.isConfigured, "isConnected:", this.isConnected);
        }
        
        // Load configuration from localStorage
        loadConfig() {
            try {
                console.log("🔍 Reading localStorage for gdriveConfig...");
                const configStr = localStorage.getItem('gdriveConfig');
                console.log("📄 Raw config string:", configStr);
                
                if (!configStr || configStr === '{}') {
                    console.log("📭 No config found in localStorage");
                    this.isConfigured = false;
                    this.isConnected = false;
                    return false;
                }
                
                const config = JSON.parse(configStr);
                console.log("📊 Parsed config:", config);
                
                this.CLIENT_ID = config.clientId || null;
                this.API_KEY = config.apiKey || null;
                this.folderId = config.folderId || null;
                this.accessToken = config.accessToken || null;
                
                // Check if we have all required credentials
                this.isConfigured = !!this.CLIENT_ID && !!this.API_KEY && !!this.folderId;
                this.isConnected = this.isConfigured && !!this.accessToken;
                
                console.log("✅ Config loaded successfully");
                console.log("📋 Status:", {
                    hasClientId: !!this.CLIENT_ID,
                    hasApiKey: !!this.API_KEY,
                    hasFolderId: !!this.folderId,
                    hasToken: !!this.accessToken,
                    isConfigured: this.isConfigured,
                    isConnected: this.isConnected
                });
                
                return this.isConfigured;
            } catch (error) {
                console.error('❌ Error loading config:', error);
                console.error('Error stack:', error.stack);
                
                // Reset to safe state
                this.isConfigured = false;
                this.isConnected = false;
                
                // Store error for debugging
                window.driveSyncError = {
                    message: error.message,
                    stack: error.stack,
                    time: new Date().toISOString()
                };
                
                return false;
            }
        }
        
        // Save configuration to localStorage
        saveConfig(clientId, apiKey, folderId) {
            try {
                console.log("💾 Saving config...");
                console.log("📥 Input - ClientId:", clientId?.substring(0, 20) + "...", 
                           "API Key:", apiKey?.substring(0, 10) + "...",
                           "FolderId:", folderId);
                
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
                    accessToken: this.accessToken, // Preserve existing token if any
                    lastSaved: new Date().toISOString()
                };
                
                console.log("📋 Config to save:", {
                    clientId: config.clientId.substring(0, 30) + "...",
                    apiKey: config.apiKey.substring(0, 10) + "...",
                    folderId: config.folderId,
                    hasToken: !!config.accessToken
                });
                
                // Save to localStorage
                localStorage.setItem('gdriveConfig', JSON.stringify(config));
                console.log("✅ Config saved to localStorage");
                
                // Update instance variables
                this.CLIENT_ID = config.clientId;
                this.API_KEY = config.apiKey;
                this.folderId = config.folderId;
                this.isConfigured = true;
                
                console.log("✅ Instance variables updated");
                console.log("📊 New status:", this.getConfigStatus());
                
                return true;
            } catch (error) {
                console.error('❌ Error saving config:', error);
                console.error('Error details:', {
                    clientIdLength: clientId?.length,
                    apiKeyLength: apiKey?.length,
                    folderIdLength: folderId?.length,
                    error: error.message
                });
                
                window.driveSyncError = error;
                return false;
            }
        }
        
        // Clear configuration
        clearConfig() {
            try {
                console.log("🗑️ Clearing config...");
                localStorage.removeItem('gdriveConfig');
                this.CLIENT_ID = null;
                this.API_KEY = null;
                this.folderId = null;
                this.accessToken = null;
                this.isConfigured = false;
                this.isConnected = false;
                
                // Also clear Google tokens if they exist
                if (window.gapi && window.gapi.client && window.gapi.client.getToken) {
                    try {
                        const token = window.gapi.client.getToken();
                        if (token) {
                            if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                                window.google.accounts.oauth2.revoke(token.access_token);
                            }
                            window.gapi.client.setToken(null);
                        }
                    } catch (gapiError) {
                        console.warn('⚠️ Could not clear Google tokens:', gapiError);
                    }
                }
                
                console.log("✅ Config cleared");
                return true;
            } catch (error) {
                console.error('❌ Error clearing config:', error);
                return false;
            }
        }
        
        // Get configuration status
        getConfigStatus() {
            const status = {
                isConfigured: this.isConfigured,
                isConnected: this.isConnected,
                hasClientId: !!this.CLIENT_ID,
                hasApiKey: !!this.API_KEY,
                hasFolderId: !!this.folderId,
                hasToken: !!this.accessToken,
                gapiInited: this.gapiInited,
                gisInited: this.gisInited
            };
            
            console.log("📊 getConfigStatus called:", status);
            return status;
        }
        
        // Initialize Google APIs
        async init() {
            console.log("🚀 Initializing Google APIs...");
            
            if (!this.isConfigured) {
                throw new Error('Google Drive not configured. Please enter credentials in Settings.');
            }
            
            try {
                await this.loadGAPI();
                await this.loadGIS();
                console.log("✅ Google APIs initialized");
                return true;
            } catch (error) {
                console.error('❌ Failed to initialize Google APIs:', error);
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
                    console.log("✅ GAPI already loaded in window");
                    window.gapi.load('client', async () => {
                        try {
                            await window.gapi.client.init({
                                apiKey: this.API_KEY,
                                discoveryDocs: this.discoveryDocs,
                            });
                            this.gapiInited = true;
                            console.log("✅ GAPI client initialized");
                            resolve();
                        } catch (error) {
                            console.error('❌ Error initializing GAPI client:', error);
                            reject(error);
                        }
                    });
                    return;
                }
                
                // Load from CDN
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api.js';
                script.onload = () => {
                    console.log("✅ GAPI script loaded");
                    window.gapi.load('client', async () => {
                        try {
                            await window.gapi.client.init({
                                apiKey: this.API_KEY,
                                discoveryDocs: this.discoveryDocs,
                            });
                            this.gapiInited = true;
                            console.log("✅ GAPI client initialized");
                            resolve();
                        } catch (error) {
                            console.error('❌ Error initializing GAPI client:', error);
                            reject(error);
                        }
                    });
                };
                script.onerror = () => {
                    const error = new Error('Failed to load Google API script');
                    console.error('❌', error);
                    reject(error);
                };
                
                console.log("📥 Adding GAPI script to page...");
                document.head.appendChild(script);
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
                    console.log("✅ GIS already loaded in window");
                    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                        client_id: this.CLIENT_ID,
                        scope: this.SCOPES,
                        callback: ''
                    });
                    this.gisInited = true;
                    console.log("✅ GIS token client initialized");
                    resolve();
                    return;
                }
                
                // Load from CDN
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.onload = () => {
                    console.log("✅ GIS script loaded");
                    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                        client_id: this.CLIENT_ID,
                        scope: this.SCOPES,
                        callback: ''
                    });
                    this.gisInited = true;
                    console.log("✅ GIS token client initialized");
                    resolve();
                };
                script.onerror = () => {
                    const error = new Error('Failed to load Google Identity Services');
                    console.error('❌', error);
                    reject(error);
                };
                
                console.log("📥 Adding GIS script to page...");
                document.head.appendChild(script);
            });
        }
        
        // Connect to Google Drive
        async connect() {
            console.log("🔗 Connecting to Google Drive...");
            
            if (!this.isConfigured) {
                throw new Error('Please configure Google Drive credentials first.');
            }
            
            try {
                // Initialize APIs if not already done
                if (!this.gapiInited || !this.gisInited) {
                    console.log("🔄 Initializing APIs first...");
                    await this.init();
                }
                
                return new Promise((resolve, reject) => {
                    console.log("🔄 Setting up token callback...");
                    
                    this.tokenClient.callback = async (resp) => {
                        console.log("🔑 Token callback received:", resp);
                        
                        if (resp.error !== undefined) {
                            console.error('❌ Token error:', resp);
                            reject(resp);
                            return;
                        }
                        
                        try {
                            this.accessToken = window.gapi.client.getToken().access_token;
                            this.isConnected = true;
                            
                            // Save token to config
                            this.saveConfig();
                            
                            // Verify folder access
                            await this.verifyFolderAccess();
                            console.log("✅ Successfully connected to Google Drive");
                            resolve(true);
                        } catch (folderError) {
                            console.error('❌ Folder verification failed:', folderError);
                            this.isConnected = false;
                            reject(folderError);
                        }
                    };
                    
                    // Request access token
                    if (window.gapi.client.getToken() === null) {
                        console.log("🔑 Requesting access token with consent...");
                        this.tokenClient.requestAccessToken({ prompt: 'consent' });
                    } else {
                        console.log("🔑 Requesting access token...");
                        this.tokenClient.requestAccessToken({ prompt: '' });
                    }
                });
                
            } catch (error) {
                console.error('❌ Connection error:', error);
                this.isConnected = false;
                throw error;
            }
        }
        
        // Verify we can access the folder
        async verifyFolderAccess() {
            console.log("📁 Verifying folder access...");
            
            if (!this.folderId) {
                throw new Error('No folder ID configured');
            }
            
            try {
                const response = await window.gapi.client.drive.files.get({
                    fileId: this.folderId,
                    fields: 'id, name, capabilities, mimeType'
                });
                
                console.log("✅ Folder response:", response);
                
                if (response.result.mimeType !== 'application/vnd.google-apps.folder') {
                    throw new Error('Not a valid folder');
                }
                
                if (!response.result.capabilities.canEdit) {
                    throw new Error('No write permission to folder');
                }
                
                console.log("✅ Folder access verified");
                return true;
            } catch (error) {
                console.error('❌ Folder access error:', error);
                throw new Error('Cannot access folder. Check ID and sharing permissions.');
            }
        }
        
        // Disconnect from Google Drive
        disconnect() {
            console.log("🔓 Disconnecting from Google Drive...");
            
            try {
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
                this.saveConfig(); // Update config without token
                
                console.log("✅ Disconnected from Google Drive");
                return true;
            } catch (error) {
                console.error('❌ Disconnect error:', error);
                return false;
            }
        }
        
        // List files in the folder
        async listFiles(prefix = '') {
            console.log("📄 Listing files...");
            this.ensureConnected();
            
            let query = `'${this.folderId}' in parents and trashed=false`;
            if (prefix) {
                query += ` and name contains '${prefix}'`;
            }
            
            const response = await window.gapi.client.drive.files.list({
                q: query,
                fields: 'files(id, name, createdTime, modifiedTime, size)',
                orderBy: 'name desc'
            });
            
            console.log("✅ Files found:", response.result.files?.length || 0);
            return response.result.files || [];
        }
        
        // Upload export file to Drive
        async uploadExportFile(filename, csvContent) {
            console.log("📤 Uploading file:", filename);
            this.ensureConnected();
            
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
            
            const response = await request;
            console.log("✅ File uploaded:", response.result.name);
            return response.result;
        }
        
        // Download file from Drive
        async downloadFile(fileId) {
            console.log("📥 Downloading file:", fileId);
            this.ensureConnected();
            
            const response = await window.gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });
            
            console.log("✅ File downloaded");
            return response.body;
        }
        
        // Delete file from Drive
        async deleteFile(fileId) {
            console.log("🗑️ Deleting file:", fileId);
            this.ensureConnected();
            
            await window.gapi.client.drive.files.delete({
                fileId: fileId
            });
            
            console.log("✅ File deleted");
            return true;
        }
        
        // Upload entries to Drive
        async uploadEntries(entries) {
            console.log("📤 Uploading", entries.length, "entries to Drive");
            this.ensureConnected();
            
            if (!entries || entries.length === 0) {
                throw new Error('No entries to upload');
            }
            
            // Generate filename with timestamp
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const filename = `export_${timestamp}.csv`;
            
            // Convert entries to CSV
            const csvContent = this.entriesToCSV(entries);
            
            // Upload to Google Drive
            const result = await this.uploadExportFile(filename, csvContent);
            
            console.log("✅ Upload complete");
            return {
                success: true,
                filename: filename,
                fileId: result.id,
                entriesCount: entries.length,
                driveUrl: `https://drive.google.com/file/d/${result.id}/view`
            };
        }
        
        // Convert entries to CSV format
        entriesToCSV(entries) {
            console.log("📊 Converting", entries.length, "entries to CSV");
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
            
            console.log("✅ CSV generated, length:", csv.length);
            return csv;
        }
        
        // Get import files from Drive
        async getImportFiles() {
            console.log("🔍 Getting import files...");
            const files = await this.listFiles('import_');
            const sorted = files.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
            console.log("✅ Found", sorted.length, "import files");
            return sorted;
        }
        
        // Import data from a Drive file
        async importFromFile(fileId) {
            console.log("📥 Importing from file:", fileId);
            const csvContent = await this.downloadFile(fileId);
            const entries = this.parseImportCSV(csvContent);
            console.log("✅ Imported", entries.length, "entries");
            return entries;
        }
        
        // Parse CSV content
        parseImportCSV(csvContent) {
            console.log("📄 Parsing CSV content, length:", csvContent.length);
            const lines = csvContent.split('\n');
            if (lines.length < 2) return [];
            
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
            const entries = [];
            
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                const values = this.parseCSVLine(lines[i]);
                if (values.length < headers.length) continue;
                
                const entry = {};
                headers.forEach((header, index) => {
                    if (values[index] !== undefined) {
                        entry[header.toLowerCase()] = values[index].replace(/^"|"$/g, '');
                    }
                });
                
                if (entry.id) {
                    entries.push({
                        id: entry.id,
                        date: entry.date,
                        desc: entry.description || '',
                        amount: parseFloat(entry.amount) || 0,
                        main: entry.maincategory || entry.main || '',
                        sub: entry.subcategory || entry.sub || '',
                        synced: true,
                        syncRemarks: 'synced'
                    });
                }
            }
            
            console.log("✅ Parsed", entries.length, "entries");
            return entries;
        }
        
        // Helper: Parse CSV line
        parseCSVLine(line) {
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            
            values.push(current);
            return values;
        }
        
        // Helper: Ensure we're connected
        ensureConnected() {
            console.log("🔒 Checking connection...");
            if (!this.isConnected) {
                throw new Error('Not connected to Google Drive. Please connect first.');
            }
            if (!this.gapiInited || !this.gisInited) {
                throw new Error('Google APIs not initialized. Please reconnect.');
            }
            console.log("✅ Connection verified");
        }
        
        // Test connection
        async testConnection() {
            console.log("🧪 Testing connection...");
            
            if (!this.isConfigured) {
                console.log("❌ Not configured");
                return { success: false, message: 'Not configured' };
            }
            
            try {
                await this.init();
                
                if (!this.isConnected) {
                    console.log("⚠️  Configured but not connected");
                    return { success: false, message: 'Not connected. Please connect first.' };
                }
                
                // Try to list files
                const files = await this.listFiles();
                console.log("✅ Test successful, found", files.length, "files");
                
                return {
                    success: true,
                    message: `✅ Connected successfully! Found ${files.length} files in folder.`,
                    files: files.length
                };
            } catch (error) {
                console.error('❌ Test failed:', error);
                return {
                    success: false,
                    message: `❌ Connection failed: ${error.message}`
                };
            }
        }
    }

    // Create global instance
    console.log("🏗️ Creating driveSync instance...");
    const driveSync = new GoogleDriveSync();
    window.driveSync = driveSync;
    window.driveSyncLoaded = true;
    
    console.log("🎉 drive.js loaded successfully!");
    console.log("📊 Initial status:", driveSync.getConfigStatus());
    
} catch (error) {
    console.error('❌ CRITICAL ERROR in drive.js:', error);
    console.error('Error stack:', error.stack);
    
    window.driveSyncError = {
        message: error.message,
        stack: error.stack,
        time: new Date().toISOString()
    };
    
    // Create a minimal fallback object
    window.driveSync = {
        isConfigured: false,
        isConnected: false,
        loadConfig: function() { 
            console.log("⚠️  Using fallback driveSync");
            return false; 
        },
        saveConfig: function() { 
            console.log("⚠️  saveConfig not available");
            return false; 
        },
        getConfigStatus: function() {
            return {
                isConfigured: false,
                isConnected: false,
                hasClientId: false,
                hasApiKey: false,
                hasFolderId: false,
                hasToken: false,
                error: window.driveSyncError?.message
            };
        }
    };
}

// Add debug helper
window.debugDriveSync = function() {
    console.log("=== DRIVE SYNC DEBUG ===");
    console.log("driveSync exists:", typeof window.driveSync !== 'undefined');
    console.log("driveSync object:", window.driveSync);
    console.log("driveSync.getConfigStatus:", window.driveSync?.getConfigStatus?.call(window.driveSync));
    console.log("driveSyncError:", window.driveSyncError);
    console.log("localStorage config:", localStorage.getItem('gdriveConfig'));
    console.log("window.gapi exists:", typeof window.gapi !== 'undefined');
    console.log("window.google exists:", typeof window.google !== 'undefined');
    console.log("=== END DEBUG ===");
};

console.log("✅ drive.js script execution complete");
