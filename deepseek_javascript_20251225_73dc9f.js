// server.js - Google Drive CSV Bridge Backend CLI
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');
const readline = require('readline');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

// ==================== CONFIGURATION ====================
const SERVICE_ACCOUNT_KEY = process.env.GDRIVE_SERVICE_ACCOUNT;
const GDRIVE_FOLDER_ID = process.env.GDRIVE_FOLDER_ID;

// PostgreSQL/Neon configuration from Replit Secrets
const PG_CONFIG = {
    host: process.env.PGHOST || 'ep-young-sunset-ahoxequ3-pooler.c-3.us-east-1.aws.neon.tech',
    database: process.env.PGDATABASE || 'neondb',
    user: process.env.PGUSER || 'neondb_owner',
    password: process.env.PGPASSWORD || 'npg_jaoxmX6KT9qs',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
};

if (!SERVICE_ACCOUNT_KEY) {
    console.error('❌ GDRIVE_SERVICE_ACCOUNT not found in Replit Secrets');
    process.exit(1);
}

if (!GDRIVE_FOLDER_ID) {
    console.error('❌ GDRIVE_FOLDER_ID not found in Replit Secrets');
    process.exit(1);
}

// ==================== GOOGLE DRIVE SETUP ====================
let serviceAccount;
try {
    serviceAccount = JSON.parse(SERVICE_ACCOUNT_KEY);
} catch (error) {
    console.error('❌ Failed to parse service account JSON:', error.message);
    process.exit(1);
}

const auth = new google.auth.JWT(
    serviceAccount.client_email,
    null,
    serviceAccount.private_key,
    ['https://www.googleapis.com/auth/drive']
);

const drive = google.drive({ version: 'v3', auth });

// ==================== DATABASE SETUP ====================
let pool;
try {
    pool = new Pool(PG_CONFIG);
    
    pool.on('connect', () => {
        console.log('✅ Connected to Neon PostgreSQL');
    });
    
    pool.on('error', (err) => {
        console.error('❌ Database pool error:', err);
    });
} catch (error) {
    console.error('❌ Failed to create database pool:', error.message);
    process.exit(1);
}

// ==================== HELPER FUNCTIONS ====================
function parseFilenameTimestamp(filename) {
    const match = filename.match(/(export|import)_(\d{8})_(\d{6})\.csv$/);
    if (!match) return null;
    
    const [, , dateStr, timeStr] = match;
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(timeStr.substring(0, 2));
    const minute = parseInt(timeStr.substring(2, 4));
    const second = parseInt(timeStr.substring(4, 6));
    
    return new Date(year, month, day, hour, minute, second);
}

function formatTimestamp(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

async function listDriveFiles() {
    try {
        const response = await drive.files.list({
            q: `'${GDRIVE_FOLDER_ID}' in parents and trashed=false`,
            fields: 'files(id, name, createdTime, modifiedTime, size)',
            orderBy: 'name'
        });
        
        return response.data.files || [];
    } catch (error) {
        console.error('❌ Error listing Drive files:', error.message);
        return [];
    }
}

async function downloadFile(fileId) {
    try {
        const response = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' }
        );
        
        return new Promise((resolve, reject) => {
            const chunks = [];
            response.data
                .on('data', chunk => chunks.push(chunk))
                .on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
                .on('error', reject);
        });
    } catch (error) {
        console.error('❌ Error downloading file:', error.message);
        return null;
    }
}

async function uploadFile(filename, content) {
    try {
        const fileMetadata = {
            name: filename,
            parents: [GDRIVE_FOLDER_ID]
        };
        
        const media = {
            mimeType: 'text/csv',
            body: content
        };
        
        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink'
        });
        
        return response.data;
    } catch (error) {
        console.error('❌ Error uploading file:', error.message);
        return null;
    }
}

async function deleteFile(fileId) {
    try {
        await drive.files.delete({ fileId });
        console.log(`🗑️  Deleted file from Drive: ${fileId}`);
        return true;
    } catch (error) {
        console.error('❌ Error deleting file:', error.message);
        return false;
    }
}

