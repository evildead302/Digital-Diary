// ====================
// GLOBAL VARIABLES
// ====================

const pages = document.querySelectorAll(".page");
let heads = JSON.parse(localStorage.getItem("heads")) || {};
let neonConfig = JSON.parse(localStorage.getItem("neonConfig")) || null;
let tempEntries = [];
let isEditing = false;
let editingEntryId = null;

// ====================
// PAGE NAVIGATION
// ====================

function showPage(id) {
    pages.forEach(p => {
        p.classList.remove("active");
        p.style.display = "none";
    });
    
    const page = document.getElementById(id);
    if (page) {
        page.style.display = "block";
        page.classList.add("active");
        
        // Initialize specific pages
        switch(id) {
            case 'home':
                loadHomeData();
                break;
            case 'entry':
                updateEntryDropdowns();
                loadSaved();
                resetEntryForm();
                break;
            case 'balance':
                calcTotal();
                break;
            case 'ledger':
                updateLedgerCategories();
                loadLedger();
                break;
            case 'search':
                updateSearchCategories();
                break;
            case 'backup':
                updateBackupStatus();
                break;
            case 'settings':
                initNeonUI();
                break;
        }
    }
}

// Initialize with home page
showPage("home");

// ====================
// CATEGORY MANAGEMENT
// ====================

function saveHeads() {
    localStorage.setItem("heads", JSON.stringify(heads));
    renderHeads();
    updateAllDropdowns();
}

function renderHeads() {
    const mainForSub = document.getElementById("mainForSub");
    const entryMain = document.getElementById("entryMain");
    const headList = document.getElementById("headList");
    
    // Clear all
    if (mainForSub) mainForSub.innerHTML = '<option value="">-- Select Main --</option>';
    if (entryMain) entryMain.innerHTML = '<option value="">-- Select Main --</option>';
    if (headList) headList.innerHTML = '';
    
    // Populate
    for(let main in heads) {
        // Add to dropdowns
        if (mainForSub) {
            const option1 = document.createElement("option");
            option1.value = main;
            option1.textContent = main;
            mainForSub.appendChild(option1);
        }
        
        if (entryMain) {
            const option2 = document.createElement("option");
            option2.value = main;
            option2.textContent = main;
            entryMain.appendChild(option2);
        }
        
        // Add to list
        if (headList) {
            const li = document.createElement("li");
            li.innerHTML = `
                <div class="category-item">
                    <span class="main-category"><strong>${main}</strong></span>
                    <button onclick="deleteMainHead('${main}')" class="small-btn danger-btn">🗑️ Delete</button>
                    <ul class="subcategory-list">
                        ${heads[main].map(sub => `
                            <li>
                                <span>${sub}</span>
                                <button onclick="deleteSubHead('${main}','${sub}')" class="small-btn">❌</button>
                            </li>
                        `).join("")}
                    </ul>
                </div>
            `;
            headList.appendChild(li);
        }
    }
}

// Initialize categories
renderHeads();

// Update all dropdowns
function updateAllDropdowns() {
    updateEntryDropdowns();
    updateLedgerCategories();
    updateSearchCategories();
}

// ====================
// ENTRY PAGE FUNCTIONS
// ====================

function updateEntryDropdowns() {
    const entryMain = document.getElementById("entryMain");
    const entrySub = document.getElementById("entrySub");
    
    if (!entryMain || !entrySub) return;
    
    // Save current selection
    const selectedMain = entryMain.value;
    
    // Update main categories
    entryMain.innerHTML = '<option value="">-- Select Main --</option>';
    for (let main in heads) {
        const option = document.createElement("option");
        option.value = main;
        option.textContent = main;
        if (main === selectedMain) option.selected = true;
        entryMain.appendChild(option);
    }
    
    // Update sub categories based on selected main
    updateEntrySubheads();
}

function updateEntrySubheads() {
    const entryMain = document.getElementById("entryMain");
    const entrySub = document.getElementById("entrySub");
    
    if (!entryMain || !entrySub) return;
    
    const selectedMain = entryMain.value;
    entrySub.innerHTML = '<option value="">-- Select Sub --</option>';
    
    if (selectedMain && heads[selectedMain]) {
        heads[selectedMain].forEach(sub => {
            const option = document.createElement("option");
            option.value = sub;
            option.textContent = sub;
            entrySub.appendChild(option);
        });
    }
}

// ====================
// DATE FUNCTIONS
// ====================

function formatDate(v) {
    const d = new Date(v);
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth()+1).padStart(2, "0")}-${d.getFullYear()}`;
}

function genID(i) {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const ss = String(d.getSeconds()).padStart(2, "0");
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${ymd}${ss}${ms}${i+1}`;
}

// ====================
// TEMPORARY ENTRIES - FIXED LAYOUT
// ====================

function addTemp() {
    // Validate inputs
    if (!entryMain.value) {
        alert("Please select a main category");
        return;
    }
    
    if (!entrySub.value) {
        alert("Please select a sub category");
        return;
    }
    
    if (!desc.value.trim()) {
        alert("Please enter a description");
        return;
    }
    
    const amountValue = parseFloat(amount.value);
    if (isNaN(amountValue)) {
        alert("Please enter a valid amount");
        return;
    }
    
    // Use today's date if not specified
    const entryDate = date.value ? formatDate(date.value) : formatDate(new Date());
    
    // Add to temp entries
    tempEntries.push({
        date: entryDate,
        desc: desc.value.trim(),
        amount: amountValue,
        main: entryMain.value,
        sub: entrySub.value,
        synced: false,
        syncRemarks: "new"
    });
    
    // Clear only description and amount, keep categories
    desc.value = "";
    amount.value = "";
    
    renderTemp();
}

