// ====================
// UPDATED NEON POSTGRESQL IMPLEMENTATION
// Now connects to your Replit backend API
// ====================

class NeonSync {
    constructor() {
        this.backendUrl = ""; // Will be set from app.js
    }

    // Test connection through your Replit backend
    async testConnection() {
        if (!this.backendUrl) {
            return {
                success: false,
                message: "Backend URL not configured"
            };
        }

        try {
            const response = await fetch(`${this.backendUrl}/api/test`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            return {
                success: true,
                message: "✅ Connected to backend! Database is ready.",
                details: data
            };
            
        } catch (error) {
            console.error("❌ Backend connection error:", error);
            return {
                success: false,
                message: `❌ Connection failed: ${error.message}`
            };
        }
    }

    // Upload entries through your Replit backend
    async uploadEntries(entries) {
        if (!this.backendUrl) {
            return {
                success: false,
                uploaded: 0,
                failed: entries.length,
                errors: [{ id: "all", error: "Backend URL not configured" }],
                message: "Backend not configured"
            };
        }

        if (!entries || entries.length === 0) {
            return { 
                success: true, 
                uploaded: 0, 
                failed: 0,
                errors: [],
                message: "No entries to upload" 
            };
        }

        try {
            // Format entries for backend
            const formattedEntries = entries.map(entry => ({
                id: entry.id,
                date: entry.date,
                desc: entry.desc,
                amount: entry.amount,
                main: entry.main,
                sub: entry.sub,
                synced: entry.synced,
                syncRemarks: entry.syncRemarks || "new"
            }));

            const response = await fetch(`${this.backendUrl}/api/upload`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ entries: formattedEntries })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            return {
                success: data.success || false,
                uploaded: data.summary?.successful || 0,
                failed: data.summary?.failed || 0,
                errors: data.details?.errors || [],
                message: data.message || "Upload completed"
            };
            
        } catch (error) {
            console.error("Upload error:", error);
            return {
                success: false,
                uploaded: 0,
                failed: entries.length,
                errors: [{ id: "all", error: error.message }],
                message: `Upload failed: ${error.message}`
            };
        }
    }

    // Delete entry through your Replit backend
    async deleteEntry(entryId) {
        if (!this.backendUrl) {
            return {
                success: false,
                message: "Backend URL not configured"
            };
        }

        try {
            const response = await fetch(`${this.backendUrl}/api/entries/${entryId}`, {
                method: "DELETE"
            });
            
            const data = await response.json();
            
            return {
                success: data.success || response.ok,
                message: data.message || "Delete operation completed"
            };
            
        } catch (error) {
            return {
                success: false,
                message: `Delete failed: ${error.message}`
            };
        }
    }

    // Fetch ALL entries from your Replit backend
    async fetchEntries() {
        if (!this.backendUrl) {
            return {
                success: false,
                message: "Backend URL not configured"
            };
        }

        try {
            const response = await fetch(`${this.backendUrl}/api/entries?limit=1000`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            return {
                success: true,
                entries: data.data?.entries || [],
                count: data.data?.pagination?.total || 0
            };
            
        } catch (error) {
            console.error("Fetch error:", error);
            return {
                success: false,
                message: `Fetch failed: ${error.message}`
            };
        }
    }

    // Search entries through your Replit backend
    async searchEntries(searchParams) {
        if (!this.backendUrl) {
            return {
                success: false,
                message: "Backend URL not configured"
            };
        }

        try {
            const response = await fetch(`${this.backendUrl}/api/search`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(searchParams)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            return {
                success: true,
                results: data.results?.entries || [],
                count: data.results?.count || 0
            };
            
        } catch (error) {
            return {
                success: false,
                message: `Search failed: ${error.message}`
            };
        }
    }
}

// Create global instance
const neonSync = new NeonSync();

// For Node.js/CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { neonSync };
}

console.log("✅ UPDATED neon.js loaded - Now connects to Replit backend");
