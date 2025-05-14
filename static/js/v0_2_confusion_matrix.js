// Interactive Confusion Matrix Visualization for Multinet v0.2
// Assumes Chart.js is loaded

// Debug: Log Chart.js and ChartMatrix objects
console.log('Chart:', window.Chart);
console.log('ChartMatrix:', window.ChartMatrix);

const CONFUSION_MATRIX_JSON = '../data/v0_2_confusion_matrix.json';
const MODEL_DISPLAY_NAMES = {
  'gpt4o': 'GPT-4o',
  'gpt4_1': 'GPT-4.1',
  'openvla': 'OpenVLA',
  'pi0_base': 'Pi0 Base',
  'pi0_fast': 'Pi0 FAST'
};
const DATASET_DISPLAY_NAMES = {
  'bigfish': 'Bigfish', 'bossfight': 'Bossfight', 'caveflyer': 'Caveflyer', 'chaser': 'Chaser', 'climber': 'Climber',
  'coinrun': 'Coinrun', 'dodgeball': 'Dodgeball', 'fruitbot': 'Fruitbot', 'heist': 'Heist', 'jumper': 'Jumper',
  'leaper': 'Leaper', 'maze': 'Maze', 'miner': 'Miner', 'ninja': 'Ninja', 'plunder': 'Plunder', 'starpilot': 'Starpilot'
};
const MODEL_ORDER = ['gpt4o', 'gpt4_1', 'openvla', 'pi0_base', 'pi0_fast'];
const DATASET_ORDER = [
  'bigfish', 'bossfight', 'caveflyer', 'chaser', 'climber', 'coinrun', 'dodgeball', 'fruitbot',
  'heist', 'jumper', 'leaper', 'maze', 'miner', 'ninja', 'plunder', 'starpilot'
];

let confusionMatrixData = null;
let currentModel = MODEL_ORDER[0];
let currentDataset = DATASET_ORDER[0];
let matrixChart = null;

function createModelBar() {
  const bar = document.querySelector('.confusion-matrix-models');
  bar.innerHTML = '';
  MODEL_ORDER.forEach(model => {
    const btn = document.createElement('button');
    btn.className = 'model-button' + (model === currentModel ? ' active' : '');
    btn.textContent = MODEL_DISPLAY_NAMES[model];
    btn.onclick = () => {
      if (currentModel !== model) {
        currentModel = model;
        createModelBar();
        createDatasetSidebar();
        renderConfusionMatrix();
      }
    };
    bar.appendChild(btn);
  });
}

function createDatasetSidebar() {
  const sidebar = document.querySelector('.confusion-matrix-datasets');
  sidebar.innerHTML = '';
  DATASET_ORDER.forEach(dataset => {
    const btn = document.createElement('button');
    btn.className = 'metric-button' + (dataset === currentDataset ? ' active' : '');
    btn.style.display = 'block';
    btn.style.width = '100%';
    btn.style.padding = '0.75rem';
    btn.style.margin = '0.5rem 0';
    btn.style.textAlign = 'left';
    btn.style.background = dataset === currentDataset ? '#363636' : '#f5f5f5';
    btn.style.color = dataset === currentDataset ? 'white' : 'black';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.3s ease';
    btn.textContent = DATASET_DISPLAY_NAMES[dataset];
    btn.onclick = () => {
      if (currentDataset !== dataset) {
        currentDataset = dataset;
        createDatasetSidebar();
        renderConfusionMatrix();
      }
    };
    sidebar.appendChild(btn);
  });
}

function getMatrixData(model, dataset) {
  console.log('Getting matrix data for:', { model, dataset });
  const entry = confusionMatrixData[model][dataset];
  console.log('Raw entry data:', entry);
  if (!entry) {
    console.warn('No data found for:', { model, dataset });
    return null;
  }
  
  // Get action space size from prediction keys
  const actionCount = Math.max(
    ...Object.keys(entry.prediction).map(Number),
    ...Object.keys(entry.ground_truth).map(Number)
  ) + 1;
  console.log('Action space size:', actionCount);
  
  const gt = entry.ground_truth;
  const pred = entry.prediction;
  
  // First create the raw confusion matrix
  const raw = Array(actionCount).fill().map(() => Array(actionCount).fill(0));
  
  // Calculate the total number of samples
  const totalSamples = Object.values(gt).reduce((sum, count) => sum + count, 0);
  console.log('Total samples:', totalSamples);
  
  // For each ground truth action
  Object.entries(gt).forEach(([gtAction, gtCount]) => {
    // Calculate the proportion of this ground truth action
    const gtProportion = gtCount / totalSamples;
    console.log(`Ground truth action ${gtAction}:`, { gtCount, gtProportion });
    
    // For each prediction action
    Object.entries(pred).forEach(([predAction, predCount]) => {
      // Calculate the proportion of this prediction
      const predProportion = predCount / totalSamples;
      console.log(`  Prediction ${predAction}:`, { predCount, predProportion });
      
      // Calculate the joint count based on both proportions
      const jointCount = Math.round(gtProportion * predProportion * totalSamples);
      raw[gtAction][predAction] = jointCount;
    });
  });
  
  console.log('Raw confusion matrix:', raw);
  
  // Create normalized matrix
  const matrix = raw.map(row => {
    const rowSum = row.reduce((sum, count) => sum + count, 0);
    // Handle zero-sum rows to avoid division by zero
    const divisor = rowSum === 0 ? 1 : rowSum;
    return row.map(count => count / divisor);
  });
  
  console.log('Normalized matrix:', matrix);
  
  return {
    matrix: matrix,
    raw: raw,
    labels: Array.from({length: actionCount}, (_, i) => i)
  };
}