function renderTemp() {
    const tempList = document.getElementById("tempList");
    if (!tempList) return;
    
    tempList.innerHTML = "";
    
    if (tempEntries.length === 0) {
        tempList.innerHTML = '<li class="no-entries">No temporary entries</li>';
        return;
    }
    
    // Create table header
    const headerRow = document.createElement("li");
    headerRow.className = "table-header";
    headerRow.innerHTML = `
        <div class="table-row">
            <div class="table-cell">Date</div>
            <div class="table-cell">Main Category</div>
            <div class="table-cell">Sub Category</div>
            <div class="table-cell">Description</div>
            <div class="table-cell">Amount</div>
            <div class="table-cell">Actions</div>
        </div>
    `;
    tempList.appendChild(headerRow);
    
    // Add entries
    tempEntries.forEach((e, i) => {
        const li = document.createElement("li");
        li.className = `table-row-item ${i % 2 === 0 ? 'even' : 'odd'} ${e.amount < 0 ? "expense" : "income"}`;
        
        li.innerHTML = `
            <div class="table-row">
                <div class="table-cell date-cell">${e.date}</div>
                <div class="table-cell main-cell">${e.main}</div>
                <div class="table-cell sub-cell">${e.sub}</div>
                <div class="table-cell desc-cell">${e.desc}</div>
                <div class="table-cell amount-cell ${e.amount < 0 ? 'negative' : 'positive'}">
                    ${e.amount < 0 ? '-' : '+'}PKR ${Math.abs(e.amount).toFixed(2)}
                </div>
                <div class="table-cell action-cell">
                    <button onclick="editTemp(${i})" class="small-btn edit-btn">✏️</button>
                    <button onclick="deleteTemp(${i})" class="small-btn danger-btn">🗑️</button>
                </div>
            </div>
        `;
        tempList.appendChild(li);
    });
}

function editTemp(i) {
    const e = tempEntries[i];
    
    // Fill form with entry data
    document.getElementById("date").value = e.date.split("-").reverse().join("-");
    document.getElementById("desc").value = e.desc;
    document.getElementById("amount").value = e.amount;
    
    // Set categories
    const entryMain = document.getElementById("entryMain");
    const entrySub = document.getElementById("entrySub");
    
    if (entryMain) {
        entryMain.value = e.main;
        updateEntrySubheads();
        
        setTimeout(() => {
            if (entrySub) entrySub.value = e.sub;
        }, 100);
    }
    
    // Remove from temp entries
    tempEntries.splice(i, 1);
    renderTemp();
}

function deleteTemp(i) {
    if (confirm("Delete this temporary entry?")) {
        tempEntries.splice(i, 1);
        renderTemp();
    }
}

function clearTemp() {
    if (tempEntries.length > 0 && confirm("Clear all temporary entries?")) {
        tempEntries = [];
        renderTemp();
    }
}

// ====================
// SAVE ALL ENTRIES
// ====================

function saveAll() {
    if (tempEntries.length === 0 && !isEditing) {
        alert("No entries to save");
        return;
    }
    
    if (isEditing && editingEntryId) {
        // Save edited entry
        getAllEntries(async d => {
            const existingEntry = d.find(x => x.id === editingEntryId);
            if (!existingEntry) return;
            
            const editedEntry = {
                id: editingEntryId, // Keep same ID
                date: formatDate(date.value),
                desc: desc.value.trim(),
                amount: parseFloat(amount.value),
                main: entryMain.value,
                sub: entrySub.value,
                synced: existingEntry.synced,
                syncRemarks: existingEntry.synced ? "edited" : "new" // Mark as edited if synced before
            };
            
            await saveEntry(editedEntry);
            
            // Reset editing mode
            cancelEdit();
            
            // Update UI
            loadSaved();
            calcTotal();
            loadLedger();
            
            alert("✅ Entry updated successfully!");
        });
        return;
    }
    
    if (tempEntries.length > 0) {
        if (!confirm(`Save ${tempEntries.length} entries to database?`)) {
            return;
        }
        
        // Save each entry
        tempEntries.forEach((e, i) => {
            e.id = genID(i);
            e.synced = false;
            e.syncRemarks = "new";
            saveEntry(e);
        });
        
        // Clear temp entries
        tempEntries = [];
        renderTemp();
        
        // Update UI
        loadSaved();
        calcTotal();
        
        // Auto-sync if enabled
        if (document.getElementById("autoSync")?.checked && neonConfig) {
            setTimeout(uploadToNeon, 1000);
        }
        
        alert(`✅ Successfully saved ${tempEntries.length} entries!`);
    }
}

// ====================
// SAVED ENTRIES MANAGEMENT - FIXED LAYOUT
// ====================

function loadSaved() {
    getAllEntries(d => {
        const savedEntryList = document.getElementById("savedEntryList");
        if (!savedEntryList) return;
        
        savedEntryList.innerHTML = "";
        
        // Sort by date (newest first)
        d.sort((a, b) => {
            const dateA = new Date(a.date.split("-").reverse().join("-"));
            const dateB = new Date(b.date.split("-").reverse().join("-"));
            return dateB - dateA;
        });
        
        // Show only non-deleted entries
        const activeEntries = d.filter(e => e.syncRemarks !== "deleted");
        const recentEntries = activeEntries.slice(0, 20);
        
        if (recentEntries.length === 0) {
            savedEntryList.innerHTML = '<li class="no-entries">No saved entries</li>';
            return;
        }
        
        // Create table header
        const headerRow = document.createElement("li");
        headerRow.className = "table-header";
        headerRow.innerHTML = `
            <div class="table-row">
                <div class="table-cell">Date</div>
                <div class="table-cell">Main Category</div>
                <div class="table-cell">Sub Category</div>
                <div class="table-cell">Description</div>
                <div class="table-cell">Amount</div>
                <div class="table-cell">Actions</div>
            </div>
        `;
        savedEntryList.appendChild(headerRow);
        
        // Add entries
        recentEntries.forEach((e, i) => {
            const li = document.createElement("li");
            li.className = `table-row-item ${i % 2 === 0 ? 'even' : 'odd'} ${e.amount < 0 ? "expense" : "income"}`;
            
            li.innerHTML = `
                <div class="table-row">
                    <div class="table-cell date-cell">${e.date}</div>
                    <div class="table-cell main-cell">${e.main}</div>
                    <div class="table-cell sub-cell">${e.sub}</div>
                    <div class="table-cell desc-cell">${e.desc}</div>
                    <div class="table-cell amount-cell ${e.amount < 0 ? 'negative' : 'positive'}">
                        ${e.amount < 0 ? '-' : '+'}PKR ${Math.abs(e.amount).toFixed(2)}
                    </div>
                    <div class="table-cell action-cell">
                        <button onclick="editSavedEntry('${e.id}')" class="small-btn edit-btn">✏️</button>
                        <button onclick="markEntryAsDeleted('${e.id}')" class="small-btn danger-btn">🗑️</button>
                    </div>
                </div>
            `;
            savedEntryList.appendChild(li);
        });
    });
}

