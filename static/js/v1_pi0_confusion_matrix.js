// Confusion Matrix Visualization for Pi0 Overcooked Data
// Based on v0_2_confusion_matrix.js but simplified for single model/dataset

const CONFUSION_MATRIX_JSON = '../data/v1_pi0_overcooked_confusion_matrix.json';

let confusionMatrixData = null;

function getMatrixData() {
  console.log('Getting matrix data for Pi0 Overcooked');
  if (!confusionMatrixData || !confusionMatrixData.pi0) {
    console.warn('No data found for Pi0');
    return null;
  }
  
  const pi0Data = confusionMatrixData.pi0;
  console.log('Raw percentage data from JSON:', pi0Data);

  const trueActionLabelsStr = Object.keys(pi0Data).sort((a, b) => Number(a) - Number(b));
  if (trueActionLabelsStr.length === 0) {
    console.warn('No action labels found in data');
    return null;
  }
  
  const actionCount = trueActionLabelsStr.length;
  const labels = trueActionLabelsStr.map(Number); // Numeric labels for display

  console.log('Action labels (numeric):', labels);
  console.log('Action count:', actionCount);

  const matrix = []; // This will be the matrix of percentages

  for (let i = 0; i < actionCount; i++) {
    const trueActionStr = trueActionLabelsStr[i]; // Current ground truth action (string)
    const rowPercentages = [];
    const predictionsForTrueAction = pi0Data[trueActionStr];

    if (!predictionsForTrueAction) {
      console.warn(`Missing prediction data for true_action ${trueActionStr}`);
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
        // If a specific prediction percentage is missing, default to 0
        rowPercentages.push(0); 
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

function getColorForPercentage(percentage) {
  // Color mapping: Light yellow (0.000) to Dark red (0.200)
  // Smooth gradient matching the reference image
  
  // Normalize percentage to 0-1 range based on max value of 0.200
  const normalizedValue = Math.min(percentage / 0.200, 1.0);
  
  // Create smooth gradient from light yellow to dark red
  if (normalizedValue <= 0.125) {
    // Light yellow to yellow-orange (0.000 to 0.025)
    const t = normalizedValue / 0.125;
    const red = Math.round(255);
    const green = Math.round(255 - 30 * t); // 255 to 225
    const blue = Math.round(178 - 178 * t); // 178 to 0
    return `rgb(${red}, ${green}, ${blue})`;
  } else if (normalizedValue <= 0.25) {
    // Yellow-orange to orange (0.025 to 0.050)
    const t = (normalizedValue - 0.125) / 0.125;
    const red = Math.round(255);
    const green = Math.round(225 - 50 * t); // 225 to 175
    const blue = 0;
    return `rgb(${red}, ${green}, ${blue})`;
  } else if (normalizedValue <= 0.5) {
    // Orange to red-orange (0.050 to 0.100)
    const t = (normalizedValue - 0.25) / 0.25;
    const red = Math.round(255);
    const green = Math.round(175 - 75 * t); // 175 to 100
    const blue = 0;
    return `rgb(${red}, ${green}, ${blue})`;
  } else if (normalizedValue <= 0.75) {
    // Red-orange to red (0.100 to 0.150)
    const t = (normalizedValue - 0.5) / 0.25;
    const red = Math.round(255);
    const green = Math.round(100 - 50 * t); // 100 to 50
    const blue = 0;
    return `rgb(${red}, ${green}, ${blue})`;
  } else {
    // Red to dark red (0.150 to 0.200)
    const t = (normalizedValue - 0.75) / 0.25;
    const red = Math.round(255 - 30 * t); // 255 to 225
    const green = Math.round(50 - 50 * t); // 50 to 0
    const blue = 0;
    return `rgb(${red}, ${green}, ${blue})`;
  }
}

function renderConfusionMatrix() {
  const container = document.getElementById('pi0-confusion-matrix-container');
  container.innerHTML = ''; // Clear previous content
  const data = getMatrixData();

  if (!data || !data.matrix || !data.labels) {
    container.innerHTML = '<div class="notification is-warning">No data available to display.</div>';
    console.warn("Render failed: No data returned from getMatrixData");
    return;
  }

  const {matrix, labels} = data;

  // Create a table-based confusion matrix
  const table = document.createElement('table');
  table.style.width = 'auto';
  table.style.borderCollapse = 'collapse';
  table.style.textAlign = 'center';
  table.style.fontSize = '12px';
  table.style.tableLayout = 'auto';
  table.style.position = 'relative';
  table.style.margin = '0 auto';
  table.style.marginTop = '25px';
  
  // Add Prediction label above the table
  const predictionLabel = document.createElement('div');
  predictionLabel.textContent = 'Prediction';
  predictionLabel.style.position = 'absolute';
  predictionLabel.style.top = '0px';
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
  gtLabel.style.left = '5px';
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
    th.style.padding = '0px';
    th.style.backgroundColor = '#f5f5f5';
    th.style.border = '1px solid white';
    th.style.width = '25px';
    th.style.height = '20px';
    th.style.fontSize = '7px';
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Create data rows
  const tbody = document.createElement('tbody');
  matrix.forEach((row, i) => {
    const tr = document.createElement('tr');
    
    // Add row label (ground truth) - use th tag like v0.2
    const rowLabel = document.createElement('th');
    rowLabel.textContent = labels[i];
    rowLabel.style.padding = '0px';
    rowLabel.style.backgroundColor = '#f5f5f5';
    rowLabel.style.fontWeight = 'bold';
    rowLabel.style.border = '1px solid white';
    rowLabel.style.width = '25px';
    rowLabel.style.height = '20px';
    rowLabel.style.fontSize = '7px';
    tr.appendChild(rowLabel);
    
    // Add data cells
    row.forEach((percentage, j) => {
      const td = document.createElement('td');
      td.textContent = ''; // Remove numbers, show only color
      td.style.padding = '0px';
      td.style.border = '1px solid white';
      td.style.backgroundColor = getColorForPercentage(percentage);
      td.style.color = 'black';
        td.style.fontSize = '7px';
        td.style.whiteSpace = 'nowrap';
        td.style.width = '25px';
        td.style.height = '20px';
        td.style.transition = 'transform 0.1s ease-out, box-shadow 0.1s ease-out';
        td.style.willChange = 'transform, box-shadow';
        td.style.cursor = 'none';
        td.style.position = 'relative';
        td.style.zIndex = '1';
        td.setAttribute('data-percentage', percentage);
      
      // Add sharp mountain effect on hover
      td.addEventListener('mouseenter', function() {
        // Show the cell value (without changing display property)
        this.textContent = percentage.toFixed(2).replace(/^0\./, '.');
        this.style.color = 'black';
        this.style.fontWeight = 'bold';
        this.style.fontSize = '10px';
        this.style.textAlign = 'center';
        this.style.lineHeight = '20px'; // Center vertically using line-height
        
        // Protrude the entire row and column
        const allCells = document.querySelectorAll('#pi0-confusion-matrix-container td');
        const currentRow = this.parentElement;
        const currentRowIndex = Array.from(currentRow.parentElement.children).indexOf(currentRow);
        const currentCellIndex = Array.from(currentRow.children).indexOf(this) - 1; // -1 for row label
        
        allCells.forEach(cell => {
          const cellRow = cell.parentElement;
          const cellRowIndex = Array.from(cellRow.parentElement.children).indexOf(cellRow);
          const cellIndex = Array.from(cellRow.children).indexOf(cell) - 1; // -1 for row label
          
          // Check if cell is in same row or column
          const isSameRow = cellRowIndex === currentRowIndex;
          const isSameColumn = cellIndex === currentCellIndex;
          const isHoveredCell = cell === this;
          
          if (isSameRow || isSameColumn) {
            // Show value for row/column cells (without changing display property)
            const cellPercentage = cell.getAttribute('data-percentage');
            if (cellPercentage && !isHoveredCell) {
              cell.textContent = parseFloat(cellPercentage).toFixed(2).replace(/^0\./, '.');
              cell.style.color = 'black';
              cell.style.fontWeight = 'bold';
              cell.style.fontSize = '8px';
              cell.style.textAlign = 'center';
              cell.style.lineHeight = '20px'; // Center vertically using line-height
            }
            
            // Protrude the entire row and column with optimized effects
            if (isHoveredCell) {
              // Hovered cell gets the most dramatic effect - really pops out
              cell.style.transform = 'translateZ(80px) scale(1.5)';
              cell.style.zIndex = '100';
              cell.style.boxShadow = '0 20px 40px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,255,255,0.8)';
            } else {
              // Other cells in the same row/column get moderate protrusion
              cell.style.transform = 'translateZ(40px) scale(1.2)';
              cell.style.zIndex = '60';
              cell.style.boxShadow = '0 10px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.6)';
            }
          } else {
            // Reset non-row/column cells
            cell.style.transform = 'translateZ(0px) scale(1)';
            cell.style.zIndex = '1';
            cell.style.boxShadow = 'none';
          }
        });
      });
      
      td.addEventListener('mouseleave', function() {
        // Hide the cell value and reset styling
        this.textContent = '';
        this.style.color = 'black';
        this.style.fontWeight = 'normal';
        this.style.fontSize = '7px';
        this.style.textAlign = '';
        this.style.lineHeight = '';
        
        // Reset all cells to normal state
        const allCells = document.querySelectorAll('#pi0-confusion-matrix-container td');
        allCells.forEach(cell => {
          cell.style.transform = 'translateZ(0px) scale(1)';
          cell.style.zIndex = '1';
          cell.style.boxShadow = 'none';
          cell.style.willChange = 'auto';
          cell.textContent = '';
          cell.style.color = 'black';
          cell.style.fontWeight = 'normal';
          cell.style.fontSize = '7px';
          cell.style.textAlign = '';
          cell.style.lineHeight = '';
        });
      });
      
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  
  container.appendChild(table);
  
  // Add colorbar
  addColorbar(table);
}

function addColorbar(table) {
  // Get the actual height of the table
  const tableHeight = table.offsetHeight;
  
  // Create colorbar container
  const colorbarContainer = document.createElement('div');
  colorbarContainer.style.position = 'absolute';
  colorbarContainer.style.left = '100%';
  colorbarContainer.style.marginLeft = '20px';
  colorbarContainer.style.top = '50%';
  colorbarContainer.style.transform = 'translateY(-50%)';
  colorbarContainer.style.width = '20px';
  colorbarContainer.style.height = `${tableHeight}px`;
  colorbarContainer.style.border = '1px solid #ccc';
  colorbarContainer.style.borderRadius = '3px';
  colorbarContainer.style.overflow = 'visible';
  
  // Create gradient background
  const gradient = document.createElement('div');
  gradient.style.width = '100%';
  gradient.style.height = '100%';
  gradient.style.background = 'linear-gradient(to bottom, rgb(255,255,178), rgb(255,225,0), rgb(255,175,0), rgb(255,100,0), rgb(255,50,0), rgb(255,0,0))';
  colorbarContainer.appendChild(gradient);
  
  // Add value labels
  const values = [0.00, 0.025, 0.05, 0.10, 0.15, 0.20];
  values.forEach((value, index) => {
    const label = document.createElement('div');
    label.textContent = value.toFixed(2);
    label.style.position = 'absolute';
    label.style.left = '25px';
    label.style.top = `${(index / (values.length - 1)) * 100}%`;
    label.style.transform = 'translateY(-50%)';
    label.style.fontSize = '10px';
    label.style.fontWeight = 'bold';
    label.style.color = '#333';
    label.style.whiteSpace = 'nowrap';
    label.style.backgroundColor = 'white';
    label.style.padding = '2px 4px';
    label.style.borderRadius = '2px';
    label.style.zIndex = '100';
    label.style.border = '1px solid #ccc';
    colorbarContainer.appendChild(label);
  });
  
  
  table.parentElement.appendChild(colorbarContainer);
}

function loadConfusionMatrixData() {
  fetch(CONFUSION_MATRIX_JSON)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Loaded confusion matrix data:', data);
      confusionMatrixData = data;
      renderConfusionMatrix();
    })
    .catch(error => {
      console.error('Error loading confusion matrix data:', error);
      const container = document.getElementById('pi0-confusion-matrix-container');
      container.innerHTML = '<div class="notification is-danger">Error loading confusion matrix data.</div>';
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing Pi0 confusion matrix visualization');
  loadConfusionMatrixData();
});
