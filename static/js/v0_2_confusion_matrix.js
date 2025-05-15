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
  if (!confusionMatrixData || !confusionMatrixData[model] || !confusionMatrixData[model][dataset]) {
    console.warn('No data found for:', { model, dataset });
    return null;
  }
  const datasetPercentageData = confusionMatrixData[model][dataset];
  console.log('Raw percentage data from JSON:', datasetPercentageData);

  const trueActionLabelsStr = Object.keys(datasetPercentageData).sort((a, b) => Number(a) - Number(b));
  if (trueActionLabelsStr.length === 0) {
      console.warn('No action labels found in data for:', { model, dataset });
      return null;
  }
  const actionCount = trueActionLabelsStr.length;
  const labels = trueActionLabelsStr.map(Number); // Numeric labels for display and consistency

  console.log('Action labels (numeric):', labels);
  console.log('Action count:', actionCount);

  const matrix = []; // This will be the matrix of percentages

  for (let i = 0; i < actionCount; i++) {
    const trueActionStr = trueActionLabelsStr[i]; // Current ground truth action (string)
    const rowPercentages = [];
    const predictionsForTrueAction = datasetPercentageData[trueActionStr];

    if (!predictionsForTrueAction) {
        console.warn(`Missing prediction data for true_action ${trueActionStr} in ${model}/${dataset}`);
        // Fill row with zeros as a fallback
        for (let j = 0; j < actionCount; j++) {
            rowPercentages.push(0);
        }
        matrix.push(rowPercentages);
        continue;
    }

    for (let j = 0; j < actionCount; j++) {
      const predActionStr = trueActionLabelsStr[j]; // Current predicted action (string)
      const percentage = predictionsForTrueAction[predActionStr];
      
      if (typeof percentage === 'number') {
        rowPercentages.push(percentage);
      } else {
        // If a specific prediction percentage is missing for a given true_action/pred_action pair, default to 0
        rowPercentages.push(0); 
        // console.warn(`Missing percentage for ${model}/${dataset}, true: ${trueActionStr}, pred: ${predActionStr}. Defaulting to 0.`);
      }
    }
    matrix.push(rowPercentages);
  }

  console.log('Constructed percentage matrix:', matrix);

  return {
    matrix: matrix, // This is already the percentage matrix
    labels: labels
  };
}

function renderConfusionMatrix() {
  const container = document.getElementById('confusion-matrix-canvas-container');
  container.innerHTML = '<canvas id="confusion-matrix-canvas"></canvas>'; // Clear previous content, including error messages
  const ctx = document.getElementById('confusion-matrix-canvas').getContext('2d'); // This canvas is not used anymore for the table
  const data = getMatrixData(currentModel, currentDataset);

  if (!data || !data.matrix || !data.labels) {
    container.innerHTML = '<div class="notification is-warning">No data available to display for this selection.</div>';
    console.warn("Render failed: No data returned from getMatrixData for", currentModel, currentDataset)
    if (matrixChart) { // If a chart.js instance exists, destroy it
        matrixChart.destroy();
        matrixChart = null;
    }
    return;
  }

  // const {matrix, raw, labels} = data; // Old, raw is no longer available
  const {matrix, labels} = data; // New

  // Destroy previous Chart.js instance if it exists (though we are moving to a table)
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
  table.style.maxWidth = '100%'; // Ensure table doesn't exceed container width
  table.style.overflowX = 'auto'; // Allow horizontal scrolling if needed
  
  // Add Prediction label above the table
  const predictionLabel = document.createElement('div');
  predictionLabel.textContent = 'Prediction';
  predictionLabel.style.position = 'absolute';
  predictionLabel.style.top = '5px';
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
  gtLabel.style.left = '-20px';
  gtLabel.style.top = '50%';
  gtLabel.style.transform = 'translateY(-50%) rotate(-90deg)';
  gtLabel.style.fontWeight = 'bold';
  gtLabel.style.fontSize = '14px';
  gtLabel.style.whiteSpace = 'nowrap';
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
      // Apply the pastel color scheme for all values.
      // When value is 0, this becomes rgba(255, 248, 178, 0.85) (pastel yellow).
      td.style.backgroundColor = 
        `rgba(255, ${Math.round(248 - 248 * value)}, ${Math.round(178 - 178 * value)}, 0.85)`;
      
      // Display the raw value without formatting as a percentage
      td.textContent = value.toFixed(2); // Show value with 2 decimal places
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