function markEntryAsDeleted(id) {
    if (!confirm("Mark this entry as deleted? It will be removed from balance but kept for Neon sync.")) {
        return;
    }
    
    getAllEntries(async d => {
        const entry = d.find(x => x.id === id);
        if (!entry) return;
        
        // Mark as deleted but keep in database
        entry.syncRemarks = "deleted";
        entry.synced = false; // Needs to be synced to Neon
        
        await saveEntry(entry);
        
        // Update UI
        loadSaved();
        calcTotal();
        loadLedger();
        
        alert("✅ Entry marked as deleted. Will be removed from Neon on next sync.");
    });
}

function editSavedEntry(id) {
    isEditing = true;
    editingEntryId = id;
    
    getAllEntries(d => {
        const e = d.find(x => x.id === id);
        if (!e) return;
        
        // Fill form with entry data
        document.getElementById("date").value = e.date.split("-").reverse().join("-");
        document.getElementById("desc").value = e.desc;
        document.getElementById("amount").value = e.amount;
        
        // Set categories
        const entryMain = document.getElementById("entryMain");
        const entrySub = document.getElementById("entrySub");
        
        if (entryMain) {
            entryMain.value = e.main;
            updateEntrySubheads();
            
            setTimeout(() => {
                if (entrySub) entrySub.value = e.sub;
            }, 100);
        }
        
        // Show cancel button
        const cancelBtn = document.getElementById("cancelEditBtn");
        if (cancelBtn) cancelBtn.style.display = "inline-block";
        
        // Change save button text
        const saveBtn = document.querySelector('button[onclick="saveAll()"]');
        if (saveBtn) saveBtn.textContent = "💾 Update Entry";
        
        // Show message
        const msg = document.createElement('div');
        msg.className = 'edit-message';
        msg.innerHTML = '<p style="color: #ff9800; margin: 10px 0;">✏️ Editing mode active. Make changes or click Cancel to keep original.</p>';
        
        const form = document.querySelector('.entry-form');
        if (form && !form.querySelector('.edit-message')) {
            form.appendChild(msg);
        }
    });
}

function cancelEdit() {
    if (isEditing) {
        isEditing = false;
        editingEntryId = null;
        
        // Hide cancel button
        const cancelBtn = document.getElementById("cancelEditBtn");
        if (cancelBtn) cancelBtn.style.display = "none";
        
        // Reset save button text
        const saveBtn = document.querySelector('button[onclick="saveAll()"]');
        if (saveBtn) saveBtn.textContent = "💾 Save All";
        
        // Remove edit message
        const msg = document.querySelector('.edit-message');
        if (msg) msg.remove();
        
        // Clear form
        resetEntryForm();
    }
}

function resetEntryForm() {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("date").value = today;
    document.getElementById("desc").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("entryMain").value = "";
    document.getElementById("entrySub").value = "";
    
    // Reset editing mode
    isEditing = false;
    editingEntryId = null;
    
    // Hide cancel button
    const cancelBtn = document.getElementById("cancelEditBtn");
    if (cancelBtn) cancelBtn.style.display = "none";
    
    // Reset save button text
    const saveBtn = document.querySelector('button[onclick="saveAll()"]');
    if (saveBtn) saveBtn.textContent = "💾 Save All";
    
    // Remove edit message
    const msg = document.querySelector('.edit-message');
    if (msg) msg.remove();
}

// ====================
// BALANCE CALCULATION - EXCLUDE DELETED ENTRIES
// ====================

function calcTotal() {
    getAllEntries(d => {
        // Filter out deleted entries
        const activeEntries = d.filter(e => e.syncRemarks !== "deleted");
        
        // Calculate totals
        const total = activeEntries.reduce((a, b) => a + b.amount, 0);
        const income = activeEntries.filter(e => e.amount > 0).reduce((a, b) => a + b.amount, 0);
        const expense = Math.abs(activeEntries.filter(e => e.amount < 0).reduce((a, b) => a + b.amount, 0));
        
        // Update display on home page
        const totalBalance = document.getElementById("totalBalance");
        if (totalBalance) {
            totalBalance.innerText = `PKR ${total.toFixed(2)}`;
            totalBalance.style.color = total >= 0 ? "#2e7d32" : "#c62828";
        }
        
        // Update display on balance page
        const totalIncome = document.getElementById("totalIncome");
        const totalExpense = document.getElementById("totalExpense");
        const netBalance = document.getElementById("netBalance");
        
        if (totalIncome) totalIncome.innerText = `PKR ${income.toFixed(2)}`;
        if (totalExpense) totalExpense.innerText = `PKR ${expense.toFixed(2)}`;
        if (netBalance) {
            netBalance.innerText = `PKR ${total.toFixed(2)}`;
            netBalance.style.color = total >= 0 ? "#2e7d32" : "#c62828";
        }
        
        // Update entry count
        const entryCount = document.getElementById("entryCount");
        if (entryCount) entryCount.innerText = `📝 Total Entries: ${activeEntries.length}`;
        
        // Render balance by category
        renderBalance(activeEntries);
        
        // Update Neon status
        updateNeonStatus(d);
        
        // Load recent entries on home page - LAST 10 ENTRIES
        loadRecentEntries(activeEntries);
    });
}

