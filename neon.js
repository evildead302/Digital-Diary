// ====================
// REAL NEON POSTGRESQL IMPLEMENTATION
// Requires: npm install pg
// ====================

const { Client } = require('pg'); // Real PostgreSQL client

class NeonSync {
    constructor() {
        this.config = JSON.parse(localStorage.getItem("neonConfig"));
        this.tableName = "diary_entries";
    }

    // Create a real database connection
    async getClient() {
        if (!this.config) {
            throw new Error("Neon configuration not found. Please configure in Settings.");
        }

        const client = new Client({
            connectionString: `postgresql://${this.config.username}:${this.config.password}@${this.config.host}/${this.config.database}`,
            ssl: { rejectUnauthorized: false } // Required for Neon
        });

        await client.connect();
        return client;
    }

    // REAL: Test connection AND create table if needed
    async testConnection() {
        let client;
        try {
            client = await this.getClient();
            console.log("✅ Successfully connected to Neon PostgreSQL");

            // REAL SQL: Create table if it doesn't exist
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
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `;

            await client.query(createTableSQL);
            console.log("✅ Table 'diary_entries' is ready");

            return {
                success: true,
                message: "✅ Connected to Neon! Table is ready."
            };

        } catch (error) {
            console.error("❌ Neon connection error:", error);
            return {
                success: false,
                message: `❌ Connection failed: ${error.message}`
            };
        } finally {
            if (client) await client.end();
        }
    }

    // REAL: Upload entries to Neon
    async uploadEntries(entries) {
        if (!entries || entries.length === 0) {
            return { success: true, uploaded: 0, message: "No entries to upload" };
        }

        let client;
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        try {
            client = await this.getClient();

            // Process each entry with REAL SQL
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
                        true, // Mark as synced
                        entry.syncRemarks || "synced"
                    ];

                    await client.query(sql, params);
                    successCount++;
                    console.log(`✅ Uploaded entry: ${entry.id}`);

                } catch (error) {
                    errorCount++;
                    errors.push({ id: entry.id, error: error.message });
                    console.error(`❌ Failed to upload entry ${entry.id}:`, error);
                }
            }

            return {
                success: errorCount === 0,
                uploaded: successCount,
                failed: errorCount,
                errors: errors,
                message: `Uploaded ${successCount} entries, ${errorCount} failed`
            };

        } catch (error) {
            return {
                success: false,
                uploaded: 0,
                failed: entries.length,
                errors: [{ id: "all", error: error.message }],
                message: `Upload failed: ${error.message}`
            };
        } finally {
            if (client) await client.end();
        }
    }

    // REAL: Delete entry from Neon
    async deleteEntry(entryId) {
        let client;
        try {
            client = await this.getClient();
            const sql = `DELETE FROM ${this.tableName} WHERE id = $1`;
            const result = await client.query(sql, [entryId]);

            return {
                success: result.rowCount > 0,
                message: result.rowCount > 0 
                    ? "Entry deleted from Neon" 
                    : "Entry not found in Neon"
            };
        } catch (error) {
            return {
                success: false,
                message: `Delete failed: ${error.message}`
            };
        } finally {
            if (client) await client.end();
        }
    }

    // REAL: Fetch ALL entries from Neon
    async fetchEntries() {
        let client;
        try {
            client = await this.getClient();
            const sql = `SELECT * FROM ${this.tableName} ORDER BY entry_date DESC, created_at DESC`;
            const result = await client.query(sql);

            // Transform database rows to app format
            const entries = result.rows.map(row => ({
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

        } catch (error) {
            return {
                success: false,
                message: `Fetch failed: ${error.message}`
            };
        } finally {
            if (client) await client.end();
        }
    }

    // REAL: Get sync statistics
    async getSyncStatus() {
        let client;
        try {
            client = await this.getClient();
            const sql = `
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN synced = true THEN 1 ELSE 0 END) as synced_count,
                    sync_remarks,
                    COUNT(*) as count
                FROM ${this.tableName}
                GROUP BY sync_remarks
            `;
            
            const result = await client.query(sql);

            return {
                success: true,
                stats: result.rows
            };

        } catch (error) {
            return {
                success: false,
                message: `Sync status failed: ${error.message}`
            };
        } finally {
            if (client) await client.end();
        }
    }
}

// Create global instance
const neonSync = new NeonSync();

// For Node.js/CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { neonSync };
}

console.log("✅ REAL neon.js loaded successfully");