async function processExportCSV(csvContent, filename) {
    try {
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true
        });
        
        console.log(`📊 Processing ${records.length} entries from ${filename}`);
        
        let newCount = 0;
        let editedCount = 0;
        let deletedCount = 0;
        let errorCount = 0;
        
        for (const record of records) {
            try {
                const entry = {
                    id: record.ID,
                    date: record.Date,
                    description: record.Description,
                    amount: parseFloat(record.Amount),
                    main_category: record.MainCategory,
                    sub_category: record.SubCategory,
                    sync_remarks: 'synced'
                };
                
                switch (record.SyncAction) {
                    case 'new':
                        await pool.query(`
                            INSERT INTO diary_entries 
                            (id, entry_date, description, amount, main_category, sub_category, synced, sync_remarks)
                            VALUES ($1, $2, $3, $4, $5, $6, true, $7)
                            ON CONFLICT (id) DO NOTHING
                        `, [entry.id, entry.date, entry.description, entry.amount, 
                            entry.main_category, entry.sub_category, entry.sync_remarks]);
                        newCount++;
                        break;
                        
                    case 'edited':
                        await pool.query(`
                            UPDATE diary_entries 
                            SET entry_date = $2, description = $3, amount = $4, 
                                main_category = $5, sub_category = $6, 
                                synced = true, sync_remarks = $7,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = $1
                        `, [entry.id, entry.date, entry.description, entry.amount, 
                            entry.main_category, entry.sub_category, entry.sync_remarks]);
                        editedCount++;
                        break;
                        
                    case 'deleted':
                        await pool.query(`
                            DELETE FROM diary_entries 
                            WHERE id = $1
                        `, [entry.id]);
                        deletedCount++;
                        break;
                        
                    default:
                        console.warn(`⚠️ Unknown SyncAction: ${record.SyncAction} for entry ${entry.id}`);
                        errorCount++;
                }
            } catch (error) {
                console.error(`❌ Error processing entry ${record.ID}:`, error.message);
                errorCount++;
            }
        }
        
        return { newCount, editedCount, deletedCount, errorCount, total: records.length };
    } catch (error) {
        console.error('❌ Error parsing CSV:', error.message);
        return { newCount: 0, editedCount: 0, deletedCount: 0, errorCount: 1, total: 0 };
    }
}

async function exportNeonToCSV() {
    try {
        const result = await pool.query(`
            SELECT id, entry_date as date, description, amount, 
                   main_category, sub_category, sync_remarks
            FROM diary_entries 
            ORDER BY entry_date DESC, created_at DESC
        `);
        
        const entries = result.rows.map(row => ({
            ID: row.id,
            Date: row.date,
            Description: row.description || '',
            Amount: row.amount,
            MainCategory: row.main_category,
            SubCategory: row.sub_category,
            SyncStatus: 'from_neon',
            SyncAction: 'synced',
            LastSynced: new Date().toISOString()
        }));
        
        const csvContent = stringify(entries, {
            header: true,
            columns: ['ID', 'Date', 'Description', 'Amount', 'MainCategory', 'SubCategory', 'SyncStatus', 'SyncAction', 'LastSynced']
        });
        
        const timestamp = formatTimestamp(new Date());
        const filename = `import_${timestamp}.csv`;
        
        return { filename, csvContent, entryCount: entries.length };
    } catch (error) {
        console.error('❌ Error exporting from Neon:', error.message);
        return null;
    }
}