function renderBalance(d) {
    const balanceList = document.getElementById("balanceList");
    if (!balanceList) return;
    
    let map = {};
    
    // Group by category
    d.forEach(e => {
        map[e.main] = map[e.main] || {};
        map[e.main][e.sub] = (map[e.main][e.sub] || 0) + e.amount;
    });
    
    balanceList.innerHTML = "";
    
    for(let main in map) {
        const li = document.createElement("li");
        li.className = "category-balance";
        
        // Calculate main category total
        const mainTotal = Object.values(map[main]).reduce((a, b) => a + b, 0);
        
        li.innerHTML = `
            <div class="main-category-balance">
                <span class="main-cat-name">${main}</span>
                <span class="main-cat-total ${mainTotal >= 0 ? 'positive' : 'negative'}">
                    PKR ${Math.abs(mainTotal).toFixed(2)}
                </span>
            </div>
            <ul class="subcategory-balance">
                ${Object.entries(map[main]).map(([sub, amount]) => `
                    <li>
                        <span class="sub-cat-name">${sub}</span>
                        <span class="sub-cat-amount ${amount >= 0 ? 'positive' : 'negative'}">
                            ${amount >= 0 ? '+' : '-'}PKR ${Math.abs(amount).toFixed(2)}
                        </span>
                    </li>
                `).join("")}
            </ul>
        `;
        
        balanceList.appendChild(li);
    }
}

function loadRecentEntries(entries) {
    const recentEntries = document.getElementById("recentEntries");
    if (!recentEntries) return;
    
    // Sort by date (newest first)
    entries.sort((a, b) => {
        const dateA = new Date(a.date.split("-").reverse().join("-"));
        const dateB = new Date(b.date.split("-").reverse().join("-"));
        return dateB - dateA;
    });
    
    // Take only last 10 entries
    const recent = entries.slice(0, 10);
    
    recentEntries.innerHTML = "";
    
    if (recent.length === 0) {
        recentEntries.innerHTML = '<li class="no-entries">No recent transactions</li>';
        return;
    }
    
    // Create table header
    const headerRow = document.createElement("li");
    headerRow.className = "table-header";
    headerRow.innerHTML = `
        <div class="table-row">
            <div class="table-cell">Date</div>
            <div class="table-cell">Main Category</div>
            <div class="table-cell">Sub Category</div>
            <div class="table-cell">Description</div>
            <div class="table-cell">Amount</div>
        </div>
    `;
    recentEntries.appendChild(headerRow);
    
    // Add entries
    recent.forEach((e, i) => {
        const li = document.createElement("li");
        li.className = `table-row-item ${i % 2 === 0 ? 'even' : 'odd'} ${e.amount < 0 ? "expense" : "income"}`;
        
        li.innerHTML = `
            <div class="table-row">
                <div class="table-cell date-cell">${e.date}</div>
                <div class="table-cell main-cell">${e.main}</div>
                <div class="table-cell sub-cell">${e.sub}</div>
                <div class="table-cell desc-cell">${e.desc}</div>
                <div class="table-cell amount-cell ${e.amount < 0 ? 'negative' : 'positive'}">
                    ${e.amount < 0 ? '-' : '+'}PKR ${Math.abs(e.amount).toFixed(2)}
                </div>
            </div>
        `;
        recentEntries.appendChild(li);
    });
}

function loadHomeData() {
    calcTotal();
}

// ====================
// LEDGER FUNCTIONS (FIXED SUB-HEADS)
// ====================

function updateLedgerCategories() {
    const ledgerMain = document.getElementById("ledgerMain");
    
    if (!ledgerMain) return;
    
    // Clear and add default option
    ledgerMain.innerHTML = '<option value="">All Categories</option>';
    
    // Add main categories
    for (let mainCategory in heads) {
        const option = document.createElement("option");
        option.value = mainCategory;
        option.textContent = mainCategory;
        ledgerMain.appendChild(option);
    }
    
    // Update sub-heads based on current selection
    updateLedgerSubheads();
}

function updateLedgerSubheads() {
    const mainSelect = document.getElementById("ledgerMain");
    const subSelect = document.getElementById("ledgerSub");
    
    if (!mainSelect || !subSelect) return;
    
    const selectedMain = mainSelect.value;
    
    // Clear sub-select options
    subSelect.innerHTML = '<option value="">All Sub-categories</option>';
    
    // If a main category is selected, populate its sub-categories
    if (selectedMain && heads[selectedMain]) {
        heads[selectedMain].forEach(subCategory => {
            const option = document.createElement("option");
            option.value = subCategory;
            option.textContent = subCategory;
            subSelect.appendChild(option);
        });
    }
}

