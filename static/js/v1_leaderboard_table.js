// Leaderboard Table JavaScript
let leaderboardData = null;
let currentSort = { column: 'wins', order: 'desc' };

// Task groups configuration
const taskGroups = {
  'Robotics Control': {
    tasks: ['OpenX'],
    color: 'purple'
  },
  'Digital Control': {
    tasks: ['Overcooked'],
    color: 'blue'
  },
  'Spatial Reasoning': {
    tasks: ['SQA3D', 'RobotVQA', 'PIQA'],
    color: 'cyan'
  },
  'Image Classification': {
    tasks: ['OdinW'],
    color: 'emerald'
  },
  'Tool Use': {
    tasks: ['BFCL'],
    color: 'amber'
  }
};

// Task info
const taskInfo = {
  'OpenX': { fullName: 'OpenX', metric: 'MAE' },
  'Overcooked': { fullName: 'Overcooked', metric: 'F1' },
  'SQA3D': { fullName: 'SQA3D', metric: 'EM' },
  'RobotVQA': { fullName: 'Robot VQA', metric: 'EM' },
  'PIQA': { fullName: 'PIQA', metric: 'EM' },
  'OdinW': { fullName: 'OdinW', metric: 'F1' },
  'BFCL': { fullName: 'BFCLv3', metric: 'EM' }
};

// Calculate wins for a model
function calculateWins(modelName, results) {
  const modelScores = results[modelName];
  let wins = 0;
  
  Object.keys(modelScores).forEach(task => {
    const modelScore = modelScores[task];
    const allScores = Object.keys(results).map(m => results[m][task]);
    const validScores = allScores.filter(s => s !== "N/A" && s !== null && s !== undefined && !isNaN(s));
    
    // Only count as win if there are valid scores and not all zeros
    if (validScores.length > 0 && validScores.some(s => s > 0)) {
      // For OpenX (MAE), lower is better
      if (task === 'OpenX') {
        const isWinner = Object.keys(results).every(m => 
          m === modelName || results[m][task] >= modelScore
        );
        if (isWinner) wins++;
      } else {
        // For other tasks, higher is better
        const isWinner = Object.keys(results).every(m => 
          m === modelName || results[m][task] <= modelScore
        );
        if (isWinner) wins++;
      }
    }
  });
  
  return wins;
}

// Get rank badge
function getRankBadge(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
}

// Get color classes for task groups
function getColorClasses(color) {
  const colors = {
    purple: 'border-purple-500 bg-purple-50',
    blue: 'border-blue-500 bg-blue-50',
    cyan: 'border-cyan-500 bg-cyan-50',
    emerald: 'border-emerald-500 bg-emerald-50',
    amber: 'border-amber-500 bg-amber-50'
  };
  return colors[color] || colors.purple;
}

// Create sort icon
function createSortIcon(column) {
  const icon = document.createElement('span');
  icon.className = 'sort-icon';
  
  if (currentSort.column === column) {
    icon.innerHTML = currentSort.order === 'desc' ? '▼' : '▲';
    icon.style.color = '#2563eb';
  } else {
    icon.innerHTML = '▼';
    icon.style.color = '#9ca3af';
  }
  
  return icon;
}

// Sort data
function sortData(data) {
  return [...data].sort((a, b) => {
    let aVal, bVal;
    
    if (currentSort.column === 'wins') {
      aVal = a.wins;
      bVal = b.wins;
    } else {
      aVal = a[currentSort.column] || 0;
      bVal = b[currentSort.column] || 0;
    }
    
    return currentSort.order === 'desc' ? bVal - aVal : aVal - bVal;
  });
}