// ==================== MAIN FUNCTIONS ====================
async function importFromDrive() {
    console.log('🔄 IMPORTING from Drive to Neon...');
    
    try {
        const files = await listDriveFiles();
        const exportFiles = files
            .filter(file => file.name.startsWith('export_'))
            .sort((a, b) => parseFilenameTimestamp(a.name) - parseFilenameTimestamp(b.name));
        
        if (exportFiles.length === 0) {
            console.log('📭 No export files found in Drive');
            return;
        }
        
        console.log(`📁 Found ${exportFiles.length} export files:`);
        exportFiles.forEach(file => {
            console.log(`   📄 ${file.name} (${new Date(file.createdTime).toLocaleString()})`);
        });
        
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question(`\nProcess ${exportFiles.length} files in chronological order? (y/N): `, async (answer) => {
            if (answer.toLowerCase() === 'y') {
                let totalProcessed = 0;
                let totalEntries = 0;
                
                for (const file of exportFiles) {
                    console.log(`\n📥 Processing: ${file.name}...`);
                    
                    const csvContent = await downloadFile(file.id);
                    if (!csvContent) {
                        console.log(`❌ Failed to download ${file.name}`);
                        continue;
                    }
                    
                    const result = await processExportCSV(csvContent, file.name);
                    
                    if (result.total > 0) {
                        console.log(`✅ Processed: ${result.total} entries`);
                        console.log(`   📝 New: ${result.newCount}, ✏️ Edited: ${result.editedCount}, 🗑️ Deleted: ${result.deletedCount}`);
                        
                        // Delete the processed file
                        await deleteFile(file.id);
                        
                        totalProcessed++;
                        totalEntries += result.total;
                    }
                    
                    // Small delay between files
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                console.log(`\n🎉 IMPORT COMPLETE`);
                console.log(`   Processed ${totalProcessed} files with ${totalEntries} total entries`);
            } else {
                console.log('❌ Import cancelled');
            }
            
            rl.close();
            showMenu();
        });
        
    } catch (error) {
        console.error('❌ Import failed:', error.message);
        showMenu();
    }
}

async function exportToDrive() {
    console.log('🔄 EXPORTING from Neon to Drive...');
    
    try {
        const exportData = await exportNeonToCSV();
        if (!exportData || exportData.entryCount === 0) {
            console.log('📭 No entries to export from Neon');
            return;
        }
        
        console.log(`📊 Preparing ${exportData.entryCount} entries for export...`);
        
        const uploadedFile = await uploadFile(exportData.filename, exportData.csvContent);
        
        if (uploadedFile) {
            console.log(`✅ EXPORT COMPLETE`);
            console.log(`   📄 File: ${uploadedFile.name}`);
            console.log(`   📦 Entries: ${exportData.entryCount}`);
            console.log(`   🔗 Drive URL: https://drive.google.com/file/d/${uploadedFile.id}/view`);
        } else {
            console.log('❌ Failed to upload to Drive');
        }
    } catch (error) {
        console.error('❌ Export failed:', error.message);
    }
    
    showMenu();
}

async function checkDriveStatus() {
    console.log('📊 Checking Drive folder status...');
    
    try {
        const files = await listDriveFiles();
        const exportFiles = files.filter(file => file.name.startsWith('export_'));
        const importFiles = files.filter(file => file.name.startsWith('import_'));
        
        console.log(`\n📁 Drive Folder: ${GDRIVE_FOLDER_ID}`);
        console.log('='.repeat(50));
        console.log(`📤 Export files (pending sync): ${exportFiles.length}`);
        exportFiles.forEach(file => {
            console.log(`   📄 ${file.name} - ${new Date(file.createdTime).toLocaleString()} - ${file.size} bytes`);
        });
        
        console.log(`\n📥 Import files (from Neon): ${importFiles.length}`);
        importFiles.slice(0, 5).forEach(file => {
            console.log(`   📄 ${file.name} - ${new Date(file.createdTime).toLocaleString()} - ${file.size} bytes`);
        });
        
        if (importFiles.length > 5) {
            console.log(`   ... and ${importFiles.length - 5} more`);
        }
        
        console.log('\n📊 Database Status:');
        try {
            const dbResult = await pool.query('SELECT COUNT(*) as total FROM diary_entries');
            console.log(`   Total entries in Neon: ${dbResult.rows[0].total}`);
        } catch (dbError) {
            console.log('   ❌ Could not connect to database');
        }
        
    } catch (error) {
        console.error('❌ Failed to check Drive status:', error.message);
    }
    
    showMenu();
}

// ==================== CONSOLE MENU ====================
function showMenu() {
    console.log('\n' + '='.repeat(50));
    console.log('📘 ACCOUNTS DIARY - GOOGLE DRIVE CSV BRIDGE');
    console.log('='.repeat(50));
    console.log('1. 📥 IMPORT from Drive to Neon');
    console.log('   - Process export_*.csv files');
    console.log('   - Update Neon database');
    console.log('   - Delete processed files from Drive');
    console.log('');
    console.log('2. 📤 EXPORT from Neon to Drive');
    console.log('   - Create import_*.csv snapshot');
    console.log('   - Upload to Google Drive');
    console.log('');
    console.log('3. 📊 Check Drive Folder Status');
    console.log('   - List all CSV files');
    console.log('   - Show database count');
    console.log('');
    console.log('4. 🚪 Exit');
    console.log('='.repeat(50));
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('\nSelect option (1-4): ', (choice) => {
        rl.close();
        
        switch (choice.trim()) {
            case '1':
                importFromDrive();
                break;
            case '2':
                exportToDrive();
                break;
            case '3':
                checkDriveStatus();
                break;
            case '4':
                console.log('👋 Exiting...');
                process.exit(0);
                break;
            default:
                console.log('❌ Invalid option. Please try again.');
                showMenu();
        }
    });
}

// ==================== INITIALIZATION ====================
async function initialize() {
    console.log('🚀 Starting Google Drive CSV Bridge...');
    console.log(`📁 Drive Folder ID: ${GDRIVE_FOLDER_ID}`);
    
    try {
        // Test Google Drive connection
        console.log('🔗 Testing Google Drive connection...');
        await listDriveFiles();
        console.log('✅ Google Drive connection successful');
        
        // Test database connection
        console.log('🔗 Testing Neon PostgreSQL connection...');
        await pool.query('SELECT NOW()');
        console.log('✅ Neon PostgreSQL connection successful');
        
        // Check if table exists, create if not
        await pool.query(`
            CREATE TABLE IF NOT EXISTS diary_entries (
                id VARCHAR(50) PRIMARY KEY,
                entry_date VARCHAR(10) NOT NULL,
                description TEXT,
                amount DECIMAL(10, 2) NOT NULL,
                main_category VARCHAR(100) NOT NULL,
                sub_category VARCHAR(100) NOT NULL,
                synced BOOLEAN DEFAULT TRUE,
                sync_remarks VARCHAR(20) DEFAULT 'synced',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ Database table ready');
        
        // Show menu
        setTimeout(showMenu, 1000);
        
    } catch (error) {
        console.error('❌ Initialization failed:', error.message);
        process.exit(1);
    }
}

// Start the application
initialize();