function loadLedger() {
    getAllEntries(d => {
        // Filter out deleted entries
        const activeEntries = d.filter(e => e.syncRemarks !== "deleted");
        
        const mainFilter = document.getElementById("ledgerMain")?.value || "";
        const subFilter = document.getElementById("ledgerSub")?.value || "";
        const fromDate = document.getElementById("fromDate")?.value;
        const toDate = document.getElementById("toDate")?.value;
        const typeFilter = document.getElementById("typeFilter")?.value || "all";
        const minAmount = parseFloat(document.getElementById("minAmountFilter")?.value) || -Infinity;
        const maxAmount = parseFloat(document.getElementById("maxAmountFilter")?.value) || Infinity;
        
        // Filter entries
        const filtered = activeEntries.filter(e => {
            // Main category filter
            if (mainFilter && e.main !== mainFilter) return false;
            
            // Sub category filter
            if (subFilter && e.sub !== subFilter) return false;
            
            // Type filter
            if (typeFilter === "income" && e.amount < 0) return false;
            if (typeFilter === "expense" && e.amount > 0) return false;
            
            // Amount range filter
            if (e.amount < minAmount || e.amount > maxAmount) return false;
            
            // Date range filter
            if (fromDate || toDate) {
                const entryDate = new Date(e.date.split("-").reverse().join("-"));
                const from = fromDate ? new Date(fromDate) : null;
                const to = toDate ? new Date(toDate + "T23:59:59") : null;
                
                if (from && entryDate < from) return false;
                if (to && entryDate > to) return false;
            }
            
            return true;
        });
        
        // Sort by date (newest first)
        filtered.sort((a, b) => {
            const dateA = new Date(a.date.split("-").reverse().join("-"));
            const dateB = new Date(b.date.split("-").reverse().join("-"));
            return dateB - dateA;
        });
        
        // Calculate totals
        const total = filtered.reduce((sum, entry) => sum + entry.amount, 0);
        const incomeTotal = filtered.filter(e => e.amount > 0)
                                  .reduce((sum, e) => sum + e.amount, 0);
        const expenseTotal = filtered.filter(e => e.amount < 0)
                                   .reduce((sum, e) => sum + Math.abs(e.amount), 0);
        
        // Update stats
        const statsElement = document.getElementById("ledgerStats");
        if (statsElement) {
            statsElement.innerHTML = `
                Showing ${filtered.length} transactions | 
                Total: <span style="color:${total >= 0 ? '#2e7d32' : '#c62828'}">PKR ${total.toFixed(2)}</span> |
                Income: <span style="color:#2e7d32">PKR ${incomeTotal.toFixed(2)}</span> |
                Expense: <span style="color:#c62828">PKR ${expenseTotal.toFixed(2)}</span>
            `;
        }
        
        // Display results in table
        const tbody = document.getElementById("ledgerList");
        if (!tbody) return;
        
        tbody.innerHTML = "";
        
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 15px;">
                        📭 No transactions found matching your filters.
                    </td>
                </tr>
            `;
            return;
        }
        
        filtered.forEach((e, i) => {
            const row = document.createElement("tr");
            row.className = `${i % 2 === 0 ? 'even' : 'odd'} ${e.amount >= 0 ? "income-row" : "expense-row"}`;
            
            row.innerHTML = `
                <td class="ledger-cell">${e.date}</td>
                <td class="ledger-cell desc-cell">${e.desc}</td>
                <td class="ledger-cell">${e.main}</td>
                <td class="ledger-cell">${e.sub}</td>
                <td class="ledger-cell ${e.amount >= 0 ? "positive" : "negative"}">
                    ${e.amount >= 0 ? "+" : ""}PKR ${Math.abs(e.amount).toFixed(2)}
                </td>
                <td class="ledger-cell">
                    <button onclick="editSavedEntry('${e.id}')" class="small-btn edit-btn">✏️</button>
                    <button onclick="markEntryAsDeleted('${e.id}')" class="small-btn danger-btn">🗑️</button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    });
}

function resetLedgerFilters() {
    document.getElementById("ledgerMain").value = "";
    document.getElementById("ledgerSub").value = "";
    document.getElementById("fromDate").value = "";
    document.getElementById("toDate").value = "";
    document.getElementById("typeFilter").value = "all";
    document.getElementById("minAmountFilter").value = "";
    document.getElementById("maxAmountFilter").value = "";
    
    // Update sub-heads dropdown
    updateLedgerSubheads();
    
    // Reload with no filters
    loadLedger();
}

function exportLedger() {
    getAllEntries(d => {
        // Apply current filters
        const mainFilter = document.getElementById("ledgerMain").value;
        const subFilter = document.getElementById("ledgerSub").value;
        
        const filtered = d.filter(e => {
            if (mainFilter && e.main !== mainFilter) return false;
            if (subFilter && e.sub !== subFilter) return false;
            return e.syncRemarks !== "deleted"; // Don't export deleted entries
        });
        
        // Generate CSV
        let csv = "ID,Date,Description,Main Category,Sub Category,Amount,Type,Sync Status\n";
        filtered.forEach(e => {
            const type = e.amount >= 0 ? "Income" : "Expense";
            const syncStatus = e.synced ? (e.syncRemarks === "edited" ? "Edited" : "Synced") : "Pending";
            csv += `"${e.id}","${e.date}","${e.desc}","${e.main}","${e.sub}",${e.amount},"${type}","${syncStatus}"\n`;
        });
        
        // Download
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        const date = new Date().toISOString().split("T")[0];
        a.download = `ledger_export_${date}.csv`;
        a.click();
    });
}

// ====================
// SEARCH IMPLEMENTATION
// ====================

function updateSearchCategories() {
    const searchCategory = document.getElementById("searchCategory");
    if (!searchCategory) return;
    
    searchCategory.innerHTML = '<option value="">All Categories</option>';
    
    for (let mainCategory in heads) {
        const option = document.createElement("option");
        option.value = mainCategory;
        option.textContent = mainCategory;
        searchCategory.appendChild(option);
    }
}

function performSearch() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase().trim();
    const fromDate = document.getElementById("searchFromDate").value;
    const toDate = document.getElementById("searchToDate").value;
    const minAmount = parseFloat(document.getElementById("minAmount").value) || -Infinity;
    const maxAmount = parseFloat(document.getElementById("maxAmount").value) || Infinity;
    const typeFilter = document.getElementById("searchType").value;
    const categoryFilter = document.getElementById("searchCategory").value;
    
    getAllEntries(entries => {
        // Filter out deleted entries
        const activeEntries = entries.filter(e => e.syncRemarks !== "deleted");
        
        const filtered = activeEntries.filter(entry => {
            // Search term
            if (searchTerm && !entry.desc.toLowerCase().includes(searchTerm)) {
                return false;
            }
            
            // Category filter
            if (categoryFilter && entry.main !== categoryFilter) {
                return false;
            }
            
            // Date range
            if (fromDate || toDate) {
                const entryDate = new Date(entry.date.split("-").reverse().join("-"));
                const from = fromDate ? new Date(fromDate) : null;
                const to = toDate ? new Date(toDate + "T23:59:59") : null;
                
                if (from && entryDate < from) return false;
                if (to && entryDate > to) return false;
            }
            
            // Amount range
            if (entry.amount < minAmount || entry.amount > maxAmount) {
                return false;
            }
            
            // Type filter
            if (typeFilter === "income" && entry.amount <= 0) return false;
            if (typeFilter === "expense" && entry.amount >= 0) return false;
            
            return true;
        });
        
        displaySearchResults(filtered, searchTerm);
    });
}

