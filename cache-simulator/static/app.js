// Advanced Cache Memory Simulator Pro - JavaScript
const API_BASE = '/api/v1';

// Global State
let state = {
    accessHistory: [],
    hitHistory: [],
    missHistory: [],
    isWrite: false,
    currentTab: 'simulator',
    cacheView: 'grid',
    animationSpeed: 500,
    charts: {}
};

// Initialize on page load
window.addEventListener('load', function() {
    initCharts();
    updateStats();
    updateAssocLabel(document.getElementById('associativity').value);
    document.getElementById('animSpeed').addEventListener('input', function(e) {
        state.animationSpeed = parseInt(e.target.value);
        document.getElementById('speedLabel').textContent = e.target.value + 'ms';
    });
});

// Tab Switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');
    state.currentTab = tabName;
    
    if (tabName === 'analytics') updateAnalytics();
    if (tabName === 'heatmap') refreshHeatmap();
    if (tabName === 'prediction') getPrediction();
}

// Initialize Charts
function initCharts() {
    // Pie Chart
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    state.charts.pie = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: ['Hits', 'Misses'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } }
            }
        }
    });

    // Line Chart
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    state.charts.line = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Hits',
                data: [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Misses',
                data: [],
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });

    // Miss Type Chart
    const missTypeCtx = document.getElementById('missTypeChart').getContext('2d');
    state.charts.missType = new Chart(missTypeCtx, {
        type: 'bar',
        data: {
            labels: ['Compulsory', 'Capacity', 'Conflict'],
            datasets: [{
                label: 'Miss Count',
                data: [0, 0, 0],
                backgroundColor: ['#3b82f6', '#f59e0b', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });

    // Performance Chart
    const perfCtx = document.getElementById('performanceChart').getContext('2d');
    state.charts.performance = new Chart(perfCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Hit Ratio %',
                data: [],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                fill: true,
                yAxisID: 'y'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
            scales: {
                y: { beginAtZero: true, max: 100, position: 'left', title: { display: true, text: 'Hit Ratio %' } }
            }
        }
    });
}

// Configuration Functions
function updateAssocLabel(value) {
    document.getElementById('assocLabel').textContent = value + '-way';
}

document.getElementById('mappingType').addEventListener('change', function() {
    const associativityGroup = document.getElementById('associativityGroup');
    associativityGroup.style.display = this.value === 'set_associative' ? 'block' : 'none';
});

async function configureCache() {
    const mappingType = document.getElementById('mappingType').value;
    const replacementPolicy = document.getElementById('replacementPolicy').value;
    const writePolicy = document.getElementById('writePolicy').value;
    const cacheSize = parseInt(document.getElementById('cacheSize').value);
    const blockSize = parseInt(document.getElementById('blockSize').value);
    const associativity = parseInt(document.getElementById('associativity').value);

    try {
        const response = await fetch(`${API_BASE}/configure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mapping_type: mappingType,
                replacement_policy: replacementPolicy,
                write_policy: writePolicy,
                cache_size: cacheSize,
                block_size: blockSize,
                associativity: associativity
            })
        });

        const data = await response.json();
        if (response.ok) {
            showNotification('✅ Cache configured successfully!', 'success');
            updateStats();
        } else {
            showNotification('❌ Error: ' + data.detail, 'error');
        }
    } catch (error) {
        showNotification('❌ Network error: ' + error.message, 'error');
    }
}

function quickConfig(size) {
    const configs = {
        small: { cache: 64, block: 4, assoc: 2 },
        medium: { cache: 128, block: 8, assoc: 4 },
        large: { cache: 256, block: 16, assoc: 8 }
    };
    const config = configs[size];
    document.getElementById('cacheSize').value = config.cache;
    document.getElementById('blockSize').value = config.block;
    document.getElementById('associativity').value = config.assoc;
    updateAssocLabel(config.assoc);
    configureCache();
}

function exportConfig() {
    const config = {
        mappingType: document.getElementById('mappingType').value,
        replacementPolicy: document.getElementById('replacementPolicy').value,
        writePolicy: document.getElementById('writePolicy').value,
        cacheSize: document.getElementById('cacheSize').value,
        blockSize: document.getElementById('blockSize').value,
        associativity: document.getElementById('associativity').value
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cache-config.json';
    a.click();
    showNotification('💾 Configuration exported!', 'success');
}

// Access Type Control
function setAccessType(type) {
    state.isWrite = (type === 'write');
    document.getElementById('readBtn').classList.toggle('active', type === 'read');
    document.getElementById('writeBtn').classList.toggle('active', type === 'write');
}

function hexToDecimal() {
    const hex = document.getElementById('hexAddress').value;
    if (hex.startsWith('0x') || hex.startsWith('0X')) {
        const decimal = parseInt(hex, 16);
        if (!isNaN(decimal)) {
            document.getElementById('address').value = decimal;
        }
    }
}

// Simulation Functions
async function simulateStep() {
    const address = parseInt(document.getElementById('address').value);

    try {
        const response = await fetch(`${API_BASE}/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: address, is_write: state.isWrite })
        });

        const data = await response.json();
        if (response.ok) {
            addToHistory(data);
            displayResult(data);
            updateStats();
            animateAccess(data);
        } else {
            showNotification('❌ Error: ' + data.detail, 'error');
        }
    } catch (error) {
        showNotification('❌ Network error: ' + error.message, 'error');
    }
}

