const API_BASE = '/api/v1';

let pieChart = null;
let lineChart = null;
let accessHistory = [];
let hitHistory = [];
let missHistory = [];

// Initialize charts when page loads
window.addEventListener('load', function() {
    initCharts();
    updateStats();
});

document.getElementById('mappingType').addEventListener('change', function() {
    const associativityGroup = document.getElementById('associativityGroup');
    associativityGroup.style.display = this.value === 'set_associative' ? 'block' : 'none';
});

function initCharts() {
    // Pie Chart
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    pieChart = new Chart(pieCtx, {
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
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: { size: 12 }
                    }
                }
            }
        }
    });

    // Line Chart
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    lineChart = new Chart(lineCtx, {
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
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: { size: 12 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

async function configureCache() {
    const mappingType = document.getElementById('mappingType').value;
    const replacementPolicy = document.getElementById('replacementPolicy').value;
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
                cache_size: cacheSize,
                block_size: blockSize,
                associativity: associativity
            })
        });

        const data = await response.json();
        if (response.ok) {
            showNotification('Cache configured successfully!', 'success');
            updateStats();
        } else {
            showNotification('Error: ' + data.detail, 'error');
        }
    } catch (error) {
        showNotification('Network error: ' + error.message, 'error');
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

async function simulateStep() {
    const address = parseInt(document.getElementById('address').value);

    try {
        const response = await fetch(`${API_BASE}/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: address })
        });

        const data = await response.json();
        if (response.ok) {
            addToHistory(data);
            displayResult(data);
            updateStats();
        } else {
            showNotification('Error: ' + data.detail, 'error');
        }
    } catch (error) {
        showNotification('Network error: ' + error.message, 'error');
    }
}

async function simulateBatch() {
    const batchInput = document.getElementById('batchAddresses').value;
    const addresses = batchInput.split(',').map(addr => parseInt(addr.trim())).filter(addr => !isNaN(addr));

    if (addresses.length === 0) {
        showNotification('Please enter valid addresses', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresses: addresses })
        });

        const data = await response.json();
        if (response.ok) {
            data.results.forEach(result => addToHistory(result));
            showNotification(`Batch simulation completed: ${data.count} addresses processed`, 'success');
            updateStats();
        } else {
            showNotification('Error: ' + data.detail, 'error');
        }
    } catch (error) {
        showNotification('Network error: ' + error.message, 'error');
    }
}

async function resetCache() {
    try {
        const response = await fetch(`${API_BASE}/reset`, { method: 'POST' });
        const data = await response.json();
        if (response.ok) {
            accessHistory = [];
            hitHistory = [];
            missHistory = [];
            document.getElementById('result').innerHTML = '';
            document.getElementById('historyBody').innerHTML = '<tr><td colspan="6" class="empty-state">No access history yet</td></tr>';
            showNotification('Cache reset successfully!', 'success');
            updateStats();
        } else {
            showNotification('Error: ' + data.detail, 'error');
        }
    } catch (error) {
        showNotification('Network error: ' + error.message, 'error');
    }
}

async function updateStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('totalAccesses').textContent = data.total_accesses;
            document.getElementById('hits').textContent = data.hits;
            document.getElementById('misses').textContent = data.misses;
            document.getElementById('hitRatio').textContent = (data.hit_ratio * 100).toFixed(2) + '%';
            
            // Update pie chart
            pieChart.data.datasets[0].data = [data.hits, data.misses];
            pieChart.update();
            
            // Update line chart
            hitHistory.push(data.hits);
            missHistory.push(data.misses);
            if (hitHistory.length > 20) {
                hitHistory.shift();
                missHistory.shift();
            }
            lineChart.data.labels = Array.from({length: hitHistory.length}, (_, i) => i + 1);
            lineChart.data.datasets[0].data = hitHistory;
            lineChart.data.datasets[1].data = missHistory;
            lineChart.update();
            
            displayCacheState(data.cache_state);
        }
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

function addToHistory(result) {
    accessHistory.unshift(result);
    if (accessHistory.length > 50) accessHistory.pop();
    
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';
    
    accessHistory.forEach((item, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${accessHistory.length - index}</td>
            <td>${item.address}</td>
            <td><span class="${item.hit ? 'hit' : 'miss'}">${item.hit ? '✓ HIT' : '✗ MISS'}</span></td>
            <td>${item.tag}</td>
            <td>${item.set_index !== null ? item.set_index : 'N/A'}</td>
            <td>${item.block_offset}</td>
        `;
        row.style.animation = 'fadeIn 0.5s ease';
    });
}

function displayResult(result) {
    const resultDiv = document.getElementById('result');
    const hitClass = result.hit ? 'hit' : 'miss';
    const hitText = result.hit ? 'HIT ✓' : 'MISS ✗';
    
    let html = `<p class="${hitClass}">Result: ${hitText}</p>`;
    html += `<p>Address: ${result.address}</p>`;
    html += `<p>Tag: ${result.tag}</p>`;
    if (result.set_index !== null) {
        html += `<p>Set Index: ${result.set_index}</p>`;
    }
    html += `<p>Block Offset: ${result.block_offset}</p>`;
    
    resultDiv.innerHTML = html;
}

function displayCacheState(cacheState) {
    const gridDiv = document.getElementById('cacheGrid');
    
    if (cacheState.length === 0) {
        gridDiv.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 30px;">Cache is empty - Start simulating to see cache blocks</p>';
        return;
    }
    
    let html = '';
    cacheState.forEach(block => {
        html += `
            <div class="cache-block">
                <p><strong>Set ${block.set}, Way ${block.way}</strong></p>
                <p>Tag: <strong>${block.tag}</strong></p>
                <p>Valid: <strong>${block.valid ? '✓ Yes' : '✗ No'}</strong></p>
            </div>
        `;
    });
    
    gridDiv.innerHTML = html;
}

updateStats();