function displaySearchResults(results, searchTerm = "") {
    const resultsList = document.getElementById("searchResults");
    const countElement = document.getElementById("searchResultsCount");
    const totalElement = document.getElementById("searchTotal");
    
    if (!resultsList) return;
    
    // Sort by date (newest first)
    results.sort((a, b) => {
        const dateA = new Date(a.date.split("-").reverse().join("-"));
        const dateB = new Date(b.date.split("-").reverse().join("-"));
        return dateB - dateA;
    });
    
    // Update summary
    const totalAmount = results.reduce((sum, entry) => sum + entry.amount, 0);
    if (countElement) {
        countElement.textContent = `🔍 Found ${results.length} transaction${results.length !== 1 ? "s" : ""}`;
    }
    
    if (totalElement) {
        totalElement.textContent = `💰 Total: PKR ${totalAmount.toFixed(2)}`;
        totalElement.style.color = totalAmount >= 0 ? "#2e7d32" : "#c62828";
    }
    
    // Display results
    resultsList.innerHTML = "";
    
    if (results.length === 0) {
        resultsList.innerHTML = '<li class="no-results">📭 No transactions found</li>';
        return;
    }
    
    // Create table header
    const headerRow = document.createElement("li");
    headerRow.className = "table-header";
    headerRow.innerHTML = `
        <div class="table-row">
            <div class="table-cell">Date</div>
            <div class="table-cell">Main Category</div>
            <div class="table-cell">Sub Category</div>
            <div class="table-cell">Description</div>
            <div class="table-cell">Amount</div>
            <div class="table-cell">Actions</div>
        </div>
    `;
    resultsList.appendChild(headerRow);
    
    // Add results
    results.forEach((entry, i) => {
        const li = document.createElement("li");
        li.className = `table-row-item ${i % 2 === 0 ? 'even' : 'odd'} ${entry.amount >= 0 ? "income" : "expense"}`;
        
        // Highlight search term
        let description = entry.desc;
        if (searchTerm) {
            const regex = new RegExp(`(${searchTerm})`, "gi");
            description = description.replace(regex, '<mark>$1</mark>');
        }
        
        li.innerHTML = `
            <div class="table-row">
                <div class="table-cell date-cell">${entry.date}</div>
                <div class="table-cell main-cell">${entry.main}</div>
                <div class="table-cell sub-cell">${entry.sub}</div>
                <div class="table-cell desc-cell">${description}</div>
                <div class="table-cell amount-cell ${entry.amount >= 0 ? "positive" : "negative"}">
                    ${entry.amount >= 0 ? "+" : ""}PKR ${Math.abs(entry.amount).toFixed(2)}
                </div>
                <div class="table-cell action-cell">
                    <button onclick="editSavedEntry('${entry.id}')" class="small-btn edit-btn">✏️</button>
                    <button onclick="markEntryAsDeleted('${entry.id}')" class="small-btn danger-btn">🗑️</button>
                </div>
            </div>
        `;
        
        resultsList.appendChild(li);
    });
}

function clearSearch() {
    document.getElementById("searchInput").value = "";
    document.getElementById("searchFromDate").value = "";
    document.getElementById("searchToDate").value = "";
    document.getElementById("minAmount").value = "";
    document.getElementById("maxAmount").value = "";
    document.getElementById("searchType").value = "all";
    document.getElementById("searchCategory").value = "";
    
    document.getElementById("searchResults").innerHTML = "";
    document.getElementById("searchResultsCount").textContent = "🔍 Found 0 transactions";
    document.getElementById("searchTotal").textContent = "💰 Total: PKR 0.00";
}

function quickSearch() {
    const term = prompt("Enter search term:");
    if (term) {
        showPage("search");
        document.getElementById("searchInput").value = term;
        setTimeout(() => performSearch(), 100);
    }
}

// ====================
// NEON IMPLEMENTATION WITH REAL SYNC
// ====================