// Render table
function renderTable() {
  const container = document.getElementById('leaderboard-container');
  if (!container || !leaderboardData) return;
  
  const results = leaderboardData.results;
  const models = Object.keys(results);
  
  // Calculate model data with wins
  const modelData = models.map(model => {
    const wins = calculateWins(model, results);
    return {
      model: model.toUpperCase(),
      modelKey: model,
      wins,
      ...results[model]
    };
  });
  
  // Sort data
  const sortedData = sortData(modelData);
  
  // Create table HTML
  let tableHTML = `
    <div class="leaderboard-table-container">
      <table class="leaderboard-table">
        <thead>
          <!-- Group Headers -->
          <tr class="group-header-row">
            <th class="rank-header" rowspan="2"></th>
            <th class="model-header" rowspan="2">Model</th>
            ${Object.entries(taskGroups).map(([groupName, { tasks, color }]) => 
              `<th class="group-header ${getColorClasses(color)}" colspan="${tasks.length}">${groupName}</th>`
            ).join('')}
            <th class="wins-header sortable" rowspan="2" data-column="wins">
              <div class="wins-header-content">
                <span class="wins-title">Wins</span>
                <span class="sort-icon">▼</span>
                <div class="wins-metric">/7</div>
              </div>
            </th>
          </tr>
          
          <!-- Task Headers -->
          <tr class="task-header-row">
            ${Object.entries(taskGroups).map(([groupName, { tasks }]) => 
              tasks.map((task, idx) => 
                `<th class="task-header sortable ${idx === 0 ? 'first-in-group' : ''} ${idx === tasks.length - 1 ? 'last-in-group' : ''}" 
                     data-column="${task}">
                   <div class="task-header-content">
                     <span class="task-name">${taskInfo[task].fullName}</span>
                     <span class="sort-icon">▼</span>
                   </div>
                   <div class="metric-name">${taskInfo[task].metric}</div>
                 </th>`
              ).join('')
            ).join('')}
          </tr>
        </thead>
        
        <tbody>
          ${sortedData.map((model, idx) => `
            <tr class="model-row ${idx === 0 ? 'first-place' : idx === 1 ? 'second-place' : idx === 2 ? 'third-place' : ''}">
              <td class="rank-cell">
                <span class="rank-badge">${getRankBadge(idx + 1)}</span>
              </td>
              <td class="model-cell">
                <span class="model-name">${model.model}</span>
              </td>
              ${Object.entries(taskGroups).map(([groupName, { tasks }]) => 
                tasks.map((task, taskIdx) => {
                  const score = model[task];
                  const allScores = models.map(m => results[m][task]);
                  
                  // For OpenX (MAE), lower is better
                  let isWinner = false;
                  const validScores = allScores.filter(s => s !== "N/A" && s !== null && s !== undefined && !isNaN(s));
                  
                  // Only determine winner if there are valid scores and not all zeros
                  if (validScores.length > 0 && validScores.some(s => s > 0)) {
                    if (task === 'OpenX') {
                      const minScore = Math.min(...validScores);
                      isWinner = score === minScore;
                    } else {
                      const maxScore = Math.max(...validScores);
                      isWinner = score === maxScore;
                    }
                  }
                  
                  // Handle display for different score types
                  let displayValue;
                  if (score === "N/A" || score === null || score === undefined || isNaN(score)) {
                    displayValue = task === 'BFCL' ? 'N/A*' : 'N/A';
                  } else {
                    displayValue = task === 'OpenX' ? score.toFixed(3) : (score * 100).toFixed(1);
                  }
                  
                  return `
                    <td class="score-cell ${taskIdx === 0 ? 'first-in-group' : ''} ${taskIdx === tasks.length - 1 ? 'last-in-group' : ''}">
                      <div class="score-content">
                        <span class="score-value ${isWinner ? 'winner' : ''}">${displayValue}</span>
                        ${isWinner ? '<span class="trophy">🏆</span>' : ''}
                      </div>
                    </td>
                  `;
                }).join('')
              ).join('')}
              <td class="wins-cell">
                <span class="wins-value">${model.wins}</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  container.innerHTML = tableHTML;
  
  // Add event listeners for sorting
  document.querySelectorAll('.sortable').forEach(header => {
    header.addEventListener('click', () => {
      const column = header.dataset.column;
      
      if (currentSort.column === column) {
        currentSort.order = currentSort.order === 'desc' ? 'asc' : 'desc';
      } else {
        currentSort.column = column;
        currentSort.order = 'desc';
      }
      
      renderTable();
    });
  });
}

// Initialize leaderboard
function initializeLeaderboard() {
  fetch('../data/v1_leaderboard_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      leaderboardData = data;
      renderTable();
    })
    .catch(error => {
      console.error('Error loading leaderboard data:', error);
      const container = document.getElementById('leaderboard-container');
      if (container) {
        container.innerHTML = `
          <div class="notification is-danger">
            Error loading leaderboard data: ${error.message}
          </div>
        `;
      }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLeaderboard);
} else {
  initializeLeaderboard();
}