async function simulateBatch() {
    const batchInput = document.getElementById('batchAddresses').value;
    const addresses = batchInput.split(',').map(addr => parseInt(addr.trim())).filter(addr => !isNaN(addr));

    if (addresses.length === 0) {
        showNotification('⚠️ Please enter valid addresses', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresses: addresses, is_write: state.isWrite })
        });

        const data = await response.json();
        if (response.ok) {
            data.results.forEach(result => addToHistory(result));
            showNotification(`✅ Batch completed: ${data.count} addresses processed`, 'success');
            updateStats();
        } else {
            showNotification('❌ Error: ' + data.detail, 'error');
        }
    } catch (error) {
        showNotification('❌ Network error: ' + error.message, 'error');
    }
}

async function simulateBatchSlow() {
    const batchInput = document.getElementById('batchAddresses').value;
    const addresses = batchInput.split(',').map(addr => parseInt(addr.trim())).filter(addr => !isNaN(addr));

    if (addresses.length === 0) {
        showNotification('⚠️ Please enter valid addresses', 'error');
        return;
    }

    for (let i = 0; i < addresses.length; i++) {
        document.getElementById('address').value = addresses[i];
        await simulateStep();
        await sleep(state.animationSpeed);
    }
    showNotification(`✅ Step-by-step completed: ${addresses.length} addresses`, 'success');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Pattern Generation
function generateRandomPattern() {
    const addresses = [];
    for (let i = 0; i < 20; i++) {
        addresses.push(Math.floor(Math.random() * 256));
    }
    document.getElementById('batchAddresses').value = addresses.join(',');
    showNotification('🎲 Random pattern generated!', 'success');
}

function generateSequentialPattern() {
    const addresses = [];
    for (let i = 0; i < 20; i++) {
        addresses.push(i * 8);
    }
    document.getElementById('batchAddresses').value = addresses.join(',');
    showNotification('📈 Sequential pattern generated!', 'success');
}

function generateLoopPattern() {
    const base = [0, 8, 16, 24, 32];
    const addresses = [...base, ...base, ...base, ...base];
    document.getElementById('batchAddresses').value = addresses.join(',');
    showNotification('🔄 Loop pattern generated!', 'success');
}

async function resetCache() {
    if (!confirm('Are you sure you want to reset the cache? All history will be cleared.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/reset`, { method: 'POST' });
        const data = await response.json();
        if (response.ok) {
            state.accessHistory = [];
            state.hitHistory = [];
            state.missHistory = [];
            document.getElementById('result').innerHTML = '<p class="empty-state">No access performed yet. Start simulating!</p>';
            document.getElementById('historyBody').innerHTML = '<tr><td colspan="9" class="empty-state">No access history yet</td></tr>';
            showNotification('🔄 Cache reset successfully!', 'success');
            updateStats();
        } else {
            showNotification('❌ Error: ' + data.detail, 'error');
        }
    } catch (error) {
        showNotification('❌ Network error: ' + error.message, 'error');
    }
}

// Stats Update
async function updateStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const data = await response.json();
        
        if (response.ok) {
            // Update stat cards
            document.getElementById('totalAccesses').textContent = data.total_accesses;
            document.getElementById('hits').textContent = data.hits;
            document.getElementById('misses').textContent = data.misses;
            document.getElementById('hitRatio').textContent = (data.hit_ratio * 100).toFixed(2) + '%';
            document.getElementById('evictions').textContent = data.evictions || 0;
            document.getElementById('utilization').textContent = data.cache_utilization + '%';
            document.getElementById('amat').textContent = data.amat || 0;
            document.getElementById('power').textContent = data.power_consumption || 0;

            // Update header stats
            document.getElementById('liveHitRate').textContent = 'Hit Rate: ' + (data.hit_ratio * 100).toFixed(1) + '%';
            document.getElementById('liveAMAT').textContent = 'AMAT: ' + (data.amat || 0) + ' cycles';
            document.getElementById('livePower').textContent = 'Power: ' + (data.power_consumption || 0) + ' units';

            // Update progress bars
            const hitPercent = data.total_accesses > 0 ? (data.hits / data.total_accesses * 100) : 0;
            const missPercent = data.total_accesses > 0 ? (data.misses / data.total_accesses * 100) : 0;
            document.getElementById('hitProgress').style.width = hitPercent + '%';
            document.getElementById('missProgress').style.width = missPercent + '%';
            document.getElementById('utilProgress').style.width = data.cache_utilization + '%';

            // Performance badge
            const badge = document.getElementById('performanceBadge');
            if (data.hit_ratio >= 0.8) {
                badge.textContent = '🔥 Excellent';
                badge.style.background = 'rgba(16, 185, 129, 0.3)';
            } else if (data.hit_ratio >= 0.5) {
                badge.textContent = '👍 Good';
                badge.style.background = 'rgba(245, 158, 11, 0.3)';
            } else {
                badge.textContent = '⚠️ Poor';
                badge.style.background = 'rgba(239, 68, 68, 0.3)';
            }

            // Update charts
            state.charts.pie.data.datasets[0].data = [data.hits, data.misses];
            state.charts.pie.update();

            state.hitHistory.push(data.hits);
            state.missHistory.push(data.misses);
            if (state.hitHistory.length > 20) {
                state.hitHistory.shift();
                state.missHistory.shift();
            }
            state.charts.line.data.labels = Array.from({length: state.hitHistory.length}, (_, i) => i + 1);
            state.charts.line.data.datasets[0].data = state.hitHistory;
            state.charts.line.data.datasets[1].data = state.missHistory;
            state.charts.line.update();

            // Miss type chart
            state.charts.missType.data.datasets[0].data = [
                data.compulsory_misses || 0,
                data.capacity_misses || 0,
                data.conflict_misses || 0
            ];
            state.charts.missType.update();

            // Performance chart
            const hitRatioPercent = data.hit_ratio * 100;
            if (state.charts.performance.data.labels.length > 20) {
                state.charts.performance.data.labels.shift();
                state.charts.performance.data.datasets[0].data.shift();
            }
            state.charts.performance.data.labels.push(data.total_accesses);
            state.charts.performance.data.datasets[0].data.push(hitRatioPercent);
            state.charts.performance.update();

            displayCacheState(data.cache_state);
        }
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Display Functions
function addToHistory(result) {
    state.accessHistory.unshift(result);
    if (state.accessHistory.length > 100) state.accessHistory.pop();
    
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';
    
    state.accessHistory.slice(0, 50).forEach((item, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>0x${item.address.toString(16).toUpperCase().padStart(4, '0')}</td>
            <td>${item.is_write ? '✍️ Write' : '📖 Read'}</td>
            <td><span class="${item.hit ? 'hit' : 'miss'}">${item.hit ? '✓ HIT' : '✗ MISS'}</span></td>
            <td>${item.tag}</td>
            <td>${item.set_index !== null && item.set_index !== undefined ? item.set_index : 'N/A'}</td>
            <td>${item.block_offset}</td>
            <td>${item.access_time || 'N/A'} cycles</td>
            <td>${item.miss_type || 'N/A'}</td>
        `;
        row.style.animation = 'fadeIn 0.5s ease';
    });
}

function displayResult(result) {
    const resultDiv = document.getElementById('result');
    const hitClass = result.hit ? 'hit' : 'miss';
    const hitText = result.hit ? 'HIT ✓' : 'MISS ✗';
    const accessType = result.is_write ? '✍️ Write' : '📖 Read';
    
    let html = `<p class="${hitClass}">Result: ${hitText}</p>`;
    html += `<p><strong>Access Type:</strong> ${accessType}</p>`;
    html += `<p><strong>Address:</strong> ${result.address} (0x${result.address.toString(16).toUpperCase()})</p>`;
    html += `<p><strong>Tag:</strong> ${result.tag}</p>`;
    if (result.set_index !== null && result.set_index !== undefined) {
        html += `<p><strong>Set Index:</strong> ${result.set_index}</p>`;
    }
    html += `<p><strong>Block Offset:</strong> ${result.block_offset}</p>`;
    html += `<p><strong>Access Time:</strong> ${result.access_time || 'N/A'} cycles</p>`;
    if (!result.hit && result.miss_type) {
        html += `<p><strong>Miss Type:</strong> ${result.miss_type}</p>`;
    }
    if (result.eviction) {
        html += `<p style="color: #f59e0b;"><strong>⚠️ Eviction occurred (write-back needed)</strong></p>`;
    }
    
    resultDiv.innerHTML = html;
}

function displayCacheState(cacheState) {
    const gridDiv = document.getElementById('cacheGrid');
    
    if (!cacheState || cacheState.length === 0) {
        gridDiv.innerHTML = '<p style="grid-column: 1/-1;" class="empty-state">Cache is empty - Start simulating to see cache blocks</p>';
        return;
    }
    
    let html = '';
    cacheState.forEach(block => {
        const dirtyClass = block.dirty ? 'dirty' : '';
        const dirtyBadge = block.dirty ? '💾 Dirty' : '✨ Clean';
        html += `
            <div class="cache-block ${dirtyClass}">
                <p><strong>Set ${block.set}, Way ${block.way}</strong></p>
                <p>Tag: <strong>${block.tag}</strong></p>
                <p>Valid: <strong>${block.valid ? '✓ Yes' : '✗ No'}</strong></p>
                <p>Frequency: <strong>${block.frequency || 0}</strong></p>
                <p style="font-size: 0.8rem; color: #64748b;">${dirtyBadge}</p>
            </div>
        `;
    });
    
    gridDiv.innerHTML = html;
}

function animateAccess(result) {
    // Add visual feedback animation
    const resultDiv = document.getElementById('result');
    resultDiv.style.animation = 'none';
    setTimeout(() => {
        resultDiv.style.animation = 'pulse 0.5s ease';
    }, 10);
}

function setCacheView(view) {
    state.cacheView = view;
    document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
    document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
    // Implement list view if needed
}

// History Management
function clearHistory() {
    if (!confirm('Clear access history? (Cache state will be preserved)')) return;
    state.accessHistory = [];
    document.getElementById('historyBody').innerHTML = '<tr><td colspan="9" class="empty-state">No access history yet</td></tr>';
    showNotification('🗑️ History cleared!', 'success');
}

function exportHistory() {
    if (state.accessHistory.length === 0) {
        showNotification('⚠️ No history to export', 'error');
        return;
    }
    
    let csv = 'Index,Address,Type,Result,Tag,Set,Offset,Time,MissType\n';
    state.accessHistory.forEach((item, index) => {
        csv += `${index + 1},${item.address},${item.is_write ? 'Write' : 'Read'},${item.hit ? 'HIT' : 'MISS'},${item.tag},${item.set_index || 'N/A'},${item.block_offset},${item.access_time || 'N/A'},${item.miss_type || 'N/A'}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cache-history.csv';
    a.click();
    showNotification('📥 History exported!', 'success');
}

function filterHistory() {
    const searchTerm = document.getElementById('historySearch').value.toLowerCase();
    const rows = document.querySelectorAll('#historyBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Analytics Tab
async function updateAnalytics() {
    try {
        const response = await fetch(`${API_BASE}/analytics`);
        const data = await response.json();
        
        if (response.ok) {
            // Locality metrics
            const temporal = (data.locality.temporal * 100).toFixed(1);
            const spatial = (data.locality.spatial * 100).toFixed(1);
            document.getElementById('temporalValue').textContent = temporal + '%';
            document.getElementById('spatialValue').textContent = spatial + '%';
            document.getElementById('temporalBar').style.width = temporal + '%';
            document.getElementById('spatialBar').style.width = spatial + '%';

            // Miss classification
            document.getElementById('compulsoryMisses').textContent = data.miss_classification.compulsory;
            document.getElementById('capacityMisses').textContent = data.miss_classification.capacity;
            document.getElementById('conflictMisses').textContent = data.miss_classification.conflict;

            // Performance metrics
            document.getElementById('avgAccessTime').textContent = data.performance.avg_access_time + ' cycles';
            document.getElementById('memoryTraffic').textContent = data.resource_usage.memory_traffic_bytes + ' bytes';
            document.getElementById('powerConsumption').textContent = data.resource_usage.power_consumption + ' units';

            // Generate insights
            generateInsights(data);

            // Update analytics charts
            updateAnalyticsCharts(data);
        }
    } catch (error) {
        console.error('Error updating analytics:', error);
    }
}

function generateInsights(data) {
    const insights = [];
    
    if (data.locality.temporal < 0.3) {
        insights.push({
            type: 'warning',
            text: '⚠️ Low temporal locality detected. Consider using LRU replacement policy for better performance.'
        });
    }
    
    if (data.locality.spatial < 0.3) {
        insights.push({
            type: 'warning',
            text: '⚠️ Low spatial locality. Increasing block size might improve hit rate.'
        });
    }
    
    if (data.miss_classification.conflict > data.miss_classification.capacity) {
        insights.push({
            type: 'warning',
            text: '🔴 High conflict misses! Consider increasing associativity or using fully associative mapping.'
        });
    }
    
    if (data.performance.cache_utilization < 50) {
        insights.push({
            type: 'info',
            text: '💡 Cache utilization is low. You might be able to reduce cache size without performance loss.'
        });
    }
    
    if (data.locality.temporal > 0.7 && data.locality.spatial > 0.7) {
        insights.push({
            type: 'success',
            text: '🔥 Excellent locality! Your access pattern is well-suited for caching.'
        });
    }
    
    const insightsDiv = document.getElementById('insights');
    if (insights.length === 0) {
        insightsDiv.innerHTML = '<p class="empty-state">Run more simulations to get insights</p>';
    } else {
        insightsDiv.innerHTML = insights.map(insight => 
            `<div class="insight-item ${insight.type}">${insight.text}</div>`
        ).join('');
    }
}

function updateAnalyticsCharts(data) {
    // Miss breakdown chart
    if (!state.charts.missBreakdown) {
        const ctx = document.getElementById('missBreakdownChart').getContext('2d');
        state.charts.missBreakdown = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Compulsory', 'Capacity', 'Conflict'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#3b82f6', '#f59e0b', '#ef4444']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
    state.charts.missBreakdown.data.datasets[0].data = [
        data.miss_classification.compulsory,
        data.miss_classification.capacity,
        data.miss_classification.conflict
    ];
    state.charts.missBreakdown.update();

    // Write chart
    if (!state.charts.write) {
        const ctx = document.getElementById('writeChart').getContext('2d');
        state.charts.write = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Write Hits', 'Write Misses'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#10b981', '#ef4444']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
}

// Comparison Tab
async function runComparison() {
    const pattern = document.getElementById('comparisonPattern').value;
    const addresses = pattern.split(',').map(addr => parseInt(addr.trim())).filter(addr => !isNaN(addr));
    
    if (addresses.length === 0) {
        showNotification('⚠️ Please enter valid addresses', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(addresses)
        });

        const data = await response.json();
        if (response.ok) {
            displayComparison(data.comparison);
            showNotification('✅ Comparison completed!', 'success');
        } else {
            showNotification('❌ Error: ' + data.detail, 'error');
        }
    } catch (error) {
        showNotification('❌ Network error: ' + error.message, 'error');
    }
}

function displayComparison(comparison) {
    const resultsDiv = document.getElementById('comparisonResults');
    let html = '';
    
    Object.entries(comparison).forEach(([policy, metrics]) => {
        html += `
            <div class="comparison-card">
                <h3>${policy.toUpperCase()}</h3>
                <div class="comparison-metric">
                    <span>Hit Ratio:</span>
                    <strong>${(metrics.hit_ratio * 100).toFixed(2)}%</strong>
                </div>
                <div class="comparison-metric">
                    <span>Misses:</span>
                    <strong>${metrics.misses}</strong>
                </div>
                <div class="comparison-metric">
                    <span>AMAT:</span>
                    <strong>${metrics.amat} cycles</strong>
                </div>
            </div>
        `;
    });
    
    resultsDiv.innerHTML = html;
}

// Heatmap Tab
async function refreshHeatmap() {
    try {
        const response = await fetch(`${API_BASE}/heatmap`);
        const data = await response.json();
        
        if (response.ok) {
            displayHeatmap(data);
        }
    } catch (error) {
        console.error('Error refreshing heatmap:', error);
    }
}

function displayHeatmap(data) {
    const gridDiv = document.getElementById('heatmapGrid');
    const metric = document.getElementById('heatmapMetric').value;
    
    if (!data.heatmap || Object.keys(data.heatmap).length === 0) {
        gridDiv.innerHTML = '<p class="empty-state">No cache data available</p>';
        return;
    }
    
    let html = '';
    const maxFreq = Math.max(...Object.values(data.heatmap).map(b => b.frequency || 0), 1);
    
    for (let set = 0; set < data.num_sets; set++) {
        for (let way = 0; way < data.associativity; way++) {
            const key = `set${set}_way${way}`;
            const block = data.heatmap[key];
            
            if (block) {
                const intensity = metric === 'frequency' ? (block.frequency / maxFreq) : (block.dirty ? 1 : 0);
                const color = getHeatColor(intensity);
                html += `
                    <div class="heatmap-cell" style="background: ${color};" title="Set ${set}, Way ${way}: Freq ${block.frequency}">
                        <div>S${set}W${way}</div>
                        <div style="font-size: 0.7rem;">${block.frequency}</div>
                    </div>
                `;
            } else {
                html += `
                    <div class="heatmap-cell" style="background: #e2e8f0; color: #64748b;" title="Set ${set}, Way ${way}: Empty">
                        <div>S${set}W${way}</div>
                        <div style="font-size: 0.7rem;">0</div>
                    </div>
                `;
            }
        }
    }
    
    gridDiv.innerHTML = html;
}

function getHeatColor(intensity) {
    const r = Math.floor(59 + (239 - 59) * intensity);
    const g = Math.floor(130 - 62 * intensity);
    const b = Math.floor(246 - 178 * intensity);
    return `rgb(${r}, ${g}, ${b})`;
}

// Prediction Tab
async function getPrediction() {
    try {
        const response = await fetch(`${API_BASE}/prediction`);
        const data = await response.json();
        
        if (response.ok) {
            displayPrediction(data);
        }
    } catch (error) {
        console.error('Error getting prediction:', error);
    }
}

function displayPrediction(data) {
    const predictedDiv = document.getElementById('predictedAddress');
    const confidenceDiv = document.getElementById('predictionConfidence');
    const patternDiv = document.getElementById('recentPattern');
    
    if (data.predicted_address !== null) {
        predictedDiv.textContent = `0x${data.predicted_address.toString(16).toUpperCase()} (${data.predicted_address})`;
        confidenceDiv.textContent = `${data.confidence.toUpperCase()} Confidence`;
        confidenceDiv.style.background = data.confidence === 'high' ? '#10b981' : '#f59e0b';
    } else {
        predictedDiv.textContent = 'Not enough data';
        confidenceDiv.textContent = 'LOW Confidence';
        confidenceDiv.style.background = '#64748b';
    }
    
    // Display recent pattern
    if (data.recent_pattern && data.recent_pattern.length > 0) {
        patternDiv.innerHTML = data.recent_pattern.map(item => 
            `<div class="pattern-item">${item.address}</div>`
        ).join('');
    } else {
        patternDiv.innerHTML = '<p class="empty-state">No recent pattern</p>';
    }
    
    // Update pattern chart
    updatePatternChart(data.recent_pattern);
}

function updatePatternChart(pattern) {
    if (!pattern || pattern.length === 0) return;
    
    if (!state.charts.pattern) {
        const ctx = document.getElementById('patternChart').getContext('2d');
        state.charts.pattern = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Address Pattern',
                    data: [],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
    
    state.charts.pattern.data.labels = pattern.map((_, i) => i + 1);
    state.charts.pattern.data.datasets[0].data = pattern.map(p => p.address);
    state.charts.pattern.update();
}

async function testPrediction() {
    const predictedDiv = document.getElementById('predictedAddress');
    const text = predictedDiv.textContent;
    
    if (text === 'Not enough data' || text === '—') {
        showNotification('⚠️ No prediction available', 'error');
        return;
    }
    
    const match = text.match(/\((\d+)\)/);
    if (match) {
        const address = parseInt(match[1]);
        document.getElementById('address').value = address;
        await simulateStep();
        showNotification('✅ Prediction tested!', 'success');
    }
}

// Notification System
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'fadeIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize
updateStats();