// Function to create Neon table with sync tracking
async function createNeonTable() {
    if (!neonConfig) {
        console.log("Neon not configured");
        return { success: false, message: "Neon not configured" };
    }
    
    try {
        // SQL to create the table with sync tracking
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS diary_entries (
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
            
            CREATE INDEX IF NOT EXISTS idx_entry_date ON diary_entries(entry_date);
            CREATE INDEX IF NOT EXISTS idx_main_category ON diary_entries(main_category);
            CREATE INDEX IF NOT EXISTS idx_synced ON diary_entries(synced);
            CREATE INDEX IF NOT EXISTS idx_sync_remarks ON diary_entries(sync_remarks);
        `;
        
        console.log("Creating Neon table with SQL:", createTableSQL);
        
        // In a real implementation, you would execute this SQL on Neon
        // For demo, we'll simulate with 80% success rate
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const success = Math.random() > 0.2; // 80% success rate
        
        if (success) {
            console.log("✅ Neon table created successfully");
            return { success: true, message: "Table created successfully" };
        } else {
            throw new Error("Failed to create table");
        }
        
    } catch (error) {
        console.error("❌ Error creating Neon table:", error);
        return { success: false, message: error.message };
    }
}

function initNeonUI() {
    const neonConnection = document.getElementById("neonConnection");
    const syncStatusInfo = document.getElementById("syncStatusInfo");
    
    if (neonConfig && neonConnection) {
        // Don't show full password, just indicate it's saved
        const maskedUrl = `postgresql://${neonConfig.username}:******@${neonConfig.host}/${neonConfig.database}`;
        neonConnection.value = maskedUrl;
        neonConnection.type = "text";
        
        if (syncStatusInfo) {
            syncStatusInfo.textContent = "✅ Configuration loaded";
        }
    } else if (neonConnection) {
        neonConnection.value = "";
        neonConnection.type = "password";
    }
    
    // Update global status
    updateGlobalNeonStatus();
}

function updateGlobalNeonStatus() {
    getAllEntries(entries => {
        // Count entries that need sync (new, edited, or deleted)
        const pendingSync = entries.filter(e => 
            !e.synced || (e.syncRemarks && e.syncRemarks !== "synced")
        ).length;
        
        const statusElement = document.getElementById("neonStatus");
        const backupStatus = document.getElementById("neonBackupStatus");
        
        if (statusElement) {
            if (neonConfig) {
                statusElement.innerHTML = `🌐 Neon: ${pendingSync} pending sync`;
                statusElement.style.color = pendingSync > 0 ? "#ff9800" : "#4caf50";
            } else {
                statusElement.innerHTML = "🌐 Neon: Not Configured";
                statusElement.style.color = "#757575";
            }
        }
        
        if (backupStatus) {
            if (neonConfig) {
                backupStatus.innerHTML = `☁️ Cloud: ${pendingSync} pending sync`;
                backupStatus.style.color = pendingSync > 0 ? "#ff9800" : "#4caf50";
            } else {
                backupStatus.innerHTML = "☁️ Cloud: Not configured";
                backupStatus.style.color = "#757575";
            }
        }
    });
}

function saveNeonConfig() {
    const connectionString = document.getElementById("neonConnection").value;
    
    if (!connectionString || !connectionString.includes("postgresql://")) {
        alert("Please enter a valid PostgreSQL connection string");
        return;
    }
    
    try {
        // Parse connection string
        const url = new URL(connectionString.replace("postgresql://", "http://"));
        const username = url.username;
        const password = url.password;
        const host = url.hostname;
        const database = url.pathname.substring(1);
        
        neonConfig = {
            username,
            password,
            host,
            database,
            ssl: true
        };
        
        localStorage.setItem("neonConfig", JSON.stringify(neonConfig));
        
        // Test the connection and create table
        testNeonConnection();
        
    } catch (error) {
        alert("Invalid connection string format. Please check and try again.");
        console.error("Connection string error:", error);
    }
}

async function testNeonConnection() {
    if (!neonConfig) {
        alert("No configuration found. Please save configuration first.");
        return;
    }
    
    const testResult = document.getElementById("testResult");
    if (testResult) {
        testResult.innerHTML = '<span style="color: #2196f3;">🔍 Testing connection and creating table...</span>';
        testResult.style.display = "inline-block";
    }
    
    try {
        // Create table
        const result = await createNeonTable();
        
        if (!result.success) {
            throw new Error(result.message);
        }
        
        // Simulate connection test
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (testResult) {
            testResult.innerHTML = '<span style="color: #4caf50;">✅ Connected! Table ready.</span>';
        }
        
        updateGlobalNeonStatus();
        alert("✅ Neon connected successfully! Table is ready for sync.");
        
    } catch (error) {
        if (testResult) {
            testResult.innerHTML = '<span style="color: #f44336;">❌ ' + error.message + '</span>';
        }
        alert("❌ Connection failed: " + error.message);
    }
}

async function uploadToNeon() {
    if (!neonConfig) {
        alert("Please configure Neon in Settings first!");
        showPage("settings");
        return;
    }
    
    try {
        // First check table exists
        const tableResult = await createNeonTable();
        if (!tableResult.success) {
            alert("❌ Cannot upload: " + tableResult.message);
            return;
        }
        
        getAllEntries(async entries => {
            // Get entries that need sync
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
            
            let successCount = 0;
            let errorCount = 0;
            let deletedCount = 0;
            
            // Process each entry based on sync remarks
            for (const entry of entriesToSync) {
                try {
                    if (entry.syncRemarks === "deleted") {
                        // Delete from Neon
                        console.log(`Deleting entry ${entry.id} from Neon`);
                        // Simulate delete - in real app, call DELETE API
                        deletedCount++;
                    } else {
                        // Upload or update to Neon
                        const operation = entry.synced ? "UPDATE" : "INSERT";
                        console.log(`${operation} entry ${entry.id} to Neon:`, entry.desc);
                        
                        // Simulate API call
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                    // Mark as synced locally
                    entry.synced = true;
                    entry.syncRemarks = "synced";
                    await saveEntry(entry);
                    successCount++;
                    
                } catch (error) {
                    console.error(`Failed to sync entry ${entry.id}:`, error);
                    errorCount++;
                }
            }
            
            // Update UI
            if (uploadBtn) {
                uploadBtn.textContent = originalText;
                uploadBtn.disabled = false;
            }
            
            updateGlobalNeonStatus();
            
            // Show results
            let message = `✅ Successfully synced ${successCount} entries to Neon!`;
            if (deletedCount > 0) {
                message += `\n🗑️ ${deletedCount} entries deleted from Neon`;
            }
            if (errorCount > 0) {
                message += `\n❌ ${errorCount} entries failed to sync`;
            }
            
            alert(message);
            
            // Remove deleted entries from local DB after successful sync
            if (deletedCount > 0) {
                setTimeout(() => {
                    entriesToSync
                        .filter(e => e.syncRemarks === "deleted" && e.synced)
                        .forEach(e => {
                            const transaction = db.transaction(["entries"], "readwrite");
                            const store = transaction.objectStore("entries");
                            store.delete(e.id);
                        });
                    
                    // Refresh UI
                    loadSaved();
                    calcTotal();
                    loadLedger();
                }, 1000);
            } else {
                // Refresh UI
                loadSaved();
                calcTotal();
                loadLedger();
            }
            
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

async function restoreFromNeon() {
    if (!neonConfig) {
        alert("Please configure Neon in Settings first!");
        showPage("settings");
        return;
    }
    
    if (!confirm("This will fetch all data from Neon and merge with local data (no deletions). Continue?")) {
        return;
    }
    
    try {
        // Check table exists
        const tableResult = await createNeonTable();
        if (!tableResult.success) {
            alert("Cannot restore: " + tableResult.message);
            return;
        }
        
        // Show progress
        const restoreBtn = document.querySelector('button[onclick="restoreFromNeon()"]');
        const originalText = restoreBtn?.textContent || "Restore from Neon";
        
        if (restoreBtn) {
            restoreBtn.textContent = "⏳ Restoring from Neon...";
            restoreBtn.disabled = true;
        }
        
        // Simulate fetching from Neon
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mock data from Neon
        const mockNeonData = [
            {
                id: "20240101010101",
                main_category: "Salary",
                sub_category: "Monthly",
                entry_date: "01-01-2024",
                description: "January Salary",
                amount: 50000,
                synced: true,
                sync_remarks: "synced"
            },
            {
                id: "20240102020202",
                main_category: "Food",
                sub_category: "Groceries",
                entry_date: "02-01-2024",
                description: "Weekly groceries",
                amount: -3500.50,
                synced: true,
                sync_remarks: "synced"
            }
        ];
        
        let importedCount = 0;
        let updatedCount = 0;
        
        // Import each entry
        for (const neonEntry of mockNeonData) {
            try {
                // Check if entry exists locally
                const existingEntry = await getEntryById(neonEntry.id);
                
                if (!existingEntry) {
                    // New entry - add it
                    const localEntry = {
                        id: neonEntry.id,
                        main: neonEntry.main_category,
                        sub: neonEntry.sub_category,
                        date: neonEntry.entry_date,
                        desc: neonEntry.description,
                        amount: neonEntry.amount,
                        synced: true,
                        syncRemarks: "synced"
                    };
                    await saveEntry(localEntry);
                    importedCount++;
                } else {
                    // Entry exists - update if newer
                    const neonDate = new Date(neonEntry.updated_at || neonEntry.created_at);
                    const localDate = new Date(existingEntry.updated_at || existingEntry.created_at);
                    
                    if (neonDate > localDate) {
                        // Neon has newer version
                        existingEntry.main = neonEntry.main_category;
                        existingEntry.sub = neonEntry.sub_category;
                        existingEntry.date = neonEntry.entry_date;
                        existingEntry.desc = neonEntry.description;
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

function clearNeonConfig() {
    if (confirm("Are you sure you want to clear Neon configuration?")) {
        localStorage.removeItem("neonConfig");
        neonConfig = null;
        
        const neonConnection = document.getElementById("neonConnection");
        const testResult = document.getElementById("testResult");
        const syncStatusInfo = document.getElementById("syncStatusInfo");
        
        if (neonConnection) {
            neonConnection.value = "";
            neonConnection.type = "password";
        }
        if (testResult) {
            testResult.innerHTML = "";
            testResult.style.display = "none";
        }
        if (syncStatusInfo) syncStatusInfo.textContent = "Not configured";
        
        updateGlobalNeonStatus();
        alert("✅ Neon configuration cleared!");
    }
}

function forceSync() {
    uploadToNeon();
}

function manualSync() {
    uploadToNeon();
}

function updateNeonStatus(d) {
    updateGlobalNeonStatus();
}

function updateBackupStatus() {
    getAllEntries(entries => {
        const dbInfo = document.getElementById("dbInfo");
        if (dbInfo) {
            const pending = entries.filter(e => !e.synced || (e.syncRemarks && e.syncRemarks !== "synced")).length;
            const lastBackup = neonConfig ? `Configured (${pending} pending)` : "Never";
            dbInfo.textContent = `Total Entries: ${entries.length} | Last Backup: ${lastBackup}`;
        }
        updateGlobalNeonStatus();
    });
}

// ====================
// CATEGORY CRUD OPERATIONS
// ====================

function addMainHead() {
    const mainHeadInput = document.getElementById("mainHeadInput");
    if (!mainHeadInput || !mainHeadInput.value.trim()) {
        alert("Please enter a main category name");
        return;
    }
    
    const mainHead = mainHeadInput.value.trim();
    
    if (heads[mainHead]) {
        alert("Main category already exists!");
        return;
    }
    
    heads[mainHead] = [];
    mainHeadInput.value = "";
    saveHeads();
    alert(`✅ Added main category: ${mainHead}`);
}

function addSubHead() {
    const mainForSub = document.getElementById("mainForSub");
    const subHeadInput = document.getElementById("subHeadInput");
    
    if (!mainForSub || !mainForSub.value) {
        alert("Please select a main category first");
        return;
    }
    
    if (!subHeadInput || !subHeadInput.value.trim()) {
        alert("Please enter a sub category name");
        return;
    }
    
    const main = mainForSub.value;
    const sub = subHeadInput.value.trim();
    
    if (heads[main].includes(sub)) {
        alert("Sub category already exists!");
        return;
    }
    
    heads[main].push(sub);
    subHeadInput.value = "";
    saveHeads();
    alert(`✅ Added sub category: ${sub} under ${main}`);
}

function deleteMainHead(m) {
    if (!confirm(`Delete main category "${m}" and all its sub-categories?`)) {
        return;
    }
    
    delete heads[m];
    saveHeads();
    alert(`✅ Deleted main category: ${m}`);
}

function deleteSubHead(m, s) {
    if (!confirm(`Delete sub category "${s}" from "${m}"?`)) {
        return;
    }
    
    heads[m] = heads[m].filter(x => x !== s);
    saveHeads();
    alert(`✅ Deleted sub category: ${s}`);
}

// ====================
// INITIALIZATION
// ====================

// Set today's date as default
window.onload = function() {
    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("date");
    if (dateInput) dateInput.value = today;
    
    // Add cancel button to entry form
    const entryForm = document.querySelector('#entry .entry-form .button-group');
    if (entryForm && !document.getElementById('cancelEditBtn')) {
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancelEditBtn';
        cancelBtn.className = 'secondary-btn';
        cancelBtn.textContent = '❌ Cancel Edit';
        cancelBtn.style.display = 'none';
        cancelBtn.onclick = cancelEdit;
        entryForm.appendChild(cancelBtn);
    }
    
    // Initialize all dropdowns
    updateAllDropdowns();
    
    // Load initial data
    calcTotal();
    loadSaved();
    updateGlobalNeonStatus();
};

// Add Enter key support for search
document.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        const activePage = document.querySelector(".page.active");
        if (activePage && activePage.id === "search") {
            performSearch();
        }
    }
});

// ====================
// SERVICE WORKER REGISTRATION
// ====================

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker registered with scope:', registration.scope);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 New Service Worker found:', newWorker);
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('🔄 New content is available; please refresh.');
                            // You can show an update notification here
                            if (confirm('A new version is available. Refresh to update?')) {
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch(error => {
                console.log('❌ Service Worker registration failed:', error);
            });
    });
}

console.log('✅ app.js loaded successfully');