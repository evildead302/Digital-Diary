// drive.js - Dynamic Google Drive API with browser configuration

class GoogleDriveSync {
    constructor() {
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
        
        // Initialize
        this.loadConfig();
    }
    
    // Load configuration from localStorage
    loadConfig() {
        try {
            const config = JSON.parse(localStorage.getItem('gdriveConfig') || '{}');
            this.CLIENT_ID = config.clientId || null;
            this.API_KEY = config.apiKey || null;
            this.folderId = config.folderId || null;
            this.accessToken = config.accessToken || null;
            
            // Check if we have all required credentials
            this.isConfigured = !!this.CLIENT_ID && !!this.API_KEY && !!this.folderId;
            this.isConnected = this.isConfigured && !!this.accessToken;
            
            return this.isConfigured;
        } catch (error) {
            console.error('Error loading config:', error);
            return false;
        }
    }
    
    // Save configuration to localStorage
    saveConfig(clientId, apiKey, folderId) {
        try {
            const config = {
                clientId: clientId?.trim() || this.CLIENT_ID,
                apiKey: apiKey?.trim() || this.API_KEY,
                folderId: folderId?.trim() || this.folderId,
                accessToken: this.accessToken,
                lastSaved: new Date().toISOString()
            };
            
            localStorage.setItem('gdriveConfig', JSON.stringify(config));
            
            // Update instance variables
            this.CLIENT_ID = config.clientId;
            this.API_KEY = config.apiKey;
            this.folderId = config.folderId;
            this.isConfigured = !!this.CLIENT_ID && !!this.API_KEY && !!this.folderId;
            
            return true;
        } catch (error) {
            console.error('Error saving config:', error);
            return false;
        }
    }
    
    // Clear configuration
    clearConfig() {
        localStorage.removeItem('gdriveConfig');
        this.CLIENT_ID = null;
        this.API_KEY = null;
        this.folderId = null;
        this.accessToken = null;
        this.isConfigured = false;
        this.isConnected = false;
        
        // Also clear Google tokens
        if (gapi && gapi.client && gapi.client.getToken()) {
            google.accounts.oauth2.revoke(gapi.client.getToken().access_token);
            gapi.client.setToken('');
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
            hasToken: !!this.accessToken
        };
    }
    
