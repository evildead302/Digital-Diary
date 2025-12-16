// ====================
// NEON POSTGRESQL IMPLEMENTATION
// ====================

class NeonSync {
    constructor() {
        this.config = JSON.parse(localStorage.getItem("neonConfig")) || null;
        this.apiBase = "https://console.neon.tech/api/v2";
        this.tableName = "diary_entries";
    }

    // Test connection and create table
    async testConnection() {
        if (!this.config) {
            throw new Error("Neon configuration not found");
        }

        try {
            // First, test connection
            const canConnect = await this.executeQuery("SELECT 1 as test;");
            
            if (canConnect.success) {
                // Create table if it doesn't exist
                const createTableSQL = `
                    CREATE TABLE IF NOT EXISTS ${this.tableName} (
                        id VARCHAR(50) PRIMARY KEY,
                        main_category VARCHAR(100) NOT NULL,
                        sub_category VARCHAR(100) NOT NULL,
                        entry_date VARCHAR(10) NOT NULL,
                        description TEXT,
                        amount DECIMAL(10, 2) NOT NULL,
                        synced BOOLEAN DEFAULT FALSE,
                        sync_remarks VARCHAR(20) DEFAULT 'new',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(id)
                    );
                    
                    CREATE INDEX IF NOT EXISTS idx_${this.tableName}_date ON ${this.tableName}(entry_date);
                    CREATE INDEX IF NOT EXISTS idx_${this.tableName}_main ON ${this.tableName}(main_category);
                    CREATE INDEX IF NOT EXISTS idx_${this.tableName}_synced ON ${this.tableName}(synced);
                    CREATE INDEX IF NOT EXISTS idx_${this.tableName}_sync_remarks ON ${this.tableName}(sync_remarks);
                `;

                const tableCreated = await this.executeQuery(createTableSQL);
                
                if (tableCreated.success) {
                    return {
                        success: true,
                        message: "✅ Connected to Neon PostgreSQL and table is ready",
                        tableExists: true
                    };
                } else {
                    throw new Error("Failed to create table: " + tableCreated.error);
                }
            } else {
                throw new Error("Connection test failed");
            }
        } catch (error) {
            console.error("Neon connection error:", error);
            return {
                success: false,
                message: "❌ Connection failed: " + error.message
            };
        }
    }