function renderConfusionMatrix() {
  const container = document.getElementById('confusion-matrix-canvas-container');
  container.innerHTML = '<canvas id="confusion-matrix-canvas"></canvas>';
  const ctx = document.getElementById('confusion-matrix-canvas').getContext('2d');
  const data = getMatrixData(currentModel, currentDataset);
  if (!data) {
    container.innerHTML = '<div class="notification is-danger">No data available for this model/dataset.</div>';
    return;
  }
  const {matrix, raw, labels} = data;
  // Destroy previous chart
  if (matrixChart) {
    matrixChart.destroy();
    matrixChart = null;
  }

  // Create a table-based confusion matrix
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.height = '100%'; // Fill the container height
  table.style.borderCollapse = 'collapse';
  table.style.textAlign = 'center';
  table.style.fontSize = '12px';
  table.style.tableLayout = 'fixed'; // Fixed layout for consistent cell sizes
  table.style.position = 'relative';
  
  // Add Prediction label above the table
  const predictionLabel = document.createElement('div');
  predictionLabel.textContent = 'Prediction';
  predictionLabel.style.position = 'absolute';
  predictionLabel.style.top = '-8%';
  predictionLabel.style.left = '50%';
  predictionLabel.style.transform = 'translateX(-50%)';
  predictionLabel.style.fontWeight = 'bold';
  predictionLabel.style.fontSize = '14px';
  predictionLabel.style.width = '100%';
  predictionLabel.style.textAlign = 'center';
  container.appendChild(predictionLabel);
  
  // Add Ground Truth label to the left of the table
  const gtLabel = document.createElement('div');
  gtLabel.textContent = 'Ground Truth';
  gtLabel.style.position = 'absolute';
  gtLabel.style.left = '-11%';  // Position at 25% of the left padding
  gtLabel.style.top = '50%';
  gtLabel.style.transform = 'translateY(-50%) rotate(-90deg)';
  gtLabel.style.fontWeight = 'bold';
  gtLabel.style.fontSize = '14px';
  container.appendChild(gtLabel);
  
  // Create header row
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.appendChild(document.createElement('th')); // Empty corner cell
  labels.forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    th.style.padding = '4px';
    th.style.backgroundColor = '#f5f5f5';
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement('tbody');
  matrix.forEach((row, i) => {
    const tr = document.createElement('tr');
    // Add row label
    const th = document.createElement('th');
    th.textContent = labels[i];
    th.style.padding = '4px';
    th.style.backgroundColor = '#f5f5f5';
    tr.appendChild(th);
    
    // Add cells
    row.forEach((value, j) => {
      const td = document.createElement('td');
      td.style.padding = '4px';
      td.style.border = '1px solid #ddd';
      td.style.backgroundColor = value > 0 ? 
        `rgba(${255 * value},${200 + 55 * (1 - value)},${255 * (1 - value)},0.85)` : 
        'rgba(240,240,240,0.7)';
      td.textContent = value > 0 ? `${(value * 100).toFixed(1)}%` : '';
      td.title = `Raw count: ${raw[i][j]}`;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  // Add table to container
  container.innerHTML = '';
  container.appendChild(table);
  container.appendChild(predictionLabel);
  container.appendChild(gtLabel);
}

function initializeConfusionMatrix() {
  fetch(CONFUSION_MATRIX_JSON)
    .then(r => r.json())
    .then(data => {
      confusionMatrixData = data;
      createModelBar();
      createDatasetSidebar();
      renderConfusionMatrix();
    })
    .catch(err => {
      const container = document.getElementById('confusion-matrix-canvas-container');
      container.innerHTML = `<div class="notification is-danger">Error loading confusion matrix: ${err.message}</div>`;
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeConfusionMatrix);
} else {
  initializeConfusionMatrix();
} 