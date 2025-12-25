// drive.js - COMPLETE READY-TO-USE VERSION

class GoogleDriveSync {
    constructor() {
        // === REPLACE THESE WITH YOUR CREDENTIALS ===
        this.CLIENT_ID = 'PASTE_YOUR_CLIENT_ID_HERE.apps.googleusercontent.com';
        this.API_KEY = 'PASTE_YOUR_API_KEY_HERE';
        this.DEFAULT_FOLDER_ID = 'PASTE_YOUR_FOLDER_ID_HERE'; // Optional
        // ===========================================
        
        this.SCOPES = 'https://www.googleapis.com/auth/drive.file';
        this.discoveryDocs = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
        
        this.tokenClient = null;
        this.gapiInited = false;
        this.gisInited = false;
        this.isConnected = false;
        this.accessToken = null;
        this.folderId = this.DEFAULT_FOLDER_ID || null;
        
        this.init();
    }
    
    async init() {
        await this.loadGAPI();
        await this.loadGIS();
        this.loadConfig();
    }
    
    loadConfig() {
        const config = JSON.parse(localStorage.getItem('gdriveConfig') || '{}');
        this.accessToken = config.accessToken;
        if (!this.folderId) this.folderId = config.folderId;
        this.isConnected = !!this.accessToken && !!this.folderId;
    }
    
    saveConfig() {
        const config = {
            accessToken: this.accessToken,
            folderId: this.folderId,
            lastConnected: new Date().toISOString()
        };
        localStorage.setItem('gdriveConfig', JSON.stringify(config));
    }
    
    clearConfig() {
        localStorage.removeItem('gdriveConfig');
        this.accessToken = null;
        this.folderId = this.DEFAULT_FOLDER_ID || null;
        this.isConnected = false;
    }
    
    async loadGAPI() {
        return new Promise((resolve) => {
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
                        resolve();
                    }
                });
            };
            document.head.appendChild(script);
        });
    }
    
    async loadGIS() {
        return new Promise((resolve) => {
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
            document.head.appendChild(script);
        });
    }
    
    async connect() {
        if (!this.gapiInited || !this.gisInited) {
            throw new Error('Google APIs not loaded yet');
        }
        
        return new Promise((resolve, reject) => {
            this.tokenClient.callback = async (resp) => {
                if (resp.error !== undefined) {
                    reject(resp);
                    return;
                }
                
                this.accessToken = gapi.client.getToken().access_token;
                
                // Get folder ID if not set
                if (!this.folderId) {
                    this.folderId = await this.getFolderIdFromUser();
                    if (!this.folderId) {
                        reject(new Error('Folder ID required'));
                        return;
                    }
                }
                
                // Verify we can access the folder
                try {
                    await this.verifyFolderAccess();
                    this.isConnected = true;
                    this.saveConfig();
                    resolve(true);
                } catch (error) {
                    this.isConnected = false;
                    reject(error);
                }
            };
            
            if (gapi.client.getToken() === null) {
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                this.tokenClient.requestAccessToken({ prompt: '' });
            }
        });
    }
    
    async getFolderIdFromUser() {
        return new Promise((resolve) => {
            const folderId = prompt(
                '📁 Enter Shared Folder ID:\n\n' +
                '1. Open "Accounts Diary Sync" folder in Google Drive\n' +
                '2. Copy the ID from URL (after /folders/)\n' +
                '3. Paste it here:\n\n' +
                'Example: ABC123XYZ'
            );
            
            resolve(folderId ? folderId.trim() : null);
        });
    }
    
    async verifyFolderAccess() {
        try {
            const response = await gapi.client.drive.files.get({
                fileId: this.folderId,
                fields: 'id, name, capabilities'
            });
            
            if (!response.result.capabilities.canEdit) {
                throw new Error('No write permission');
            }
            
            return true;
        } catch (error) {
            throw new Error('Cannot access folder. Check ID and sharing.');
        }
    }
    
    disconnect() {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
        }
        this.clearConfig();
        return true;
    }
    
    async listFiles(prefix = '') {
        if (!this.isConnected) throw new Error('Not connected');
        
        let query = `'${this.folderId}' in parents and trashed=false`;
        if (prefix) query += ` and name contains '${prefix}'`;
        
        const response = await gapi.client.drive.files.list({
            q: query,
            fields: 'files(id, name, createdTime, modifiedTime, size)',
            orderBy: 'name desc'
        });
        
        return response.result.files || [];
    }
    
    async uploadExportFile(filename, csvContent) {
        if (!this.isConnected) throw new Error('Not connected');
        
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
    
    async downloadFile(fileId) {
        if (!this.isConnected) throw new Error('Not connected');
        
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        
        return response.body;
    }
    
    async deleteFile(fileId) {
        if (!this.isConnected) throw new Error('Not connected');
        
        await gapi.client.drive.files.delete({
            fileId: fileId
        });
        return true;
    }
    
    async uploadEntries(entries) {
        if (!this.isConnected) {
            throw new Error('Not connected to Google Drive. Please connect in Settings.');
        }
        
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
    
    async getImportFiles() {
        const files = await this.listFiles('import_');
        return files.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
    }
    
    async importFromFile(fileId) {
        const csvContent = await this.downloadFile(fileId);
        return this.parseImportCSV(csvContent);
    }
    
    parseImportCSV(csvContent) {
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
        const entries = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = this.parseCSVLine(lines[i]);
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
                    amount: parseFloat(entry.amount),
                    main: entry.maincategory || entry.main || '',
                    sub: entry.subcategory || entry.sub || '',
                    synced: true,
                    syncRemarks: 'synced'
                });
            }
        }
        
        return entries;
    }
    
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
    
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            folderId: this.folderId,
            hasConfig: !!this.accessToken
        };
    }
}

// Create global instance
const driveSync = new GoogleDriveSync();