    // Execute SQL query on Neon
    async executeQuery(sql, params = []) {
        if (!this.config) {
            throw new Error("Neon not configured");
        }

        try {
            // For real implementation, you would use the Neon API or direct PostgreSQL connection
            // This is a mock implementation - replace with actual Neon API calls
            
            console.log("Executing Neon SQL:", sql);
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Mock successful response
            return {
                success: true,
                data: [],
                rowsAffected: 0
            };
            
        } catch (error) {
            console.error("Neon query error:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Upload entries to Neon
    async uploadEntries(entries) {
        if (!this.config) {
            throw new Error("Neon not configured");
        }

        if (!entries || entries.length === 0) {
            return { success: true, uploaded: 0, message: "No entries to upload" };
        }

        const results = {
            uploaded: 0,
            failed: 0,
            errors: []
        };

        for (const entry of entries) {
            try {
                const sql = `
                    INSERT INTO ${this.tableName} 
                    (id, main_category, sub_category, entry_date, description, amount, synced, sync_remarks)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (id) 
                    DO UPDATE SET
                        main_category = $2,
                        sub_category = $3,
                        entry_date = $4,
                        description = $5,
                        amount = $6,
                        synced = $7,
                        sync_remarks = $8,
                        updated_at = CURRENT_TIMESTAMP
                `;

                const params = [
                    entry.id,
                    entry.main,
                    entry.sub,
                    entry.date,
                    entry.desc,
                    entry.amount,
                    true,
                    entry.syncRemarks || "synced"
                ];

                const result = await this.executeQuery(sql, params);
                
                if (result.success) {
                    results.uploaded++;
                } else {
                    results.failed++;
                    results.errors.push({
                        id: entry.id,
                        error: result.error
                    });
                }
            } catch (error) {
                results.failed++;
                results.errors.push({
                    id: entry.id,
                    error: error.message
                });
            }
        }

        return {
            success: results.failed === 0,
            ...results,
            message: `Uploaded ${results.uploaded} entries, ${results.failed} failed`
        };
    }

    // Delete entry from Neon
    async deleteEntry(entryId) {
        if (!this.config) {
            throw new Error("Neon not configured");
        }

        try {
            const sql = `DELETE FROM ${this.tableName} WHERE id = $1`;
            const result = await this.executeQuery(sql, [entryId]);
            
            return {
                success: result.success,
                message: result.success ? "Entry deleted from Neon" : "Failed to delete entry"
            };
        } catch (error) {
            return {
                success: false,
                message: "Delete failed: " + error.message
            };
        }
    }

    // Fetch entries from Neon
    async fetchEntries() {
        if (!this.config) {
            throw new Error("Neon not configured");
        }

        try {
            const sql = `SELECT * FROM ${this.tableName} ORDER BY entry_date DESC, created_at DESC`;
            const result = await this.executeQuery(sql);
            
            if (result.success && result.data) {
                // Transform Neon data to local format
                const entries = result.data.map(row => ({
                    id: row.id,
                    date: row.entry_date,
                    desc: row.description,
                    amount: parseFloat(row.amount),
                    main: row.main_category,
                    sub: row.sub_category,
                    synced: row.synced,
                    syncRemarks: row.sync_remarks || "synced",
                    created_at: row.created_at,
                    updated_at: row.updated_at
                }));
                
                return {
                    success: true,
                    entries: entries,
                    count: entries.length
                };
            } else {
                return {
                    success: false,
                    message: "Failed to fetch entries"
                };
            }
        } catch (error) {
            return {
                success: false,
                message: "Fetch failed: " + error.message
            };
        }
    }

    // Get sync status
    async getSyncStatus() {
        if (!this.config) {
            return { success: false, message: "Neon not configured" };
        }

        try {
            const sql = `
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN synced = true THEN 1 ELSE 0 END) as synced_count,
                    sync_remarks,
                    COUNT(*) as count
                FROM ${this.tableName}
                GROUP BY sync_remarks
            `;
            
            const result = await this.executeQuery(sql);
            
            if (result.success) {
                return {
                    success: true,
                    stats: result.data || []
                };
            } else {
                return {
                    success: false,
                    message: "Failed to get sync status"
                };
            }
        } catch (error) {
            return {
                success: false,
                message: "Sync status failed: " + error.message
            };
        }
    }
}

// Create global instance
const neonSync = new NeonSync();

// ====================
// INTEGRATION FUNCTIONS FOR APP.JS
// ====================

// Test Neon connection (updated)
async function testNeonConnection() {
    const testResult = document.getElementById("testResult");
    if (testResult) {
        testResult.innerHTML = '<span style="color: #2196f3;">🔍 Testing Neon connection...</span>';
        testResult.style.display = "inline-block";
    }

    try {
        const result = await neonSync.testConnection();
        
        if (testResult) {
            if (result.success) {
                testResult.innerHTML = '<span style="color: #4caf50;">✅ ' + result.message + '</span>';
            } else {
                testResult.innerHTML = '<span style="color: #f44336;">❌ ' + result.message + '</span>';
            }
        }
        
        return result;
    } catch (error) {
        if (testResult) {
            testResult.innerHTML = '<span style="color: #f44336;">❌ ' + error.message + '</span>';
        }
        throw error;
    }
}

// Upload to Neon (updated)
async function uploadToNeon() {
    if (!neonConfig) {
        alert("Please configure Neon in Settings first!");
        showPage("settings");
        return;
    }

    try {
        // Get entries that need sync
        getAllEntries(async entries => {
            const entriesToSync = entries.filter(e => 
                !e.synced || (e.syncRemarks && e.syncRemarks !== "synced")
            );

            if (entriesToSync.length === 0) {
                alert("✅ All entries are already synced!");
                return;
            }

            // Show progress
            const uploadBtn = document.querySelector('button[onclick="uploadToNeon()"]');
            const originalText = uploadBtn?.textContent || "Upload to Neon";
            
            if (uploadBtn) {
                uploadBtn.textContent = `⏳ Syncing ${entriesToSync.length} entries...`;
                uploadBtn.disabled = true;
            }

            // Separate entries by operation
            const entriesToUpload = entriesToSync.filter(e => e.syncRemarks !== "deleted");
            const entriesToDelete = entriesToSync.filter(e => e.syncRemarks === "deleted");

            let uploadedCount = 0;
            let deletedCount = 0;
            let errors = [];

            // Upload/Update entries
            if (entriesToUpload.length > 0) {
                const uploadResult = await neonSync.uploadEntries(entriesToUpload);
                uploadedCount = uploadResult.uploaded;
                if (uploadResult.errors) {
                    errors.push(...uploadResult.errors);
                }
            }

            // Delete entries
            if (entriesToDelete.length > 0) {
                for (const entry of entriesToDelete) {
                    const deleteResult = await neonSync.deleteEntry(entry.id);
                    if (deleteResult.success) {
                        deletedCount++;
                    } else {
                        errors.push({ id: entry.id, error: deleteResult.message });
                    }
                }
            }

            // Mark as synced locally
            for (const entry of entriesToSync) {
                entry.synced = true;
                entry.syncRemarks = "synced";
                await saveEntry(entry);
            }

            // Update UI
            if (uploadBtn) {
                uploadBtn.textContent = originalText;
                uploadBtn.disabled = false;
            }

            updateGlobalNeonStatus();
            loadSaved();
            calcTotal();
            loadLedger();

            // Show results
            let message = `✅ Sync completed!\n\n`;
            message += `📤 Uploaded/Updated: ${uploadedCount}\n`;
            if (deletedCount > 0) {
                message += `🗑️ Deleted from Neon: ${deletedCount}\n`;
            }
            if (errors.length > 0) {
                message += `❌ Errors: ${errors.length}\n`;
                console.error("Sync errors:", errors);
            }

            alert(message);
        });

    } catch (error) {
        alert("❌ Upload failed: " + error.message);
        console.error("Upload error:", error);
        
        // Re-enable button
        const uploadBtn = document.querySelector('button[onclick="uploadToNeon()"]');
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.textContent = "☁️ Upload to Neon";
        }
    }
}

// Restore from Neon (updated)
async function restoreFromNeon() {
    if (!neonConfig) {
        alert("Please configure Neon in Settings first!");
        showPage("settings");
        return;
    }

    if (!confirm("This will fetch all data from Neon and merge with local data. Continue?")) {
        return;
    }

    try {
        // Show progress
        const restoreBtn = document.querySelector('button[onclick="restoreFromNeon()"]');
        const originalText = restoreBtn?.textContent || "Restore from Neon";
        
        if (restoreBtn) {
            restoreBtn.textContent = "⏳ Fetching from Neon...";
            restoreBtn.disabled = true;
        }

        // Fetch entries from Neon
        const result = await neonSync.fetchEntries();
        
        if (!result.success) {
            throw new Error(result.message);
        }

        const neonEntries = result.entries;
        let importedCount = 0;
        let updatedCount = 0;

        // Merge with local entries
        getAllEntries(async localEntries => {
            for (const neonEntry of neonEntries) {
                try {
                    // Check if entry exists locally
                    const existingEntry = localEntries.find(e => e.id === neonEntry.id);
                    
                    if (!existingEntry) {
                        // New entry - add it
                        await saveEntry(neonEntry);
                        importedCount++;
                    } else {
                        // Check which is newer
                        const neonDate = new Date(neonEntry.updated_at || neonEntry.created_at);
                        const localDate = new Date(existingEntry.updated_at || existingEntry.created_at);
                        
                        if (neonDate > localDate) {
                            // Neon has newer version
                            existingEntry.main = neonEntry.main;
                            existingEntry.sub = neonEntry.sub;
                            existingEntry.date = neonEntry.date;
                            existingEntry.desc = neonEntry.desc;
                            existingEntry.amount = neonEntry.amount;
                            existingEntry.synced = true;
                            existingEntry.syncRemarks = "synced";
                            await saveEntry(existingEntry);
                            updatedCount++;
                        }
                    }
                } catch (error) {
                    console.error("Error processing Neon entry:", error);
                }
            }

            // Update UI
            if (restoreBtn) {
                restoreBtn.textContent = originalText;
                restoreBtn.disabled = false;
            }

            calcTotal();
            loadSaved();
            loadLedger();

            alert(`✅ Restored ${importedCount} new entries from Neon! ${updatedCount > 0 ? `(${updatedCount} updated)` : ''}`);

        });

    } catch (error) {
        alert("❌ Restore failed: " + error.message);
        console.error("Restore error:", error);
        
        // Re-enable button
        const restoreBtn = document.querySelector('button[onclick="restoreFromNeon()"]');
        if (restoreBtn) {
            restoreBtn.disabled = false;
            restoreBtn.textContent = "⬇️ Restore from Neon";
        }
    }
}

// Update app.js to use new functions
// Add this to your app.js where Neon functions are called