    // Initialize Google APIs
    async init() {
        if (!this.isConfigured) {
            throw new Error('Google Drive not configured. Please enter credentials in Settings.');
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
            if (this.gapiInited) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                gapi.load('client', async () => {
                    try {
                        await gapi.client.init({
                            apiKey: this.API_KEY,
                            discoveryDocs: this.discoveryDocs,
                        });
                        this.gapiInited = true;
                        resolve();
                    } catch (error) {
                        console.error('Error loading GAPI:', error);
                        reject(error);
                    }
                });
            };
            script.onerror = () => reject(new Error('Failed to load Google API script'));
            document.head.appendChild(script);
        });
    }
    
    // Load Google Identity Services
    async loadGIS() {
        return new Promise((resolve, reject) => {
            if (this.gisInited) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = () => {
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: this.CLIENT_ID,
                    scope: this.SCOPES,
                    callback: ''
                });
                this.gisInited = true;
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
            document.head.appendChild(script);
        });
    }
    
    // Connect to Google Drive
    async connect() {
        if (!this.isConfigured) {
            throw new Error('Please configure Google Drive credentials first.');
        }
        
        try {
            // Initialize APIs if not already done
            if (!this.gapiInited || !this.gisInited) {
                await this.init();
            }
            
            return new Promise((resolve, reject) => {
                this.tokenClient.callback = async (resp) => {
                    if (resp.error !== undefined) {
                        reject(resp);
                        return;
                    }
                    
                    this.accessToken = gapi.client.getToken().access_token;
                    this.isConnected = true;
                    
                    // Save token to config
                    this.saveConfig();
                    
                    // Verify folder access
                    try {
                        await this.verifyFolderAccess();
                        resolve(true);
                    } catch (folderError) {
                        this.isConnected = false;
                        reject(folderError);
                    }
                };
                
                // Request access token
                if (gapi.client.getToken() === null) {
                    this.tokenClient.requestAccessToken({ prompt: 'consent' });
                } else {
                    this.tokenClient.requestAccessToken({ prompt: '' });
                }
            });
            
        } catch (error) {
            console.error('Connection error:', error);
            this.isConnected = false;
            throw error;
        }
    }
    
    // Verify we can access the folder
    async verifyFolderAccess() {
        if (!this.folderId) {
            throw new Error('No folder ID configured');
        }
        
        try {
            const response = await gapi.client.drive.files.get({
                fileId: this.folderId,
                fields: 'id, name, capabilities, mimeType'
            });
            
            if (response.result.mimeType !== 'application/vnd.google-apps.folder') {
                throw new Error('Not a valid folder');
            }
            
            if (!response.result.capabilities.canEdit) {
                throw new Error('No write permission to folder');
            }
            
            return true;
        } catch (error) {
            console.error('Folder access error:', error);
            throw new Error('Cannot access folder. Check ID and sharing permissions.');
        }
    }
    
    // Disconnect from Google Drive
    disconnect() {
        try {
            const token = gapi.client.getToken();
            if (token !== null) {
                google.accounts.oauth2.revoke(token.access_token);
                gapi.client.setToken('');
            }
            
            this.accessToken = null;
            this.isConnected = false;
            this.saveConfig(); // Update config without token
            
            return true;
        } catch (error) {
            console.error('Disconnect error:', error);
            return false;
        }
    }
    
    // List files in the folder
    async listFiles(prefix = '') {
        this.ensureConnected();
        
        let query = `'${this.folderId}' in parents and trashed=false`;
        if (prefix) {
            query += ` and name contains '${prefix}'`;
        }
        
        const response = await gapi.client.drive.files.list({
            q: query,
            fields: 'files(id, name, createdTime, modifiedTime, size)',
            orderBy: 'name desc'
        });
        
        return response.result.files || [];
    }
    
    // Upload export file to Drive
    async uploadExportFile(filename, csvContent) {
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
        
        const request = gapi.client.request({
            'path': '/upload/drive/v3/files',
            'method': 'POST',
            'params': {'uploadType': 'multipart'},
            'headers': {
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            'body': multipartRequestBody
        });
        
        const response = await request;
        return response.result;
    }
    
    // Download file from Drive
    async downloadFile(fileId) {
        this.ensureConnected();
        
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        
        return response.body;
    }
    
    // Delete file from Drive
    async deleteFile(fileId) {
        this.ensureConnected();
        
        await gapi.client.drive.files.delete({
            fileId: fileId
        });
        
        return true;
    }
    
    // Upload entries to Drive
    async uploadEntries(entries) {
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
    
    // Get import files from Drive
    async getImportFiles() {
        const files = await this.listFiles('import_');
        return files.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
    }
    
    // Import data from a Drive file
    async importFromFile(fileId) {
        const csvContent = await this.downloadFile(fileId);
        return this.parseImportCSV(csvContent);
    }
    
    // Parse CSV content
    parseImportCSV(csvContent) {
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
        if (!this.isConnected) {
            throw new Error('Not connected to Google Drive. Please connect first.');
        }
        if (!this.gapiInited || !this.gisInited) {
            throw new Error('Google APIs not initialized. Please reconnect.');
        }
    }
    
    // Test connection
    async testConnection() {
        if (!this.isConfigured) {
            return { success: false, message: 'Not configured' };
        }
        
        try {
            await this.init();
            
            if (!this.isConnected) {
                return { success: false, message: 'Not connected. Please connect first.' };
            }
            
            // Try to list files
            const files = await this.listFiles();
            
            return {
                success: true,
                message: `✅ Connected successfully! Found ${files.length} files in folder.`,
                files: files.length
            };
        } catch (error) {
            return {
                success: false,
                message: `❌ Connection failed: ${error.message}`
            };
        }
    }
}

// Create global instance
const driveSync = new GoogleDriveSync();
