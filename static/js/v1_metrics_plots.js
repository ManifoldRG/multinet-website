// MultiNet v1 Metrics Visualization - Bar charts for PIQA and SQA3D datasets
(function() {
const v1Models = ['gpt5', 'pi0', 'magma'];
const v1ModelDisplayNames = {
  'gpt5': 'GPT-5',
  'pi0': 'Pi0',
  'magma': 'Magma'
};

// Helper function to get model data
function getModelData(data, model) {
  if (data[model]) {
    return data[model];
  }
  return null;
}

// Helper function to round max value to a nice number for better tick spacing
function getNiceMaxValue(dataMax, capAt = 1.0) {
  // Calculate 1.1x the max value
  let maxValue = dataMax * 1.1;
  
  // Cap at the specified limit
  if (maxValue >= capAt) {
    return capAt;
  }
  
  // Round up to a nice number
  // Determine the order of magnitude
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
  
  // Nice intervals to round to (relative to magnitude)
  const niceNumbers = [0.1, 0.2, 0.25, 0.5, 1.0, 2.0, 2.5, 5.0, 10.0];
  
  // Find the smallest nice number that's >= our maxValue
  for (let nice of niceNumbers) {
    const candidate = nice * magnitude;
    if (candidate >= maxValue) {
      return Math.min(candidate, capAt);
    }
  }
  
  // If nothing found, round up to next magnitude
  return Math.min(magnitude * 10, capAt);
}

let piqaChart = null;
let piqaInvalidPercentageChart = null;
let sqa3dChart = null;
let sqa3dAvgSimilarityScoreChart = null;
let sqa3dHighSimilarityPercentageChart = null;
let overcookedChart = null;
let overcookedMacroPrecisionChart = null;
let overcookedMacroRecallChart = null;
let overcookedMacroF1Chart = null;
let overcookedPercentageInvalidsChart = null;
let robotvqaChart = null;
let robotvqaAvgSimilarityScoreChart = null;
let robotvqaHighSimilarityPercentageChart = null;
let odinwPart1Chart = null;
let odinwPart2Chart = null;
let odinwMacroPrecisionPart1Chart = null;
let odinwMacroPrecisionPart2Chart = null;
let odinwMacroRecallPart1Chart = null;
let odinwMacroRecallPart2Chart = null;
let odinwMacroF1Part1Chart = null;
let odinwMacroF1Part2Chart = null;
let odinwInvalidPercentagePart1Chart = null;
let odinwInvalidPercentagePart2Chart = null;
let bfclv3InvalidTurnPercentageChart = null;
let bfclv3InvalidConversationPercentageChart = null;
let bfclv3AvgValidPredictedFunctionsPerSampleChart = null;
let bfclv3HighSimilarityPercentageChart = null;
let openxActionSuccessRateChart = null;
let openxInvalidPredictionsPercentageChart = null;
let openxMeanAbsoluteErrorChart = null;
let openxNormalizedMaeChart = null;
let openxNormalizedQuantileFilteredMaeChart = null;
let currentDataset = 'piqa';
let currentEvalMetric = 'exact_match';

// Update evaluation metric buttons based on selected dataset
function updateEvalMetricButtons(dataset) {
  const sidebar = document.getElementById('eval-metrics-sidebar');
  if (!sidebar) return;
  
  // Remove existing metric buttons (except the header)
  const existingButtons = sidebar.querySelectorAll('.metric-button');
  existingButtons.forEach(btn => btn.remove());
  
  // Define which metrics are available for each dataset
  const datasetMetrics = {
    'piqa': [
      { key: 'exact_match', label: 'Exact Match Rate' },
      { key: 'invalid_percentage', label: 'Invalid Percentage' }
    ],
    'sqa3d': [
      { key: 'exact_match', label: 'Exact Match Rate' },
      { key: 'avg_similarity_score', label: 'Average Similarity Score' },
      { key: 'high_similarity_percentage', label: 'High Quality Predictions (>.8 Similarity)' }
    ],
    'overcooked': [
      { key: 'exact_match', label: 'Exact Match Rate' },
      { key: 'macro_precision', label: 'Macro Precision' },
      { key: 'macro_recall', label: 'Macro Recall' },
      { key: 'macro_f1', label: 'Macro F1' },
      { key: 'percentage_invalids', label: 'Percentage Invalids' }
    ],
    'robotvqa': [
      { key: 'exact_match', label: 'Exact Match Rate' },
      { key: 'avg_similarity_score', label: 'Average Similarity Score' },
      { key: 'high_similarity_percentage', label: 'High Quality Predictions (>.8 Similarity)' }
    ],
    'odinw': [
      { key: 'exact_match', label: 'Exact Match Rate' },
      { key: 'macro_precision', label: 'Macro Precision' },
      { key: 'macro_recall', label: 'Macro Recall' },
      { key: 'macro_f1', label: 'Macro F1' },
      { key: 'invalid_percentage', label: 'Invalid Percentage' }
    ],
    'bfclv3': [
      { key: 'invalid_turn_percentage', label: 'Invalid Turn Percentage' },
      { key: 'invalid_conversation_percentage', label: 'Invalid Conversation Percentage' },
      { key: 'avg_valid_predicted_functions_per_sample', label: 'Average Valid Outputs Per Conversation' },
      { key: 'high_similarity_percentage', label: 'High Quality Predictions (>0.8)' }
    ],
    'openx': [
      { key: 'action_success_rate', label: 'Action Success Rate' },
      { key: 'invalid_predictions_percentage', label: 'Invalid Predictions Percentage' },
      { key: 'total_dataset_amae', label: 'Mean Absolute Error' },
      { key: 'normalized_amae', label: 'Normalized MAE' },
      { key: 'normalized_quantile_filtered_amae', label: 'Normalized Quantile Filtered MAE' }
    ]
  };
  
  const metrics = datasetMetrics[dataset] || [{ key: 'exact_match', label: 'Exact Match Rate' }];
  
  // Add metric buttons
  metrics.forEach((metric, index) => {
    const button = document.createElement('button');
    button.className = 'metric-button' + (index === 0 ? ' active' : '');
    button.dataset.evalMetric = metric.key;
    button.textContent = metric.label;
    button.addEventListener('click', () => handleEvalMetricClick(metric.key));
    sidebar.appendChild(button);
  });
  
  // Reset to first metric
  currentEvalMetric = metrics[0].key;
}

// Handle evaluation metric button clicks
function handleEvalMetricClick(evalMetric) {
  currentEvalMetric = evalMetric;
  
  // Update button states
  const buttons = document.querySelectorAll('.metric-button');
  buttons.forEach(btn => {
    if (btn.dataset.evalMetric === evalMetric) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Show the chart for current dataset and eval metric
  showChartForDatasetAndMetric(currentDataset, evalMetric);
}

// Show specific chart based on dataset and eval metric
function showChartForDatasetAndMetric(dataset, evalMetric) {
  const allCharts = document.querySelectorAll('.metric-chart');
  
  // Hide all charts
  allCharts.forEach(chart => {
    chart.classList.remove('active');
    chart.style.setProperty('position', 'absolute', 'important');
    chart.style.setProperty('opacity', '0', 'important');
    chart.style.setProperty('pointer-events', 'none', 'important');
  });
  
  // Show the target chart
  const targetChart = document.querySelector(`.metric-chart[data-metric="${dataset}"][data-eval-metric="${evalMetric}"]`);
  if (targetChart) {
    targetChart.style.transition = 'none';
    targetChart.classList.add('active');
    targetChart.style.setProperty('opacity', '1', 'important');
    targetChart.style.setProperty('pointer-events', 'auto', 'important');
    targetChart.style.setProperty('position', 'relative', 'important');
    
    setTimeout(() => {
      targetChart.style.transition = '';
    }, 50);
    
    // Initialize chart if needed
    if (dataset === 'piqa' && evalMetric === 'invalid_percentage' && !piqaInvalidPercentageChart) {
      initializePIQAInvalidPercentageChart();
    }
    if (dataset === 'overcooked' && evalMetric === 'macro_precision' && !overcookedMacroPrecisionChart) {
      initializeOvercookedMacroPrecisionChart();
    }
    if (dataset === 'overcooked' && evalMetric === 'macro_recall' && !overcookedMacroRecallChart) {
      initializeOvercookedMacroRecallChart();
    }
    if (dataset === 'overcooked' && evalMetric === 'macro_f1' && !overcookedMacroF1Chart) {
      initializeOvercookedMacroF1Chart();
    }
    if (dataset === 'overcooked' && evalMetric === 'percentage_invalids' && !overcookedPercentageInvalidsChart) {
      initializeOvercookedPercentageInvalidsChart();
    }
    if (dataset === 'sqa3d' && evalMetric === 'avg_similarity_score' && !sqa3dAvgSimilarityScoreChart) {
      initializeSQA3DAvgSimilarityScoreChart();
    }
    if (dataset === 'sqa3d' && evalMetric === 'high_similarity_percentage' && !sqa3dHighSimilarityPercentageChart) {
      initializeSQA3DHighSimilarityPercentageChart();
    }
    if (dataset === 'robotvqa' && evalMetric === 'avg_similarity_score' && !robotvqaAvgSimilarityScoreChart) {
      initializeRobotVQAAvgSimilarityScoreChart();
    }
    if (dataset === 'robotvqa' && evalMetric === 'high_similarity_percentage' && !robotvqaHighSimilarityPercentageChart) {
      initializeRobotVQAHighSimilarityPercentageChart();
    }
    if (dataset === 'bfclv3' && evalMetric === 'invalid_turn_percentage' && !bfclv3InvalidTurnPercentageChart) {
      initializeBFCLv3InvalidTurnPercentageChart();
    }
    if (dataset === 'bfclv3' && evalMetric === 'invalid_conversation_percentage' && !bfclv3InvalidConversationPercentageChart) {
      initializeBFCLv3InvalidConversationPercentageChart();
    }
    if (dataset === 'bfclv3' && evalMetric === 'avg_valid_predicted_functions_per_sample' && !bfclv3AvgValidPredictedFunctionsPerSampleChart) {
      initializeBFCLv3AvgValidPredictedFunctionsPerSampleChart();
    }
    if (dataset === 'bfclv3' && evalMetric === 'high_similarity_percentage' && !bfclv3HighSimilarityPercentageChart) {
      initializeBFCLv3HighSimilarityPercentageChart();
    }
    if (dataset === 'openx' && evalMetric === 'action_success_rate' && !openxActionSuccessRateChart) {
      initializeOpenXActionSuccessRateChart();
    }
    if (dataset === 'openx' && evalMetric === 'invalid_predictions_percentage' && !openxInvalidPredictionsPercentageChart) {
      initializeOpenXInvalidPredictionsPercentageChart();
    }
    if (dataset === 'openx' && evalMetric === 'total_dataset_amae' && !openxMeanAbsoluteErrorChart) {
      initializeOpenXMeanAbsoluteErrorChart();
    }
    if (dataset === 'openx' && evalMetric === 'normalized_amae' && !openxNormalizedMaeChart) {
      initializeOpenXNormalizedMaeChart();
    }
    if (dataset === 'openx' && evalMetric === 'normalized_quantile_filtered_amae' && !openxNormalizedQuantileFilteredMaeChart) {
      initializeOpenXNormalizedQuantileFilteredMaeChart();
    }
    if (dataset === 'odinw') {
      if (evalMetric === 'exact_match' && !odinwPart1Chart) {
        initializeODinWPart1Chart();
        initializeODinWPart2Chart();
      } else if (evalMetric === 'macro_precision' && !odinwMacroPrecisionPart1Chart) {
        initializeODinWMacroPrecisionPart1Chart();
        initializeODinWMacroPrecisionPart2Chart();
      } else if (evalMetric === 'macro_recall' && !odinwMacroRecallPart1Chart) {
        initializeODinWMacroRecallPart1Chart();
        initializeODinWMacroRecallPart2Chart();
      } else if (evalMetric === 'macro_f1' && !odinwMacroF1Part1Chart) {
        initializeODinWMacroF1Part1Chart();
        initializeODinWMacroF1Part2Chart();
      } else if (evalMetric === 'invalid_percentage' && !odinwInvalidPercentagePart1Chart) {
        initializeODinWInvalidPercentagePart1Chart();
        initializeODinWInvalidPercentagePart2Chart();
      }
    }
  }
}

// Handle dataset dropdown change in Results section
function initializeDatasetSelector() {
  const datasetSelector = document.getElementById('dataset-selector');
  const metricCharts = document.querySelectorAll('.metric-chart');
  const metricsContainer = document.querySelector('.metrics-container');

  if (!datasetSelector) {
    return;
  }

  datasetSelector.addEventListener('change', (e) => {
    const selectedDataset = e.target.value;
    currentDataset = selectedDataset;
    
    // Toggle expanded class for ODinW dataset
    if (metricsContainer) {
      if (selectedDataset === 'odinw') {
        metricsContainer.classList.add('expanded');
      } else {
        metricsContainer.classList.remove('expanded');
      }
    }
    
    // Update the metric buttons for this dataset
    updateEvalMetricButtons(selectedDataset);
    
    // Show the first metric's chart for this dataset
    showChartForDatasetAndMetric(selectedDataset, currentEvalMetric);
    
    // Initialize charts as needed
    if (selectedDataset === 'sqa3d' && !sqa3dChart) {
      initializeSQA3DChart();
    }
    
    if (selectedDataset === 'overcooked' && !overcookedChart) {
      initializeOvercookedChart();
    }
    
    if (selectedDataset === 'robotvqa' && !robotvqaChart) {
      initializeRobotVQAChart();
    }
    
    if (selectedDataset === 'bfclv3' && !bfclv3InvalidTurnPercentageChart) {
      initializeBFCLv3InvalidTurnPercentageChart();
    }
    
    if (selectedDataset === 'openx' && !openxActionSuccessRateChart) {
      initializeOpenXActionSuccessRateChart();
    }
    if (selectedDataset === 'openx' && !openxInvalidPredictionsPercentageChart) {
      initializeOpenXInvalidPredictionsPercentageChart();
    }
    if (selectedDataset === 'openx' && !openxMeanAbsoluteErrorChart) {
      initializeOpenXMeanAbsoluteErrorChart();
    }
    if (selectedDataset === 'openx' && !openxNormalizedMaeChart) {
      initializeOpenXNormalizedMaeChart();
    }
    if (selectedDataset === 'openx' && !openxNormalizedQuantileFilteredMaeChart) {
      initializeOpenXNormalizedQuantileFilteredMaeChart();
    }
    
    if (selectedDataset === 'odinw') {
      // Initialize the first metric's charts (exact_match by default)
      if (currentEvalMetric === 'exact_match' && !odinwPart1Chart) {
        initializeODinWPart1Chart();
        initializeODinWPart2Chart();
      }
    }
  });
}

function initializePIQAChart() {
  // Only initialize if we're on the Multinetv1 page and the PIQA chart canvas exists
  const chartCanvas = document.getElementById('piqa-exact-match-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_piqa_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderPIQAChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading PIQA metrics:', error);
      // Add visual feedback for users
      const chartContainer = chartCanvas.parentElement;
      chartContainer.innerHTML = `<div class="notification is-danger">
        Error loading PIQA chart: ${error.message}
      </div>`;
    });
}

function renderPIQAChart(data, canvas) {
  const ctx = canvas.getContext('2d');
  
  // Extract exact match rates for each model
  const originalValues = v1Models.map(model => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.exact_match_rate) {
      console.warn(`No exact match rate data found for model ${model}`);
      return 0;
    }
    return modelData.exact_match_rate[0]; // Get the first (and only) value
  });
  
  // Calculate minimum visible value (1% of the max value, or 0.01 if max is very small)
  const dataMax = Math.max(...originalValues);
  const minVisibleValue = Math.max(0.01, dataMax * 0.01);
  
  // Create display values that ensure small values are visible
  const displayValues = originalValues.map(value => 
    value === 0 ? minVisibleValue : Math.max(value, minVisibleValue)
  );
  
  const chartData = {
    labels: v1Models.map(model => v1ModelDisplayNames[model]),
    datasets: [{
      label: 'Exact Match Rate',
      data: displayValues,
      originalData: originalValues, // Store original values for tooltips
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)',   // Blue for GPT-5
        'rgba(255, 99, 132, 0.7)',   // Red for Pi0
        'rgba(255, 206, 86, 0.7)'    // Yellow for Magma
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 206, 86, 1)'
      ],
      borderWidth: 2,
      borderRadius: 4,
      borderSkipped: false,
    }]
  };
  
  // Dynamic y-axis max: use 1.1x the max value, but cap at 1.0 (100%)
  const maxValue = getNiceMaxValue(dataMax, 1.0);
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: false // Hide legend since we only have one dataset
        },
        title: { 
          display: true,
          text: 'Exact Match Rate on PIQA Dataset',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${(originalValue * 100).toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Model',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Exact Match Rate',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return (value * 100).toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    // Destroy existing chart if it exists
    if (piqaChart) {
      piqaChart.destroy();
    }
    
    piqaChart = new Chart(ctx, chartConfig);
  } catch (error) {
    console.error('Error creating PIQA chart:', error);
  }
}

function initializePIQAInvalidPercentageChart() {
  const chartCanvas = document.getElementById('piqa-invalid-percentage-chart');
  if (!chartCanvas) {
    return;
  }
  
  const chartDiv = chartCanvas.closest('.metric-chart');
  if (!chartDiv || !chartDiv.classList.contains('active')) {
    return;
  }
  
  fetch('../data/v1_piqa_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderPIQAInvalidPercentageChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading PIQA Invalid Percentage metrics:', error);
      const chartContainer = chartCanvas.parentElement;
      chartContainer.innerHTML = `<div class="notification is-danger">
        Error loading PIQA Invalid Percentage chart: ${error.message}
      </div>`;
    });
}

function renderPIQAInvalidPercentageChart(data, canvas) {
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // Extract invalid percentage rates for each model
  const originalValues = v1Models.map(model => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.invalid_percentage) {
      console.warn(`No invalid percentage data found for model ${model}`);
      return null; // Use null for missing data
    }
    const value = modelData.invalid_percentage[0];
    return (value === null || value === undefined || isNaN(value)) ? null : value;
  });
  
  // Filter out null values for calculating dataMax and minVisibleValue
  const validValues = originalValues.filter(value => value !== null);
  const dataMax = validValues.length > 0 ? Math.max(...validValues) : 0;
  const minVisibleValue = Math.max(0.1, dataMax * 0.01);
  
  // Create display values that ensure small values are visible, but keep null as null
  const displayValues = originalValues.map(value => {
    if (value === null) {
      return null; // Keep null values as null (no bar will be displayed)
    } else if (value === 0) {
      return minVisibleValue;
    } else if (value < minVisibleValue) {
      return minVisibleValue * 1.5; // Make non-zero small values 50% bigger than minimum
    } else {
      return value;
    }
  });
  
  const chartData = {
    labels: v1Models.map(model => v1ModelDisplayNames[model]),
    datasets: [{
      label: 'Invalid Percentage',
      data: displayValues,
      originalData: originalValues, // Store original values for tooltips
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(255, 206, 86, 0.7)'
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 206, 86, 1)'
      ],
      borderWidth: 2,
      borderRadius: 4,
      borderSkipped: false,
    }]
  };
  
  // Dynamic y-axis max: use 1.1x the max value, but cap at 100
  const maxValue = getNiceMaxValue(dataMax, 100);
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: false
        },
        title: { 
          display: true,
          text: 'Invalid Percentage on PIQA Dataset',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${originalValue.toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Model',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Invalid Percentage',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return value.toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (piqaInvalidPercentageChart) {
      piqaInvalidPercentageChart.destroy();
    }
    piqaInvalidPercentageChart = new Chart(ctx, chartConfig);
  } catch (error) {
    console.error('Error creating PIQA Invalid Percentage chart:', error);
  }
}

function initializeSQA3DChart() {
  const chartCanvas = document.getElementById('sqa3d-exact-match-chart');
  if (!chartCanvas) {
    return;
  }
  
  // Check if the SQA3D chart div is active
  const sqa3dChartDiv = chartCanvas.closest('.metric-chart');
  if (!sqa3dChartDiv || !sqa3dChartDiv.classList.contains('active')) {
    return;
  }
  
  fetch('../data/v1_sqa3d_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderSQA3DChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading SQA3D metrics:', error);
      const chartContainer = chartCanvas.parentElement;
      chartContainer.innerHTML = `<div class="notification is-danger">
        Error loading SQA3D chart: ${error.message}
      </div>`;
    });
}

function renderSQA3DChart(data, canvas) {
  // Force the parent div to be visible before rendering
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // Extract exact match rates for each model
  const originalValues = v1Models.map(model => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.exact_match_rate) {
      console.warn(`No exact match rate data found for model ${model}`);
      return null; // Use null for missing data
    }
    const value = modelData.exact_match_rate[0];
    return (value === null || value === undefined || isNaN(value)) ? null : value;
  });
  
  // Filter out null values for calculating dataMax and minVisibleValue
  const validValues = originalValues.filter(value => value !== null);
  const dataMax = validValues.length > 0 ? Math.max(...validValues) : 0;
  const minVisibleValue = Math.max(0.01, dataMax * 0.01);
  
  // Create display values that ensure small values are visible, but keep null as null
  const displayValues = originalValues.map(value => {
    if (value === null) {
      return null; // Keep null values as null (no bar will be displayed)
    } else if (value === 0) {
      return minVisibleValue;
    } else if (value < minVisibleValue) {
      return minVisibleValue * 1.5; // Make non-zero small values 50% bigger than minimum
    } else {
      return value;
    }
  });
  
  const chartData = {
    labels: v1Models.map(model => v1ModelDisplayNames[model]),
    datasets: [{
      label: 'Exact Match Rate',
      data: displayValues,
      originalData: originalValues, // Store original values for tooltips
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)',   // Blue for GPT-5
        'rgba(255, 99, 132, 0.7)',   // Red for Pi0
        'rgba(255, 206, 86, 0.7)'    // Yellow for Magma
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 206, 86, 1)'
      ],
      borderWidth: 2,
      borderRadius: 4,
      borderSkipped: false,
    }]
  };
  
  // Dynamic y-axis max: use 1.1x the max value, but cap at 1.0 (100%)
  const maxValue = getNiceMaxValue(dataMax, 1.0);
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: false // Hide legend since we only have one dataset
        },
        title: { 
          display: true,
          text: 'Exact Match Rate on SQA3D Dataset',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${(originalValue * 100).toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Model',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Exact Match Rate',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return (value * 100).toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (sqa3dChart) {
      sqa3dChart.destroy();
    }
    sqa3dChart = new Chart(ctx, chartConfig);
  } catch (error) {
    console.error('Error creating SQA3D chart:', error);
  }
}

// SQA3D Average Similarity Score Chart Functions
function initializeSQA3DAvgSimilarityScoreChart() {
  const chartCanvas = document.getElementById('sqa3d-avg-similarity-score-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_sqa3d_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderSQA3DAvgSimilarityScoreChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading SQA3D average similarity score metrics:', error);
    });
}

function renderSQA3DAvgSimilarityScoreChart(data, canvas) {
  console.log('Rendering SQA3D Average Similarity Score chart with data:', data);
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // Create single dataset with model values
  const modelValues = [];
  
  v1Models.forEach((model, index) => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.avg_similarity_score) {
      console.warn(`No average similarity score data found for model ${model}`);
      modelValues.push(0);
      return;
    }
    
    // Use the first value from avg_similarity_score array (assuming it's the overall average)
    modelValues.push(modelData.avg_similarity_score[0]);
  });
  
  const colors = [
    'rgba(54, 162, 235, 0.7)',
    'rgba(255, 99, 132, 0.7)',
    'rgba(255, 206, 86, 0.7)'
  ];
  
  const borderColors = [
    'rgba(54, 162, 235, 1)',
    'rgba(255, 99, 132, 1)',
    'rgba(255, 206, 86, 1)'
  ];
  
  const datasets = [{
    label: 'Average Similarity Score',
    data: modelValues,
    backgroundColor: colors,
    borderColor: borderColors,
    borderWidth: 2,
    borderRadius: 4,
    borderSkipped: false
  }];
  
  const allValues = datasets.flatMap(d => d.data);
  const dataMax = Math.max(...allValues);
  const dataMin = Math.min(...allValues);
  
  const maxValue = Math.min(1.0, dataMax * 1.1); // Cap at 1.0 for similarity scores
  const minValue = Math.max(0.0, dataMin * 0.9); // Cap at 0.0 for similarity scores
  
  const chartData = {
    labels: v1Models.map(model => v1ModelDisplayNames[model]),
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    plugins: [],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: false
        },
        title: { 
          display: true,
          text: 'Average Similarity Score on SQA3D Dataset',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Model',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: false,
          min: 0.0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Average Similarity Score',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return value.toFixed(3);
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (sqa3dAvgSimilarityScoreChart) {
      sqa3dAvgSimilarityScoreChart.destroy();
    }
    sqa3dAvgSimilarityScoreChart = new Chart(ctx, chartConfig);
    console.log('SQA3D Average Similarity Score chart created successfully');
  } catch (error) {
    console.error('Error creating SQA3D Average Similarity Score chart:', error);
  }
}

function initializeSQA3DHighSimilarityPercentageChart() {
  const chartCanvas = document.getElementById('sqa3d-high-similarity-percentage-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_sqa3d_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderSQA3DHighSimilarityPercentageChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading SQA3D high similarity percentage metrics:', error);
    });
}

function renderSQA3DHighSimilarityPercentageChart(data, canvas) {
  console.log('Rendering SQA3D High Similarity Percentage chart with data:', data);
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // Extract high similarity percentage rates for each model
  const originalValues = v1Models.map(model => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.high_similarity_percentage) {
      console.warn(`No high similarity percentage data found for model ${model}`);
      return null; // Use null for missing data
    }
    const value = modelData.high_similarity_percentage[0];
    return (value === null || value === undefined || isNaN(value)) ? null : value;
  });
  
  // Filter out null values for calculating dataMax and minVisibleValue
  const validValues = originalValues.filter(value => value !== null);
  const dataMax = validValues.length > 0 ? Math.max(...validValues) : 0;
  const minVisibleValue = Math.max(0.1, Math.min(1.0, dataMax * 0.01)); // Cap minVisibleValue at 1.0%
  
  // Create display values that ensure small values are visible, but keep null as null
  const displayValues = originalValues.map(value => {
    if (value === null) {
      return null; // Keep null values as null (no bar will be displayed)
    } else if (value === 0) {
      return minVisibleValue;
    } else if (value < minVisibleValue) {
      return minVisibleValue * 1.5; // Make non-zero small values 50% bigger than minimum
    } else {
      return value;
    }
  });
  
  const colors = [
    'rgba(54, 162, 235, 0.7)',
    'rgba(255, 99, 132, 0.7)',
    'rgba(255, 206, 86, 0.7)'
  ];
  
  const borderColors = [
    'rgba(54, 162, 235, 1)',
    'rgba(255, 99, 132, 1)',
    'rgba(255, 206, 86, 1)'
  ];
  
  const datasets = [{
    label: 'High Quality Predictions (%)',
    data: displayValues,
    originalData: originalValues, // Store original values for tooltips
    backgroundColor: colors,
    borderColor: borderColors,
    borderWidth: 2,
    borderRadius: 4,
    borderSkipped: false
  }];
  
  const maxValue = Math.min(100.0, getNiceMaxValue(dataMax, 100.0)); // Cap at 100% for percentages
  const minValue = Math.max(0.0, validValues.length > 0 ? Math.min(...validValues) * 0.9 : 0);
  
  const chartData = {
    labels: v1Models.map(model => v1ModelDisplayNames[model]),
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: false
        },
        title: { 
          display: true,
          text: 'High Quality Predictions (>.8 Similarity) on SQA3D Dataset',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${originalValue.toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Model',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: false,
          min: minValue,
          max: maxValue,
          title: { 
            display: true, 
            text: 'High Quality Predictions (%)',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return value.toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (sqa3dHighSimilarityPercentageChart) {
      sqa3dHighSimilarityPercentageChart.destroy();
    }
    sqa3dHighSimilarityPercentageChart = new Chart(ctx, chartConfig);
    console.log('SQA3D High Similarity Percentage chart created successfully');
  } catch (error) {
    console.error('Error creating SQA3D High Similarity Percentage chart:', error);
  }
}

function initializeOvercookedChart() {
  const chartCanvas = document.getElementById('overcooked-exact-match-chart');
  if (!chartCanvas) {
    return;
  }
  
  // Check if the Overcooked chart div is active
  const overcookedChartDiv = chartCanvas.closest('.metric-chart');
  if (!overcookedChartDiv || !overcookedChartDiv.classList.contains('active')) {
    return;
  }
  
  fetch('../data/v1_overcooked_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderOvercookedChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading Overcooked metrics:', error);
      const chartContainer = chartCanvas.parentElement;
      chartContainer.innerHTML = `<div class="notification is-danger">
        Error loading Overcooked chart: ${error.message}
      </div>`;
    });
}

function renderOvercookedChart(data, canvas) {
  // Force the parent div to be visible before rendering
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // Extract exact match rates for each model
  const originalValues = v1Models.map(model => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.exact_match_rate) {
      console.warn(`No exact match rate data found for model ${model}`);
      return null; // Use null for missing data
    }
    const value = modelData.exact_match_rate[0];
    return (value === null || value === undefined || isNaN(value)) ? null : value;
  });
  
  // Filter out null values for calculating dataMax and minVisibleValue
  const validValues = originalValues.filter(value => value !== null);
  const dataMax = validValues.length > 0 ? Math.max(...validValues) : 0;
  const maxValue = getNiceMaxValue(dataMax, 1.0);
  const minVisibleValue = Math.max(0.0005, maxValue * 0.01); // 1% of y-axis range, minimum 0.05%
  
  // Create display values that ensure small values are visible, but keep null as null
  const displayValues = originalValues.map(value => {
    if (value === null) {
      return null; // Keep null values as null (no bar will be displayed)
    } else if (value === 0) {
      return minVisibleValue;
    } else if (value < minVisibleValue) {
      return minVisibleValue * 1.5; // Make non-zero small values 50% bigger than minimum
    } else {
      return value;
    }
  });
  
  const chartData = {
    labels: v1Models.map(model => v1ModelDisplayNames[model]),
    datasets: [{
      label: 'Exact Match Rate',
      data: displayValues,
      originalData: originalValues, // Store original values for tooltips
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)',   // Blue for GPT-5
        'rgba(255, 99, 132, 0.7)',   // Red for Pi0
        'rgba(255, 206, 86, 0.7)'    // Yellow for Magma
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 206, 86, 1)'
      ],
      borderWidth: 2,
      borderRadius: 4,
      borderSkipped: false,
    }]
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: false // Hide legend since we only have one dataset
        },
        title: { 
          display: true,
          text: 'Exact Match Rate on Overcooked Dataset',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${(originalValue * 100).toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Model',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Exact Match Rate',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return (value * 100).toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (overcookedChart) {
      overcookedChart.destroy();
    }
    overcookedChart = new Chart(ctx, chartConfig);
  } catch (error) {
    console.error('Error creating Overcooked chart:', error);
  }
}

function initializeOvercookedMacroPrecisionChart() {
  const chartCanvas = document.getElementById('overcooked-macro-precision-chart');
  if (!chartCanvas) {
    return;
  }
  
  // Check if the Overcooked Macro Precision chart div is active
  const chartDiv = chartCanvas.closest('.metric-chart');
  if (!chartDiv || !chartDiv.classList.contains('active')) {
    return;
  }
  
  fetch('../data/v1_overcooked_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderOvercookedMacroPrecisionChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading Overcooked Macro Precision metrics:', error);
      const chartContainer = chartCanvas.parentElement;
      chartContainer.innerHTML = `<div class="notification is-danger">
        Error loading Overcooked Macro Precision chart: ${error.message}
      </div>`;
    });
}

function renderOvercookedMacroPrecisionChart(data, canvas) {
  // Force the parent div to be visible before rendering
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // Extract macro precision rates for each model
  const originalValues = v1Models.map(model => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.macro_precision) {
      console.warn(`No macro precision data found for model ${model}`);
      return null; // Use null for missing data
    }
    const value = modelData.macro_precision[0];
    return (value === null || value === undefined || isNaN(value)) ? null : value;
  });
  
  // Filter out null values for calculating dataMax and minVisibleValue
  const validValues = originalValues.filter(value => value !== null);
  const dataMax = validValues.length > 0 ? Math.max(...validValues) : 0;
  const maxValue = getNiceMaxValue(dataMax, 1.0);
  const minVisibleValue = Math.max(0.0005, maxValue * 0.01); // 1% of y-axis range, minimum 0.05%
  
  // Create display values that ensure small values are visible, but keep null as null
  const displayValues = originalValues.map(value => {
    if (value === null) {
      return null; // Keep null values as null (no bar will be displayed)
    } else if (value === 0) {
      return minVisibleValue;
    } else if (value < minVisibleValue) {
      return minVisibleValue * 1.5; // Make non-zero small values 50% bigger than minimum
    } else {
      return value;
    }
  });
  
  const chartData = {
    labels: v1Models.map(model => v1ModelDisplayNames[model]),
    datasets: [{
      label: 'Macro Precision',
      data: displayValues,
      originalData: originalValues, // Store original values for tooltips
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)',   // Blue for GPT-5
        'rgba(255, 99, 132, 0.7)',   // Red for Pi0
        'rgba(255, 206, 86, 0.7)'    // Yellow for Magma
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 206, 86, 1)'
      ],
      borderWidth: 2,
      borderRadius: 4,
      borderSkipped: false,
    }]
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: false // Hide legend since we only have one dataset
        },
        title: { 
          display: true,
          text: 'Macro Precision on Overcooked Dataset',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${(originalValue * 100).toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Model',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Macro Precision',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return (value * 100).toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (overcookedMacroPrecisionChart) {
      overcookedMacroPrecisionChart.destroy();
    }
    overcookedMacroPrecisionChart = new Chart(ctx, chartConfig);
  } catch (error) {
    console.error('Error creating Overcooked Macro Precision chart:', error);
  }
}

function initializeOvercookedMacroRecallChart() {
  const chartCanvas = document.getElementById('overcooked-macro-recall-chart');
  if (!chartCanvas) {
    return;
  }
  
  const chartDiv = chartCanvas.closest('.metric-chart');
  if (!chartDiv || !chartDiv.classList.contains('active')) {
    return;
  }
  
  fetch('../data/v1_overcooked_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderOvercookedMacroRecallChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading Overcooked Macro Recall metrics:', error);
      const chartContainer = chartCanvas.parentElement;
      chartContainer.innerHTML = `<div class="notification is-danger">
        Error loading Overcooked Macro Recall chart: ${error.message}
      </div>`;
    });
}

function renderOvercookedMacroRecallChart(data, canvas) {
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // Extract macro recall rates for each model
  const originalValues = v1Models.map(model => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.macro_recall) {
      console.warn(`No macro recall data found for model ${model}`);
      return null; // Use null for missing data
    }
    const value = modelData.macro_recall[0];
    return (value === null || value === undefined || isNaN(value)) ? null : value;
  });
  
  // Filter out null values for calculating dataMax and minVisibleValue
  const validValues = originalValues.filter(value => value !== null);
  const dataMax = validValues.length > 0 ? Math.max(...validValues) : 0;
  const maxValue = getNiceMaxValue(dataMax, 1.0);
  const minVisibleValue = Math.max(0.0005, maxValue * 0.01); // 1% of y-axis range, minimum 0.05%
  
  // Create display values that ensure small values are visible, but keep null as null
  const displayValues = originalValues.map(value => {
    if (value === null) {
      return null; // Keep null values as null (no bar will be displayed)
    } else if (value === 0) {
      return minVisibleValue;
    } else if (value < minVisibleValue) {
      return minVisibleValue * 1.5; // Make non-zero small values 50% bigger than minimum
    } else {
      return value;
    }
  });
  
  const chartData = {
    labels: v1Models.map(model => v1ModelDisplayNames[model]),
    datasets: [{
      label: 'Macro Recall',
      data: displayValues,
      originalData: originalValues, // Store original values for tooltips
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(255, 206, 86, 0.7)'
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 206, 86, 1)'
      ],
      borderWidth: 2,
      borderRadius: 4,
      borderSkipped: false,
    }]
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: false
        },
        title: { 
          display: true,
          text: 'Macro Recall on Overcooked Dataset',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${(originalValue * 100).toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Model',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Macro Recall',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return (value * 100).toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (overcookedMacroRecallChart) {
      overcookedMacroRecallChart.destroy();
    }
    overcookedMacroRecallChart = new Chart(ctx, chartConfig);
  } catch (error) {
    console.error('Error creating Overcooked Macro Recall chart:', error);
  }
}

function initializeOvercookedMacroF1Chart() {
  const chartCanvas = document.getElementById('overcooked-macro-f1-chart');
  if (!chartCanvas) {
    return;
  }
  
  const chartDiv = chartCanvas.closest('.metric-chart');
  if (!chartDiv || !chartDiv.classList.contains('active')) {
    return;
  }
  
  fetch('../data/v1_overcooked_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderOvercookedMacroF1Chart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading Overcooked Macro F1 metrics:', error);
      const chartContainer = chartCanvas.parentElement;
      chartContainer.innerHTML = `<div class="notification is-danger">
        Error loading Overcooked Macro F1 chart: ${error.message}
      </div>`;
    });
}

function renderOvercookedMacroF1Chart(data, canvas) {
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // Extract macro F1 rates for each model
  const originalValues = v1Models.map(model => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.macro_f1) {
      console.warn(`No macro f1 data found for model ${model}`);
      return null; // Use null for missing data
    }
    const value = modelData.macro_f1[0];
    return (value === null || value === undefined || isNaN(value)) ? null : value;
  });
  
  // Filter out null values for calculating dataMax and minVisibleValue
  const validValues = originalValues.filter(value => value !== null);
  const dataMax = validValues.length > 0 ? Math.max(...validValues) : 0;
  const maxValue = getNiceMaxValue(dataMax, 1.0);
  const minVisibleValue = Math.max(0.0005, maxValue * 0.01); // 1% of y-axis range, minimum 0.05%
  
  // Create display values that ensure small values are visible, but keep null as null
  const displayValues = originalValues.map(value => {
    if (value === null) {
      return null; // Keep null values as null (no bar will be displayed)
    } else if (value === 0) {
      return minVisibleValue;
    } else if (value < minVisibleValue) {
      return minVisibleValue * 1.5; // Make non-zero small values 50% bigger than minimum
    } else {
      return value;
    }
  });
  
  const chartData = {
    labels: v1Models.map(model => v1ModelDisplayNames[model]),
    datasets: [{
      label: 'Macro F1',
      data: displayValues,
      originalData: originalValues, // Store original values for tooltips
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(255, 206, 86, 0.7)'
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 206, 86, 1)'
      ],
      borderWidth: 2,
      borderRadius: 4,
      borderSkipped: false,
    }]
  };
  
  // Dynamic y-axis max: use 1.1x the max value, but cap at 1.0 (100%)
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: false
        },
        title: { 
          display: true,
          text: 'Macro F1 on Overcooked Dataset',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${(originalValue * 100).toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Model',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Macro F1',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return (value * 100).toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (overcookedMacroF1Chart) {
      overcookedMacroF1Chart.destroy();
    }
    overcookedMacroF1Chart = new Chart(ctx, chartConfig);
  } catch (error) {
    console.error('Error creating Overcooked Macro F1 chart:', error);
  }
}

function initializeOvercookedPercentageInvalidsChart() {
  const chartCanvas = document.getElementById('overcooked-percentage-invalids-chart');
  if (!chartCanvas) {
    return;
  }
  
  const chartDiv = chartCanvas.closest('.metric-chart');
  if (!chartDiv || !chartDiv.classList.contains('active')) {
    return;
  }
  
  fetch('../data/v1_overcooked_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderOvercookedPercentageInvalidsChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading Overcooked Percentage Invalids metrics:', error);
      const chartContainer = chartCanvas.parentElement;
      chartContainer.innerHTML = `<div class="notification is-danger">
        Error loading Overcooked Percentage Invalids chart: ${error.message}
      </div>`;
    });
}

function renderOvercookedPercentageInvalidsChart(data, canvas) {
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // Extract percentage invalids rates for each model
  const originalValues = v1Models.map(model => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.percentage_invalids) {
      console.warn(`No percentage invalids data found for model ${model}`);
      return null; // Use null for missing data
    }
    const value = modelData.percentage_invalids[0];
    return (value === null || value === undefined || isNaN(value)) ? null : value;
  });
  
  // Filter out null values for calculating dataMax and minVisibleValue
  const validValues = originalValues.filter(value => value !== null);
  const dataMax = validValues.length > 0 ? Math.max(...validValues) : 0;
  const maxValue = getNiceMaxValue(dataMax, 1.0);
  const minVisibleValue = Math.max(0.0005, maxValue * 0.01); // 1% of y-axis range, minimum 0.05%
  
  // Create display values that ensure small values are visible, but keep null as null
  const displayValues = originalValues.map(value => {
    if (value === null) {
      return null; // Keep null values as null (no bar will be displayed)
    } else if (value === 0) {
      return minVisibleValue;
    } else if (value < minVisibleValue) {
      return minVisibleValue * 1.5; // Make non-zero small values 50% bigger than minimum
    } else {
      return value;
    }
  });
  
  const chartData = {
    labels: v1Models.map(model => v1ModelDisplayNames[model]),
    datasets: [{
      label: 'Percentage Invalids',
      data: displayValues,
      originalData: originalValues, // Store original values for tooltips
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(255, 206, 86, 0.7)'
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 206, 86, 1)'
      ],
      borderWidth: 2,
      borderRadius: 4,
      borderSkipped: false,
    }]
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: false
        },
        title: { 
          display: true,
          text: 'Percentage Invalids on Overcooked Dataset',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${originalValue.toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Model',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: 100,
          title: { 
            display: true, 
            text: 'Percentage Invalids',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return value.toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (overcookedPercentageInvalidsChart) {
      overcookedPercentageInvalidsChart.destroy();
    }
    overcookedPercentageInvalidsChart = new Chart(ctx, chartConfig);
  } catch (error) {
    console.error('Error creating Overcooked Percentage Invalids chart:', error);
  }
}

function initializeRobotVQAChart() {
  const chartCanvas = document.getElementById('robotvqa-exact-match-chart');
  if (!chartCanvas) {
    return;
  }
  
  // Check if the Robot VQA chart div is active
  const robotvqaChartDiv = chartCanvas.closest('.metric-chart');
  if (!robotvqaChartDiv || !robotvqaChartDiv.classList.contains('active')) {
    return;
  }
  
  fetch('../data/v1_robotvqa_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderRobotVQAChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading Robot VQA metrics:', error);
      const chartContainer = chartCanvas.parentElement;
      chartContainer.innerHTML = `<div class="notification is-danger">
        Error loading Robot VQA chart: ${error.message}
      </div>`;
    });
}

function renderRobotVQAChart(data, canvas) {
  // Force the parent div to be visible before rendering
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // Extract exact match rates for each model
  const originalValues = v1Models.map(model => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.exact_match_rate) {
      console.warn(`No exact match rate data found for model ${model}`);
      return 0;
    }
    return modelData.exact_match_rate[0];
  });
  
  // Calculate minimum visible value (1% of the max value, or 0.01 if max is very small)
  const dataMax = Math.max(...originalValues);
  const minVisibleValue = Math.max(0.01, dataMax * 0.01);
  
  // Create display values that ensure small values are visible
  const displayValues = originalValues.map(value => 
    value === 0 ? minVisibleValue : Math.max(value, minVisibleValue)
  );
  
  const chartData = {
    labels: v1Models.map(model => v1ModelDisplayNames[model]),
    datasets: [{
      label: 'Exact Match Rate',
      data: displayValues,
      originalData: originalValues, // Store original values for tooltips
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)',   // Blue for GPT-5
        'rgba(255, 99, 132, 0.7)',   // Red for Pi0
        'rgba(255, 206, 86, 0.7)'    // Yellow for Magma
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 206, 86, 1)'
      ],
      borderWidth: 2,
      borderRadius: 4,
      borderSkipped: false,
    }]
  };
  
  // Dynamic y-axis max: use 1.1x the max value, but cap at 1.0 (100%)
  const maxValue = getNiceMaxValue(dataMax, 1.0);
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: false // Hide legend since we only have one dataset
        },
        title: { 
          display: true,
          text: 'Exact Match Rate on Robot VQA Dataset',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${(originalValue * 100).toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Model',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Exact Match Rate',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return (value * 100).toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (robotvqaChart) {
      robotvqaChart.destroy();
    }
    robotvqaChart = new Chart(ctx, chartConfig);
  } catch (error) {
    console.error('Error creating Robot VQA chart:', error);
  }
}

// Robot VQA Average Similarity Score Chart Functions
function initializeRobotVQAAvgSimilarityScoreChart() {
  const chartCanvas = document.getElementById('robotvqa-avg-similarity-score-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_robotvqa_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderRobotVQAAvgSimilarityScoreChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading Robot VQA average similarity score metrics:', error);
    });
}

function renderRobotVQAAvgSimilarityScoreChart(data, canvas) {
  console.log('Rendering Robot VQA Average Similarity Score chart with data:', data);
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // Create single dataset with model values
  const originalValues = [];
  
  v1Models.forEach((model, index) => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.avg_similarity_score) {
      console.warn(`No average similarity score data found for model ${model}`);
      originalValues.push(0);
      return;
    }
    
    // Use the first value from avg_similarity_score array (assuming it's the overall average)
    originalValues.push(modelData.avg_similarity_score[0]);
  });
  
  // Calculate minimum visible value (1% of the max value, or 0.01 if max is very small)
  const dataMax = Math.max(...originalValues);
  const minVisibleValue = Math.max(0.01, dataMax * 0.01);
  
  // Create display values that ensure small values are visible
  const displayValues = originalValues.map(value => 
    value === 0 ? minVisibleValue : Math.max(value, minVisibleValue)
  );
  
  const colors = [
    'rgba(54, 162, 235, 0.7)',
    'rgba(255, 99, 132, 0.7)',
    'rgba(255, 206, 86, 0.7)'
  ];
  
  const borderColors = [
    'rgba(54, 162, 235, 1)',
    'rgba(255, 99, 132, 1)',
    'rgba(255, 206, 86, 1)'
  ];
  
  const datasets = [{
    label: 'Average Similarity Score',
    data: displayValues,
    originalData: originalValues, // Store original values for tooltips
    backgroundColor: colors,
    borderColor: borderColors,
    borderWidth: 2,
    borderRadius: 4,
    borderSkipped: false
  }];
  
  const maxValue = Math.min(1.0, dataMax * 1.1); // Cap at 1.0 for similarity scores
  const minValue = Math.max(0.0, Math.min(...originalValues) * 0.9); // Cap at 0.0 for similarity scores
  
  const chartData = {
    labels: v1Models.map(model => v1ModelDisplayNames[model]),
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    plugins: [],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: false
        },
        title: { 
          display: true,
          text: 'Average Similarity Score on Robot VQA Dataset',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${originalValue.toFixed(3)}`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Model',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: false,
          min: 0.0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Average Similarity Score',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return value.toFixed(3);
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (robotvqaAvgSimilarityScoreChart) {
      robotvqaAvgSimilarityScoreChart.destroy();
    }
    robotvqaAvgSimilarityScoreChart = new Chart(ctx, chartConfig);
    console.log('Robot VQA Average Similarity Score chart created successfully');
  } catch (error) {
    console.error('Error creating Robot VQA Average Similarity Score chart:', error);
  }
}

function initializeRobotVQAHighSimilarityPercentageChart() {
  const chartCanvas = document.getElementById('robotvqa-high-similarity-percentage-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_robotvqa_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderRobotVQAHighSimilarityPercentageChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading Robot VQA high similarity percentage metrics:', error);
    });
}

function renderRobotVQAHighSimilarityPercentageChart(data, canvas) {
  console.log('Rendering Robot VQA High Similarity Percentage chart with data:', data);
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // Create single dataset with model values
  const originalValues = [];
  
  v1Models.forEach((model, index) => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.high_similarity_percentage) {
      console.warn(`No high similarity percentage data found for model ${model}`);
      originalValues.push(0);
      return;
    }
    
    // Use the first value from high_similarity_percentage array (assuming it's the overall percentage)
    originalValues.push(modelData.high_similarity_percentage[0]);
  });
  
  // Calculate minimum visible value (1% of the max value, or 0.1 if max is very small)
  const dataMax = Math.max(...originalValues);
  const minVisibleValue = Math.max(0.1, dataMax * 0.01);
  
  // Create display values that ensure small values are visible
  const displayValues = originalValues.map(value => {
    if (value === 0) {
      return minVisibleValue;
    } else if (value < minVisibleValue) {
      return minVisibleValue * 1.5; // Make non-zero small values 50% bigger than minimum
    } else {
      return value;
    }
  });
  
  const colors = [
    'rgba(54, 162, 235, 0.7)',
    'rgba(255, 99, 132, 0.7)',
    'rgba(255, 206, 86, 0.7)'
  ];
  
  const borderColors = [
    'rgba(54, 162, 235, 1)',
    'rgba(255, 99, 132, 1)',
    'rgba(255, 206, 86, 1)'
  ];
  
  const datasets = [{
    label: 'High Quality Predictions (%)',
    data: displayValues,
    originalData: originalValues, // Store original values for tooltips
    backgroundColor: colors,
    borderColor: borderColors,
    borderWidth: 2,
    borderRadius: 4,
    borderSkipped: false
  }];
  
  const maxValue = Math.min(100.0, getNiceMaxValue(dataMax, 100.0)); // Cap at 100% for percentages
  const minValue = Math.max(0.0, Math.min(...originalValues) * 0.9);
  
  const chartData = {
    labels: v1Models.map(model => v1ModelDisplayNames[model]),
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: false
        },
        title: { 
          display: true,
          text: 'High Quality Predictions (>.8 Similarity) on Robot VQA Dataset',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${originalValue.toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Model',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: false,
          min: minValue,
          max: maxValue,
          title: { 
            display: true, 
            text: 'High Quality Predictions (%)',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return value.toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (robotvqaHighSimilarityPercentageChart) {
      robotvqaHighSimilarityPercentageChart.destroy();
    }
    robotvqaHighSimilarityPercentageChart = new Chart(ctx, chartConfig);
    console.log('Robot VQA High Similarity Percentage chart created successfully');
  } catch (error) {
    console.error('Error creating Robot VQA High Similarity Percentage chart:', error);
  }
}

function initializeODinWPart1Chart() {
  console.log('Initializing ODinW Part 1 chart...');
  const chartCanvas = document.getElementById('odinw-exact-match-part1-chart');
  if (!chartCanvas) {
    console.error('ODinW Part 1 canvas not found!');
    return;
  }
  console.log('ODinW Part 1 canvas found:', chartCanvas);
  
  fetch('../data/v1_odinw_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderODinWPart1Chart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading ODinW Part 1 metrics:', error);
      const chartContainer = chartCanvas.parentElement;
      chartContainer.innerHTML = `<div class="notification is-danger">
        Error loading ODinW Part 1 chart: ${error.message}
      </div>`;
    });
}

function initializeODinWPart2Chart() {
  console.log('Initializing ODinW Part 2 chart...');
  const chartCanvas = document.getElementById('odinw-exact-match-part2-chart');
  if (!chartCanvas) {
    console.error('ODinW Part 2 canvas not found!');
    return;
  }
  console.log('ODinW Part 2 canvas found:', chartCanvas);
  
  fetch('../data/v1_odinw_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderODinWPart2Chart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading ODinW Part 2 metrics:', error);
      const chartContainer = chartCanvas.parentElement;
      chartContainer.innerHTML = `<div class="notification is-danger">
        Error loading ODinW Part 2 chart: ${error.message}
      </div>`;
    });
}

function renderODinWPart1Chart(data, canvas) {
  console.log('Rendering ODinW Part 1 chart with data:', data);
  // Force the parent div to be visible before rendering
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // Get dataset names (they should be the same across all models) - first 12 only
  const allDatasetNames = data.gpt5.dataset_name;
  const datasetNames = allDatasetNames.slice(0, 12);
  
  // Create datasets for each model - first 12 only
  const datasets = v1Models.map((model, index) => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.exact_match_rate) {
      console.warn(`No exact match rate data found for model ${model}`);
      return null;
    }
    
    const originalValues = modelData.exact_match_rate.slice(0, 12);
    
    // Calculate minimum visible value for this model's data
    const dataMax = Math.max(...originalValues);
    const minVisibleValue = Math.max(0.01, dataMax * 0.01);
    
    // Create display values that ensure small values are visible
    const displayValues = originalValues.map(value => 
      value === 0 ? minVisibleValue : Math.max(value, minVisibleValue)
    );
    
    const colors = [
      'rgba(54, 162, 235, 0.7)',   // Blue for GPT-5
      'rgba(255, 99, 132, 0.7)',   // Red for Pi0
      'rgba(255, 206, 86, 0.7)'    // Yellow for Magma
    ];
    
    const borderColors = [
      'rgba(54, 162, 235, 1)',
      'rgba(255, 99, 132, 1)',
      'rgba(255, 206, 86, 1)'
    ];
    
    return {
        label: v1ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        categoryPercentage: 0.4, 
        barPercentage: 0.7      
    };
  }).filter(d => d !== null);
  
  // Calculate dynamic y-axis max using original values
  const allOriginalValues = datasets.flatMap(d => d.originalData);
  const dataMax = Math.max(...allOriginalValues);
  const maxValue = getNiceMaxValue(dataMax, 1.0);
  
  const chartData = {
    labels: datasetNames,
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: true,
          position: 'top'
        },
        title: { 
          display: true,
          text: 'Exact Match Rate on ODinW Sub-Datasets (Part 1 of 2)',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${(originalValue * 100).toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Sub-Dataset',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 10
            },
            maxRotation: 90,
            minRotation: 45
          },
          grid: {
            display: false
          },
          categoryPercentage: 0.2,  // Space between groups of bars (even thinner with more spacing)
          barPercentage: 0.6        // Space between bars within a group
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Exact Match Rate',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return (value * 100).toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (odinwPart1Chart) {
      odinwPart1Chart.destroy();
    }
    odinwPart1Chart = new Chart(ctx, chartConfig);
    console.log('ODinW Part 1 chart created successfully');
  } catch (error) {
    console.error('Error creating ODinW Part 1 chart:', error);
  }
}

function renderODinWPart2Chart(data, canvas) {
  console.log('Rendering ODinW Part 2 chart with data:', data);
  // Force the parent div to be visible before rendering
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // Get dataset names (they should be the same across all models) - last 12 only
  const allDatasetNames = data.gpt5.dataset_name;
  const datasetNames = allDatasetNames.slice(12, 24);
  
  // Create datasets for each model - last 12 only
  const datasets = v1Models.map((model, index) => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.exact_match_rate) {
      console.warn(`No exact match rate data found for model ${model}`);
      return null;
    }
    
    const originalValues = modelData.exact_match_rate.slice(12, 24);
    
    // Calculate minimum visible value for this model's data
    const dataMax = Math.max(...originalValues);
    const minVisibleValue = Math.max(0.01, dataMax * 0.01);
    
    // Create display values that ensure small values are visible
    const displayValues = originalValues.map(value => 
      value === 0 ? minVisibleValue : Math.max(value, minVisibleValue)
    );
    
    const colors = [
      'rgba(54, 162, 235, 0.7)',   // Blue for GPT-5
      'rgba(255, 99, 132, 0.7)',   // Red for Pi0
      'rgba(255, 206, 86, 0.7)'    // Yellow for Magma
    ];
    
    const borderColors = [
      'rgba(54, 162, 235, 1)',
      'rgba(255, 99, 132, 1)',
      'rgba(255, 206, 86, 1)'
    ];
    
    return {
        label: v1ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        categoryPercentage: 0.4, 
        barPercentage: 0.7         
    };
  }).filter(d => d !== null);
  
  // Calculate dynamic y-axis max using original values
  const allOriginalValues = datasets.flatMap(d => d.originalData);
  const dataMax = Math.max(...allOriginalValues);
  const maxValue = getNiceMaxValue(dataMax, 1.0);
  
  const chartData = {
    labels: datasetNames,
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: true,
          position: 'top'
        },
        title: { 
          display: true,
          text: 'Exact Match Rate on ODinW Sub-Datasets (Part 2 of 2)',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${(originalValue * 100).toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Sub-Dataset',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 10
            },
            maxRotation: 90,
            minRotation: 45
          },
          grid: {
            display: false
          },
          categoryPercentage: 0.2,  // Space between groups of bars (even thinner with more spacing)
          barPercentage: 0.6        // Space between bars within a group
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Exact Match Rate',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return (value * 100).toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (odinwPart2Chart) {
      odinwPart2Chart.destroy();
    }
    odinwPart2Chart = new Chart(ctx, chartConfig);
    console.log('ODinW Part 2 chart created successfully');
  } catch (error) {
    console.error('Error creating ODinW Part 2 chart:', error);
  }
}

// ODinW Macro Precision Chart Functions
function initializeODinWMacroPrecisionPart1Chart() {
  const chartCanvas = document.getElementById('odinw-macro-precision-part1-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_odinw_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderODinWMacroPrecisionPart1Chart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading ODinW macro precision metrics:', error);
    });
}

function initializeODinWMacroPrecisionPart2Chart() {
  const chartCanvas = document.getElementById('odinw-macro-precision-part2-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_odinw_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderODinWMacroPrecisionPart2Chart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading ODinW macro precision metrics:', error);
    });
}

function renderODinWMacroPrecisionPart1Chart(data, canvas) {
  console.log('Rendering ODinW Macro Precision Part 1 chart with data:', data);
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  const allDatasetNames = data.gpt5.dataset_name;
  const datasetNames = allDatasetNames.slice(0, 12);
  
  const datasets = v1Models.map((model, index) => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.macro_precision) {
      console.warn(`No macro precision data found for model ${model}`);
      return null;
    }
    
    const originalValues = modelData.macro_precision.slice(0, 12);
    
    // Calculate minimum visible value for this model's data
    const dataMax = Math.max(...originalValues);
    const minVisibleValue = Math.max(0.01, dataMax * 0.01);
    
    // Create display values that ensure small values are visible
    const displayValues = originalValues.map(value => 
      value === 0 ? minVisibleValue : Math.max(value, minVisibleValue)
    );
    
    const colors = [
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 99, 132, 0.7)',
      'rgba(255, 206, 86, 0.7)'
    ];
    
    const borderColors = [
      'rgba(54, 162, 235, 1)',
      'rgba(255, 99, 132, 1)',
      'rgba(255, 206, 86, 1)'
    ];
    
    return {
        label: v1ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        categoryPercentage: 0.4, 
        barPercentage: 0.7      
    };
  }).filter(d => d !== null);
  
  // Calculate dynamic y-axis max using original values
  const allOriginalValues = datasets.flatMap(d => d.originalData);
  const dataMax = Math.max(...allOriginalValues);
  const maxValue = getNiceMaxValue(dataMax, 1.0);
  
  const chartData = {
    labels: datasetNames,
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: true,
          position: 'top'
        },
        title: { 
          display: true,
          text: 'Macro Precision on ODinW Sub-Datasets (Part 1 of 2)',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${(originalValue * 100).toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Sub-Dataset',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 10
            },
            maxRotation: 90,
            minRotation: 45
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Macro Precision',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return (value * 100).toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (odinwMacroPrecisionPart1Chart) {
      odinwMacroPrecisionPart1Chart.destroy();
    }
    odinwMacroPrecisionPart1Chart = new Chart(ctx, chartConfig);
    console.log('ODinW Macro Precision Part 1 chart created successfully');
  } catch (error) {
    console.error('Error creating ODinW Macro Precision Part 1 chart:', error);
  }
}

function renderODinWMacroPrecisionPart2Chart(data, canvas) {
  console.log('Rendering ODinW Macro Precision Part 2 chart with data:', data);
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  const allDatasetNames = data.gpt5.dataset_name;
  const datasetNames = allDatasetNames.slice(12, 24);
  
  const datasets = v1Models.map((model, index) => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.macro_precision) {
      console.warn(`No macro precision data found for model ${model}`);
      return null;
    }
    
    const originalValues = modelData.macro_precision.slice(12, 24);
    
    // Calculate minimum visible value for this model's data
    const dataMax = Math.max(...originalValues);
    const minVisibleValue = Math.max(0.01, dataMax * 0.01);
    
    // Create display values that ensure small values are visible
    const displayValues = originalValues.map(value => 
      value === 0 ? minVisibleValue : Math.max(value, minVisibleValue)
    );
    
    const colors = [
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 99, 132, 0.7)',
      'rgba(255, 206, 86, 0.7)'
    ];
    
    const borderColors = [
      'rgba(54, 162, 235, 1)',
      'rgba(255, 99, 132, 1)',
      'rgba(255, 206, 86, 1)'
    ];
    
    return {
        label: v1ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        categoryPercentage: 0.4, 
        barPercentage: 0.7         
    };
  }).filter(d => d !== null);
  
  // Calculate dynamic y-axis max using original values
  const allOriginalValues = datasets.flatMap(d => d.originalData);
  const dataMax = Math.max(...allOriginalValues);
  const maxValue = getNiceMaxValue(dataMax, 1.0);
  
  const chartData = {
    labels: datasetNames,
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: true,
          position: 'top'
        },
        title: { 
          display: true,
          text: 'Macro Precision on ODinW Sub-Datasets (Part 2 of 2)',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${(originalValue * 100).toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Sub-Dataset',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 10
            },
            maxRotation: 90,
            minRotation: 45
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Macro Precision',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return (value * 100).toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (odinwMacroPrecisionPart2Chart) {
      odinwMacroPrecisionPart2Chart.destroy();
    }
    odinwMacroPrecisionPart2Chart = new Chart(ctx, chartConfig);
    console.log('ODinW Macro Precision Part 2 chart created successfully');
  } catch (error) {
    console.error('Error creating ODinW Macro Precision Part 2 chart:', error);
  }
}

// ODinW Macro Recall Chart Functions
function initializeODinWMacroRecallPart1Chart() {
  const chartCanvas = document.getElementById('odinw-macro-recall-part1-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_odinw_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderODinWMacroRecallPart1Chart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading ODinW macro recall metrics:', error);
    });
}

function initializeODinWMacroRecallPart2Chart() {
  const chartCanvas = document.getElementById('odinw-macro-recall-part2-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_odinw_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderODinWMacroRecallPart2Chart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading ODinW macro recall metrics:', error);
    });
}

function renderODinWMacroRecallPart1Chart(data, canvas) {
  console.log('Rendering ODinW Macro Recall Part 1 chart with data:', data);
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  const allDatasetNames = data.gpt5.dataset_name;
  const datasetNames = allDatasetNames.slice(0, 12);
  
  const datasets = v1Models.map((model, index) => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.macro_recall) {
      console.warn(`No macro recall data found for model ${model}`);
      return null;
    }
    
    const originalValues = modelData.macro_recall.slice(0, 12);
    
    // Calculate minimum visible value for this model's data
    const dataMax = Math.max(...originalValues);
    const minVisibleValue = Math.max(0.01, dataMax * 0.01);
    
    // Create display values that ensure small values are visible
    const displayValues = originalValues.map(value => 
      value === 0 ? minVisibleValue : Math.max(value, minVisibleValue)
    );
    
    const colors = [
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 99, 132, 0.7)',
      'rgba(255, 206, 86, 0.7)'
    ];
    
    const borderColors = [
      'rgba(54, 162, 235, 1)',
      'rgba(255, 99, 132, 1)',
      'rgba(255, 206, 86, 1)'
    ];
    
    return {
        label: v1ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        categoryPercentage: 0.4, 
        barPercentage: 0.7      
    };
  }).filter(d => d !== null);
  
  // Calculate dynamic y-axis max using original values
  const allOriginalValues = datasets.flatMap(d => d.originalData);
  const dataMax = Math.max(...allOriginalValues);
  const maxValue = getNiceMaxValue(dataMax, 1.0);
  
  const chartData = {
    labels: datasetNames,
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: true,
          position: 'top'
        },
        title: { 
          display: true,
          text: 'Macro Recall on ODinW Sub-Datasets (Part 1 of 2)',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${(originalValue * 100).toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Sub-Dataset',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 10
            },
            maxRotation: 90,
            minRotation: 45
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Macro Recall',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return (value * 100).toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (odinwMacroRecallPart1Chart) {
      odinwMacroRecallPart1Chart.destroy();
    }
    odinwMacroRecallPart1Chart = new Chart(ctx, chartConfig);
    console.log('ODinW Macro Recall Part 1 chart created successfully');
  } catch (error) {
    console.error('Error creating ODinW Macro Recall Part 1 chart:', error);
  }
}

function renderODinWMacroRecallPart2Chart(data, canvas) {
  console.log('Rendering ODinW Macro Recall Part 2 chart with data:', data);
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  const allDatasetNames = data.gpt5.dataset_name;
  const datasetNames = allDatasetNames.slice(12, 24);
  
  const datasets = v1Models.map((model, index) => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.macro_recall) {
      console.warn(`No macro recall data found for model ${model}`);
      return null;
    }
    
    const originalValues = modelData.macro_recall.slice(12, 24);
    
    // Calculate minimum visible value for this model's data
    const dataMax = Math.max(...originalValues);
    const minVisibleValue = Math.max(0.01, dataMax * 0.01);
    
    // Create display values that ensure small values are visible
    const displayValues = originalValues.map(value => 
      value === 0 ? minVisibleValue : Math.max(value, minVisibleValue)
    );
    
    const colors = [
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 99, 132, 0.7)',
      'rgba(255, 206, 86, 0.7)'
    ];
    
    const borderColors = [
      'rgba(54, 162, 235, 1)',
      'rgba(255, 99, 132, 1)',
      'rgba(255, 206, 86, 1)'
    ];
    
    return {
        label: v1ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        categoryPercentage: 0.4, 
        barPercentage: 0.7         
    };
  }).filter(d => d !== null);
  
  // Calculate dynamic y-axis max using original values
  const allOriginalValues = datasets.flatMap(d => d.originalData);
  const dataMax = Math.max(...allOriginalValues);
  const maxValue = getNiceMaxValue(dataMax, 1.0);
  
  const chartData = {
    labels: datasetNames,
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: true,
          position: 'top'
        },
        title: { 
          display: true,
          text: 'Macro Recall on ODinW Sub-Datasets (Part 2 of 2)',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${(originalValue * 100).toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Sub-Dataset',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 10
            },
            maxRotation: 90,
            minRotation: 45
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Macro Recall',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return (value * 100).toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (odinwMacroRecallPart2Chart) {
      odinwMacroRecallPart2Chart.destroy();
    }
    odinwMacroRecallPart2Chart = new Chart(ctx, chartConfig);
    console.log('ODinW Macro Recall Part 2 chart created successfully');
  } catch (error) {
    console.error('Error creating ODinW Macro Recall Part 2 chart:', error);
  }
}

// ODinW Macro F1 Chart Functions
function initializeODinWMacroF1Part1Chart() {
  const chartCanvas = document.getElementById('odinw-macro-f1-part1-chart');
  if (!chartCanvas) return;
  
  fetch('../data/v1_odinw_metrics.json')
    .then(response => response.ok ? response.json() : Promise.reject(new Error(`HTTP error! status: ${response.status}`)))
    .then(data => renderODinWMacroF1Part1Chart(data, chartCanvas))
    .catch(error => console.error('Error loading ODinW macro f1 metrics:', error));
}

function initializeODinWMacroF1Part2Chart() {
  const chartCanvas = document.getElementById('odinw-macro-f1-part2-chart');
  if (!chartCanvas) return;
  
  fetch('../data/v1_odinw_metrics.json')
    .then(response => response.ok ? response.json() : Promise.reject(new Error(`HTTP error! status: ${response.status}`)))
    .then(data => renderODinWMacroF1Part2Chart(data, chartCanvas))
    .catch(error => console.error('Error loading ODinW macro f1 metrics:', error));
}

function renderODinWMacroF1Part1Chart(data, canvas) {
  console.log('Rendering ODinW Macro F1 Part 1 chart with data:', data);
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  const allDatasetNames = data.gpt5.dataset_name;
  const datasetNames = allDatasetNames.slice(0, 12);
  
  const datasets = v1Models.map((model, index) => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.macro_f1) {
      console.warn(`No macro f1 data found for model ${model}`);
      return null;
    }
    
    const originalValues = modelData.macro_f1.slice(0, 12);
    
    // Calculate minimum visible value for this model's data
    const dataMax = Math.max(...originalValues);
    const minVisibleValue = Math.max(0.01, dataMax * 0.01);
    
    // Create display values that ensure small values are visible
    const displayValues = originalValues.map(value => 
      value === 0 ? minVisibleValue : Math.max(value, minVisibleValue)
    );
    
    const colors = ['rgba(54, 162, 235, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(255, 206, 86, 0.7)'];
    const borderColors = ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)', 'rgba(255, 206, 86, 1)'];
    
    return {
        label: v1ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        categoryPercentage: 0.4, 
        barPercentage: 0.7      
    };
  }).filter(d => d !== null);
  
  // Calculate dynamic y-axis max using original values
  const allOriginalValues = datasets.flatMap(d => d.originalData);
  const dataMax = Math.max(...allOriginalValues);
  const maxValue = getNiceMaxValue(dataMax, 1.0);
  
  const chartConfig = {
    type: 'bar',
    data: { labels: datasetNames, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' },
        title: { 
          display: true,
          text: 'Macro F1 on ODinW Sub-Datasets (Part 1 of 2)',
          font: { size: 16, weight: 'bold' },
          padding: { bottom: 20 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${(originalValue * 100).toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { display: true, text: 'Sub-Dataset', font: { weight: 'bold', size: 14 } },
          ticks: { font: { size: 10 }, maxRotation: 90, minRotation: 45 },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { display: true, text: 'Macro F1', font: { weight: 'bold', size: 14 } },
          ticks: { font: { size: 12 }, callback: function(value) { return (value * 100).toFixed(1) + '%'; } },
          grid: { color: 'rgba(0, 0, 0, 0.1)' }
        }
      },
      animation: { duration: 1000, easing: 'easeInOutQuart' },
      layout: { padding: { top: 20, right: 20, bottom: 20, left: 20 } }
    }
  };
  
  try {
    if (odinwMacroF1Part1Chart) odinwMacroF1Part1Chart.destroy();
    odinwMacroF1Part1Chart = new Chart(ctx, chartConfig);
    console.log('ODinW Macro F1 Part 1 chart created successfully');
  } catch (error) {
    console.error('Error creating ODinW Macro F1 Part 1 chart:', error);
  }
}

function renderODinWMacroF1Part2Chart(data, canvas) {
  console.log('Rendering ODinW Macro F1 Part 2 chart with data:', data);
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  const allDatasetNames = data.gpt5.dataset_name;
  const datasetNames = allDatasetNames.slice(12, 24);
  
  const datasets = v1Models.map((model, index) => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.macro_f1) {
      console.warn(`No macro f1 data found for model ${model}`);
      return null;
    }
    
    const originalValues = modelData.macro_f1.slice(12, 24);
    
    // Calculate minimum visible value for this model's data
    const dataMax = Math.max(...originalValues);
    const minVisibleValue = Math.max(0.01, dataMax * 0.01);
    
    // Create display values that ensure small values are visible
    const displayValues = originalValues.map(value => 
      value === 0 ? minVisibleValue : Math.max(value, minVisibleValue)
    );
    
    const colors = ['rgba(54, 162, 235, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(255, 206, 86, 0.7)'];
    const borderColors = ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)', 'rgba(255, 206, 86, 1)'];
    
    return {
        label: v1ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        categoryPercentage: 0.4, 
        barPercentage: 0.7         
    };
  }).filter(d => d !== null);
  
  // Calculate dynamic y-axis max using original values
  const allOriginalValues = datasets.flatMap(d => d.originalData);
  const dataMax = Math.max(...allOriginalValues);
  const maxValue = getNiceMaxValue(dataMax, 1.0);
  
  const chartConfig = {
    type: 'bar',
    data: { labels: datasetNames, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' },
        title: { 
          display: true,
          text: 'Macro F1 on ODinW Sub-Datasets (Part 2 of 2)',
          font: { size: 16, weight: 'bold' },
          padding: { bottom: 20 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${(originalValue * 100).toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { display: true, text: 'Sub-Dataset', font: { weight: 'bold', size: 14 } },
          ticks: { font: { size: 10 }, maxRotation: 90, minRotation: 45 },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { display: true, text: 'Macro F1', font: { weight: 'bold', size: 14 } },
          ticks: { font: { size: 12 }, callback: function(value) { return (value * 100).toFixed(1) + '%'; } },
          grid: { color: 'rgba(0, 0, 0, 0.1)' }
        }
      },
      animation: { duration: 1000, easing: 'easeInOutQuart' },
      layout: { padding: { top: 20, right: 20, bottom: 20, left: 20 } }
    }
  };
  
  try {
    if (odinwMacroF1Part2Chart) odinwMacroF1Part2Chart.destroy();
    odinwMacroF1Part2Chart = new Chart(ctx, chartConfig);
    console.log('ODinW Macro F1 Part 2 chart created successfully');
  } catch (error) {
    console.error('Error creating ODinW Macro F1 Part 2 chart:', error);
  }
}

// ODinW Invalid Percentage Chart Functions
function initializeODinWInvalidPercentagePart1Chart() {
  const chartCanvas = document.getElementById('odinw-invalid-percentage-part1-chart');
  if (!chartCanvas) return;
  
  fetch('../data/v1_odinw_metrics.json')
    .then(response => response.ok ? response.json() : Promise.reject(new Error(`HTTP error! status: ${response.status}`)))
    .then(data => renderODinWInvalidPercentagePart1Chart(data, chartCanvas))
    .catch(error => console.error('Error loading ODinW invalid percentage metrics:', error));
}

function initializeODinWInvalidPercentagePart2Chart() {
  const chartCanvas = document.getElementById('odinw-invalid-percentage-part2-chart');
  if (!chartCanvas) return;
  
  fetch('../data/v1_odinw_metrics.json')
    .then(response => response.ok ? response.json() : Promise.reject(new Error(`HTTP error! status: ${response.status}`)))
    .then(data => renderODinWInvalidPercentagePart2Chart(data, chartCanvas))
    .catch(error => console.error('Error loading ODinW invalid percentage metrics:', error));
}

function renderODinWInvalidPercentagePart1Chart(data, canvas) {
  console.log('Rendering ODinW Invalid Percentage Part 1 chart with data:', data);
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  const allDatasetNames = data.gpt5.dataset_name;
  const datasetNames = allDatasetNames.slice(0, 12);
  
  // First, collect all original values to calculate a global minimum visible value
  const allOriginalValues = [];
  v1Models.forEach(model => {
    const modelData = getModelData(data, model);
    if (modelData && modelData.percentage_invalids) {
      allOriginalValues.push(...modelData.percentage_invalids.slice(0, 12));
    }
  });
  
  // Calculate minimum visible value based on overall data range
  const dataMax = Math.max(...allOriginalValues);
  const minVisibleValue = Math.max(0.1, dataMax * 0.01);
  
  const datasets = v1Models.map((model, index) => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.percentage_invalids) {
      console.warn(`No invalid percentage data found for model ${model}`);
      return null;
    }
    
    const originalValues = modelData.percentage_invalids.slice(0, 12);
    
    // Create display values that ensure small values are visible
    const displayValues = originalValues.map(value => 
      value === 0 ? minVisibleValue : Math.max(value, minVisibleValue)
    );
    
    const colors = ['rgba(54, 162, 235, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(255, 206, 86, 0.7)'];
    const borderColors = ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)', 'rgba(255, 206, 86, 1)'];
    
    return {
        label: v1ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        categoryPercentage: 0.4, 
        barPercentage: 0.7      
    };
  }).filter(d => d !== null);
  
  // Calculate dynamic y-axis max using original values
  const maxValue = Math.min(100, Math.max(10, dataMax * 1.1)); // Cap at 100% for invalid percentage
  
  const chartConfig = {
    type: 'bar',
    data: { labels: datasetNames, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' },
        title: { 
          display: true,
          text: 'Invalid Percentage on ODinW Sub-Datasets (Part 1 of 2)',
          font: { size: 16, weight: 'bold' },
          padding: { bottom: 20 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${originalValue.toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { display: true, text: 'Sub-Dataset', font: { weight: 'bold', size: 14 } },
          ticks: { font: { size: 10 }, maxRotation: 90, minRotation: 45 },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { display: true, text: 'Invalid Percentage', font: { weight: 'bold', size: 14 } },
          ticks: { font: { size: 12 }, callback: function(value) { return value.toFixed(1) + '%'; } },
          grid: { color: 'rgba(0, 0, 0, 0.1)' }
        }
      },
      animation: { duration: 1000, easing: 'easeInOutQuart' },
      layout: { padding: { top: 20, right: 20, bottom: 20, left: 20 } }
    }
  };
  
  try {
    if (odinwInvalidPercentagePart1Chart) odinwInvalidPercentagePart1Chart.destroy();
    odinwInvalidPercentagePart1Chart = new Chart(ctx, chartConfig);
    console.log('ODinW Invalid Percentage Part 1 chart created successfully');
  } catch (error) {
    console.error('Error creating ODinW Invalid Percentage Part 1 chart:', error);
  }
}

function renderODinWInvalidPercentagePart2Chart(data, canvas) {
  console.log('Rendering ODinW Invalid Percentage Part 2 chart with data:', data);
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  const allDatasetNames = data.gpt5.dataset_name;
  const datasetNames = allDatasetNames.slice(12, 24);
  
  // First, collect all original values to calculate a global minimum visible value
  const allOriginalValues = [];
  v1Models.forEach(model => {
    const modelData = getModelData(data, model);
    if (modelData && modelData.percentage_invalids) {
      allOriginalValues.push(...modelData.percentage_invalids.slice(12, 24));
    }
  });
  
  // Calculate minimum visible value based on overall data range
  const dataMax = Math.max(...allOriginalValues);
  const minVisibleValue = Math.max(0.1, dataMax * 0.01);
  
  const datasets = v1Models.map((model, index) => {
    const modelData = getModelData(data, model);
    if (!modelData || !modelData.percentage_invalids) {
      console.warn(`No invalid percentage data found for model ${model}`);
      return null;
    }
    
    const originalValues = modelData.percentage_invalids.slice(12, 24);
    
    // Create display values that ensure small values are visible
    const displayValues = originalValues.map(value => 
      value === 0 ? minVisibleValue : Math.max(value, minVisibleValue)
    );
    
    const colors = ['rgba(54, 162, 235, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(255, 206, 86, 0.7)'];
    const borderColors = ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)', 'rgba(255, 206, 86, 1)'];
    
    return {
        label: v1ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        categoryPercentage: 0.4, 
        barPercentage: 0.7         
    };
  }).filter(d => d !== null);
  
  // Calculate dynamic y-axis max using original values
  const maxValue = Math.min(100, Math.max(10, dataMax * 1.1)); // Cap at 100% for invalid percentage
  
  const chartConfig = {
    type: 'bar',
    data: { labels: datasetNames, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' },
        title: { 
          display: true,
          text: 'Invalid Percentage on ODinW Sub-Datasets (Part 2 of 2)',
          font: { size: 16, weight: 'bold' },
          padding: { bottom: 20 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${originalValue.toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { display: true, text: 'Sub-Dataset', font: { weight: 'bold', size: 14 } },
          ticks: { font: { size: 10 }, maxRotation: 90, minRotation: 45 },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { display: true, text: 'Invalid Percentage', font: { weight: 'bold', size: 14 } },
          ticks: { font: { size: 12 }, callback: function(value) { return value.toFixed(1) + '%'; } },
          grid: { color: 'rgba(0, 0, 0, 0.1)' }
        }
      },
      animation: { duration: 1000, easing: 'easeInOutQuart' },
      layout: { padding: { top: 20, right: 20, bottom: 20, left: 20 } }
    }
  };
  
  try {
    if (odinwInvalidPercentagePart2Chart) odinwInvalidPercentagePart2Chart.destroy();
    odinwInvalidPercentagePart2Chart = new Chart(ctx, chartConfig);
    console.log('ODinW Invalid Percentage Part 2 chart created successfully');
  } catch (error) {
    console.error('Error creating ODinW Invalid Percentage Part 2 chart:', error);
  }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeDatasetSelector();
    updateEvalMetricButtons(currentDataset); // Initialize metric buttons for default dataset
    initializePIQAChart();
  });
} else {
  initializeDatasetSelector();
  updateEvalMetricButtons(currentDataset); // Initialize metric buttons for default dataset
  initializePIQAChart();
}

// Handle window resize
window.addEventListener('resize', () => {
  if (piqaChart) {
    piqaChart.resize();
  }
  if (piqaInvalidPercentageChart) {
    piqaInvalidPercentageChart.resize();
  }
  if (sqa3dChart) {
    sqa3dChart.resize();
  }
  if (sqa3dAvgSimilarityScoreChart) {
    sqa3dAvgSimilarityScoreChart.resize();
  }
  if (sqa3dHighSimilarityPercentageChart) {
    sqa3dHighSimilarityPercentageChart.resize();
  }
  if (overcookedChart) {
    overcookedChart.resize();
  }
  if (overcookedMacroPrecisionChart) {
    overcookedMacroPrecisionChart.resize();
  }
  if (overcookedMacroRecallChart) {
    overcookedMacroRecallChart.resize();
  }
  if (overcookedMacroF1Chart) {
    overcookedMacroF1Chart.resize();
  }
  if (overcookedPercentageInvalidsChart) {
    overcookedPercentageInvalidsChart.resize();
  }
  if (robotvqaChart) {
    robotvqaChart.resize();
  }
  if (robotvqaAvgSimilarityScoreChart) {
    robotvqaAvgSimilarityScoreChart.resize();
  }
  if (robotvqaHighSimilarityPercentageChart) {
    robotvqaHighSimilarityPercentageChart.resize();
  }
  if (odinwPart1Chart) {
    odinwPart1Chart.resize();
  }
  if (odinwPart2Chart) {
    odinwPart2Chart.resize();
  }
  if (odinwMacroPrecisionPart1Chart) {
    odinwMacroPrecisionPart1Chart.resize();
  }
  if (odinwMacroPrecisionPart2Chart) {
    odinwMacroPrecisionPart2Chart.resize();
  }
  if (odinwMacroRecallPart1Chart) {
    odinwMacroRecallPart1Chart.resize();
  }
  if (odinwMacroRecallPart2Chart) {
    odinwMacroRecallPart2Chart.resize();
  }
  if (odinwMacroF1Part1Chart) {
    odinwMacroF1Part1Chart.resize();
  }
  if (odinwMacroF1Part2Chart) {
    odinwMacroF1Part2Chart.resize();
  }
  if (odinwInvalidPercentagePart1Chart) {
    odinwInvalidPercentagePart1Chart.resize();
  }
  if (odinwInvalidPercentagePart2Chart) {
    odinwInvalidPercentagePart2Chart.resize();
  }
  if (bfclv3InvalidTurnPercentageChart) {
    bfclv3InvalidTurnPercentageChart.resize();
  }
  if (bfclv3InvalidConversationPercentageChart) {
    bfclv3InvalidConversationPercentageChart.resize();
  }
  if (bfclv3AvgValidPredictedFunctionsPerSampleChart) {
    bfclv3AvgValidPredictedFunctionsPerSampleChart.resize();
  }
  if (bfclv3HighSimilarityPercentageChart) {
    bfclv3HighSimilarityPercentageChart.resize();
  }
  if (openxActionSuccessRateChart) {
    openxActionSuccessRateChart.resize();
  }
  if (openxInvalidPredictionsPercentageChart) {
    openxInvalidPredictionsPercentageChart.resize();
  }
  if (openxMeanAbsoluteErrorChart) {
    openxMeanAbsoluteErrorChart.resize();
  }
  if (openxNormalizedMaeChart) {
    openxNormalizedMaeChart.resize();
  }
  if (openxNormalizedQuantileFilteredMaeChart) {
    openxNormalizedQuantileFilteredMaeChart.resize();
  }
});

// BFCLv3 Chart Functions
// BFCLv3 Invalid Turn Percentage Chart Functions
function initializeBFCLv3InvalidTurnPercentageChart() {
  const chartCanvas = document.getElementById('bfclv3-invalid-turn-percentage-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_bfclv3_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderBFCLv3InvalidTurnPercentageChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading BFCLv3 invalid turn percentage metrics:', error);
    });
}

function renderBFCLv3InvalidTurnPercentageChart(data, canvas) {
  console.log('Rendering BFCLv3 Invalid Turn Percentage chart with data:', data);
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // BFCLv3 only has 2 models: magma and pi0
  const bfclv3Models = ['pi0', 'magma'];
  const bfclv3ModelDisplayNames = {
    'magma': 'Magma',
    'pi0': 'Pi0'
  };
  
  const datasets = bfclv3Models.map((model, index) => {
    const modelData = data[model];
    if (!modelData || !modelData.invalid_turn_percentage) {
      console.warn(`No invalid turn percentage data found for model ${model}`);
      return null;
    }
    
    const originalValues = modelData.invalid_turn_percentage;
    
    // Calculate minimum visible value for this model's data (percentage)
    const dataMax = Math.max(...originalValues);
    const minVisibleValue = Math.max(0.1, dataMax * 0.01);
    
    // Create display values that ensure small values are visible
    const displayValues = originalValues.map(value => {
      if (value === 0) {
        return minVisibleValue;
      } else if (value < minVisibleValue) {
        return minVisibleValue * 1.5; // Make non-zero small values 50% bigger than minimum
      } else {
        return value;
      }
    });
    
    const colors = [
      'rgba(255, 206, 86, 0.7)',
      'rgba(255, 99, 132, 0.7)'
    ];
    
    const borderColors = [
      'rgba(255, 206, 86, 1)',
      'rgba(255, 99, 132, 1)'
    ];
    
    return {
        label: bfclv3ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false
    };
  }).filter(d => d !== null);
  
  // Calculate dynamic y-axis max using original values
  const allOriginalValues = datasets.flatMap(d => d.originalData);
  const dataMax = Math.max(...allOriginalValues);
  const maxValue = getNiceMaxValue(dataMax, 100.0); // Cap at 100%
  
  const chartData = {
    labels: ['BFCLv3'],
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: true,
          position: 'top'
        },
        title: { 
          display: true,
          text: 'Invalid Turn Percentage on BFCLv3 Dataset',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${originalValue.toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Dataset',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Invalid Turn Percentage (%)',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return value.toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (bfclv3InvalidTurnPercentageChart) {
      bfclv3InvalidTurnPercentageChart.destroy();
    }
    bfclv3InvalidTurnPercentageChart = new Chart(ctx, chartConfig);
    console.log('BFCLv3 Invalid Turn Percentage chart created successfully');
  } catch (error) {
    console.error('Error creating BFCLv3 Invalid Turn Percentage chart:', error);
  }
}

// BFCLv3 Invalid Conversation Percentage Chart Functions
function initializeBFCLv3InvalidConversationPercentageChart() {
  const chartCanvas = document.getElementById('bfclv3-invalid-conversation-percentage-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_bfclv3_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderBFCLv3InvalidConversationPercentageChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading BFCLv3 invalid conversation percentage metrics:', error);
    });
}

function renderBFCLv3InvalidConversationPercentageChart(data, canvas) {
  console.log('Rendering BFCLv3 Invalid Conversation Percentage chart with data:', data);
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // BFCLv3 only has 2 models: magma and pi0
  const bfclv3Models = ['pi0', 'magma'];
  const bfclv3ModelDisplayNames = {
    'magma': 'Magma',
    'pi0': 'Pi0'
  };
  
  const datasets = bfclv3Models.map((model, index) => {
    const modelData = data[model];
    if (!modelData || !modelData.invalid_conversation_percentage) {
      console.warn(`No invalid conversation percentage data found for model ${model}`);
      return null;
    }
    
    const originalValues = modelData.invalid_conversation_percentage;
    
    // Calculate minimum visible value for this model's data (percentage)
    const dataMax = Math.max(...originalValues);
    const minVisibleValue = Math.max(0.1, dataMax * 0.01);
    
    // Create display values that ensure small values are visible
    const displayValues = originalValues.map(value => {
      if (value === 0) {
        return minVisibleValue;
      } else if (value < minVisibleValue) {
        return minVisibleValue * 1.5; // Make non-zero small values 50% bigger than minimum
      } else {
        return value;
      }
    });
    
    const colors = [
      'rgba(255, 206, 86, 0.7)',
      'rgba(255, 99, 132, 0.7)'
    ];
    
    const borderColors = [
      'rgba(255, 206, 86, 1)',
      'rgba(255, 99, 132, 1)'
    ];
    
    return {
        label: bfclv3ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false
    };
  }).filter(d => d !== null);
  
  // Calculate dynamic y-axis max using original values
  const allOriginalValues = datasets.flatMap(d => d.originalData);
  const dataMax = Math.max(...allOriginalValues);
  const maxValue = getNiceMaxValue(dataMax, 100.0); // Cap at 100%
  
  const chartData = {
    labels: ['BFCLv3'],
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: true,
          position: 'top'
        },
        title: { 
          display: true,
          text: 'Invalid Conversation Percentage on BFCLv3 Dataset',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${originalValue.toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Dataset',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Invalid Conversation Percentage (%)',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return value.toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (bfclv3InvalidConversationPercentageChart) {
      bfclv3InvalidConversationPercentageChart.destroy();
    }
    bfclv3InvalidConversationPercentageChart = new Chart(ctx, chartConfig);
    console.log('BFCLv3 Invalid Conversation Percentage chart created successfully');
  } catch (error) {
    console.error('Error creating BFCLv3 Invalid Conversation Percentage chart:', error);
  }
}

// BFCLv3 Avg Valid Predicted Functions per Sample Chart Functions
function initializeBFCLv3AvgValidPredictedFunctionsPerSampleChart() {
  const chartCanvas = document.getElementById('bfclv3-avg-valid-predicted-functions-per-sample-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_bfclv3_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderBFCLv3AvgValidPredictedFunctionsPerSampleChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading BFCLv3 avg valid predicted functions per sample metrics:', error);
    });
}

function renderBFCLv3AvgValidPredictedFunctionsPerSampleChart(data, canvas) {
  console.log('Rendering BFCLv3 Average Valid Outputs Per Conversation chart with data:', data);
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // BFCLv3 only has 2 models: magma and pi0
  const bfclv3Models = ['pi0', 'magma'];
  const bfclv3ModelDisplayNames = {
    'magma': 'Magma',
    'pi0': 'Pi0'
  };
  
  // First, collect all original values to calculate a global minimum visible value
  const allOriginalValues = [];
  bfclv3Models.forEach(model => {
    const modelData = data[model];
    if (modelData && modelData.avg_valid_predicted_functions_per_sample) {
      allOriginalValues.push(...modelData.avg_valid_predicted_functions_per_sample);
    }
  });
  
  // Calculate minimum visible value based on overall data range (decimal values)
  const dataMax = Math.max(...allOriginalValues);
  const minVisibleValue = Math.max(0.01, dataMax * 0.01);
  
  const datasets = bfclv3Models.map((model, index) => {
    const modelData = data[model];
    if (!modelData || !modelData.avg_valid_predicted_functions_per_sample) {
      console.warn(`No avg valid predicted functions per sample data found for model ${model}`);
      return null;
    }
    
    const originalValues = modelData.avg_valid_predicted_functions_per_sample;
    
    // Create display values that ensure small values are visible
    const displayValues = originalValues.map(value => 
      value === 0 ? minVisibleValue : Math.max(value, minVisibleValue)
    );
    
    const colors = [
      'rgba(255, 206, 86, 0.7)',
      'rgba(255, 99, 132, 0.7)'
    ];
    
    const borderColors = [
      'rgba(255, 206, 86, 1)',
      'rgba(255, 99, 132, 1)'
    ];
    
    return {
        label: bfclv3ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false
    };
  }).filter(d => d !== null);
  
  // Calculate dynamic y-axis max using original values
  const maxValue = getNiceMaxValue(dataMax, null); // No cap for function counts
  
  const chartData = {
    labels: ['BFCLv3'],
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: true,
          position: 'top'
        },
        title: { 
          display: true,
          text: 'Average Valid Outputs Per Conversation on BFCLv3 Dataset',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${originalValue.toFixed(3)}`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Dataset',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'Average Valid Outputs Per Conversation',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return value.toFixed(2);
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (bfclv3AvgValidPredictedFunctionsPerSampleChart) {
      bfclv3AvgValidPredictedFunctionsPerSampleChart.destroy();
    }
    bfclv3AvgValidPredictedFunctionsPerSampleChart = new Chart(ctx, chartConfig);
    console.log('BFCLv3 Average Valid Outputs Per Conversation chart created successfully');
  } catch (error) {
    console.error('Error creating BFCLv3 Average Valid Outputs Per Conversation chart:', error);
  }
}



// BFCLv3 High Similarity Percentage Chart Functions
function initializeBFCLv3HighSimilarityPercentageChart() {
  const chartCanvas = document.getElementById('bfclv3-high-similarity-percentage-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_bfclv3_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderBFCLv3HighSimilarityPercentageChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading BFCLv3 high similarity percentage metrics:', error);
    });
}

function renderBFCLv3HighSimilarityPercentageChart(data, canvas) {
  console.log('Rendering BFCLv3 High Similarity Percentage chart with data:', data);
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // BFCLv3 only has 2 models: magma and pi0
  const bfclv3Models = ['pi0', 'magma'];
  const bfclv3ModelDisplayNames = {
    'magma': 'Magma',
    'pi0': 'Pi0'
  };
  
  // First, collect all original values to calculate a global minimum visible value
  const allOriginalValues = [];
  bfclv3Models.forEach(model => {
    const modelData = data[model];
    if (modelData && modelData.high_similarity_percentage) {
      allOriginalValues.push(...modelData.high_similarity_percentage);
    }
  });
  
  // Calculate minimum visible value based on overall data range
  const dataMax = Math.max(...allOriginalValues);
  const minVisibleValue = Math.max(0.1, dataMax * 0.01);
  
  const datasets = bfclv3Models.map((model, index) => {
    const modelData = data[model];
    if (!modelData || !modelData.high_similarity_percentage) {
      console.warn(`No high similarity percentage data found for model ${model}`);
      return null;
    }
    
    const originalValues = modelData.high_similarity_percentage;
    
    // Create display values that ensure small values are visible
    const displayValues = originalValues.map(value => 
      value === 0 ? minVisibleValue : Math.max(value, minVisibleValue)
    );
    
    const colors = [
      'rgba(255, 206, 86, 0.7)',
      'rgba(255, 99, 132, 0.7)'
    ];
    
    const borderColors = [
      'rgba(255, 206, 86, 1)',
      'rgba(255, 99, 132, 1)'
    ];
    
    return {
        label: bfclv3ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false
    };
  }).filter(d => d !== null);
  
  // Calculate dynamic y-axis max using original values
  const maxValue = getNiceMaxValue(dataMax, 100.0); // Cap at 100%
  
  const chartData = {
    labels: ['BFCLv3'],
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: true,
          position: 'top'
        },
        title: { 
          display: true,
          text: 'High Quality Predictions (>0.8 Similarity) on BFCLv3 Dataset',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${originalValue.toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { 
            display: true, 
            text: 'Dataset',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
          title: { 
            display: true, 
            text: 'High Quality Predictions (%)',
            font: {
              weight: 'bold',
              size: 14
            }
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return value.toFixed(1) + '%';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  };
  
  try {
    if (bfclv3HighSimilarityPercentageChart) {
      bfclv3HighSimilarityPercentageChart.destroy();
    }
    bfclv3HighSimilarityPercentageChart = new Chart(ctx, chartConfig);
    console.log('BFCLv3 High Similarity Percentage chart created successfully');
  } catch (error) {
    console.error('Error creating BFCLv3 High Similarity Percentage chart:', error);
  }
}

// OpenX Chart Functions
// OpenX Action Success Rate Chart Functions
function initializeOpenXActionSuccessRateChart() {
  const chartCanvas = document.getElementById('openx-action-success-rate-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_openx_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderOpenXActionSuccessRateChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading OpenX action success rate metrics:', error);
    });
}

function renderOpenXActionSuccessRateChart(data, canvas) {
  console.log('Rendering OpenX Action Success Rate chart with data:', data);
  console.log('Canvas element:', canvas);
  console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
  
  const chartDiv = canvas.closest('.metric-chart');
  console.log('Chart div:', chartDiv);
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  console.log('Canvas context:', ctx);
  
  // Get dataset names from the first model that has them
  let datasetNames = null;
  for (const model of v1Models) {
    if (data[model] && data[model].dataset_name) {
      datasetNames = data[model].dataset_name;
      break;
    }
  }
  console.log('OpenX Action Success Rate - Dataset names:', datasetNames);
  
  const datasets = v1Models.map((model, index) => {
    console.log(`Processing model: ${model}`);
    const modelData = data[model];
    console.log(`Model data for ${model}:`, modelData);
    
    if (!modelData || !modelData.action_success_rate) {
      console.warn(`No action success rate data found for model ${model}`);
      return null;
    }
    
    console.log(`Action success rate for ${model}:`, modelData.action_success_rate);
    
    const originalValues = modelData.action_success_rate;
    
    // Calculate minimum visible value for this model's data (percentage)
    const dataMax = Math.max(...originalValues);
    const minVisibleValue = Math.max(0.1, dataMax * 0.01);
    
    // Create display values that ensure small values are visible
    const displayValues = originalValues.map(value => {
      if (value === 0) {
        return minVisibleValue;
      } else if (value < minVisibleValue) {
        return minVisibleValue * 1.5; // Make non-zero small values 50% bigger than minimum
      } else {
        return value;
      }
    });
    
    const colors = [
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(255, 99, 132, 0.7)'
    ];
    
    const borderColors = [
      'rgba(54, 162, 235, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(255, 99, 132, 1)'
    ];
    
    const dataset = {
        label: v1ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        categoryPercentage: 0.4,
        barPercentage: 0.7
    };
    
    console.log(`Created dataset for ${model}:`, dataset);
    return dataset;
  }).filter(d => d !== null);
  
  console.log('Final datasets array:', datasets);
  
  // Calculate dynamic y-axis max using original values
  const allOriginalValues = datasets.flatMap(d => d.originalData);
  const dataMax = Math.max(...allOriginalValues);
  console.log('OpenX Action Success Rate - All original values:', allOriginalValues);
  console.log('OpenX Action Success Rate - Data max:', dataMax);
  
  // For very small values, use a smaller max to make them visible
  let maxValue;
  if (dataMax <= 5) {
    maxValue = Math.max(5, Math.ceil(dataMax * 1.2)); // At least 5, or 20% above max
  } else {
    maxValue = getNiceMaxValue(dataMax, 100.0); // Cap at 100%
  }
  console.log('OpenX Action Success Rate - Y-axis max:', maxValue);
  
  const chartData = {
    labels: datasetNames,
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Action Success Rate (%)',
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${originalValue.toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Dataset'
          }
        },
        y: {
          beginAtZero: true,
          max: maxValue,
          title: {
            display: true,
            text: 'Action Success Rate (%)'
          },
          ticks: {
            callback: function(value) {
              return value.toFixed(1) + '%';
            }
          }
        }
      }
    }
  };
  
  try {
    // Destroy existing chart if it exists
    if (openxActionSuccessRateChart) {
      console.log('Destroying existing OpenX Action Success Rate chart');
      openxActionSuccessRateChart.destroy();
    }
    
    console.log('Creating chart with config:', chartConfig);
    openxActionSuccessRateChart = new Chart(ctx, chartConfig);
    console.log('OpenX Action Success Rate chart created successfully');
    console.log('Chart instance:', openxActionSuccessRateChart);
  } catch (error) {
    console.error('Error creating OpenX Action Success Rate chart:', error);
    console.error('Error details:', error.message, error.stack);
  }
}

// OpenX Invalid Predictions Percentage Chart Functions
function initializeOpenXInvalidPredictionsPercentageChart() {
  const chartCanvas = document.getElementById('openx-invalid-predictions-percentage-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_openx_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderOpenXInvalidPredictionsPercentageChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading OpenX invalid predictions percentage metrics:', error);
    });
}

function renderOpenXInvalidPredictionsPercentageChart(data, canvas) {
  console.log('Rendering OpenX Invalid Predictions Percentage chart with data:', data);
  console.log('Canvas element:', canvas);
  console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
  
  const chartDiv = canvas.closest('.metric-chart');
  console.log('Chart div:', chartDiv);
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  console.log('Canvas context:', ctx);
  
  // Get dataset names from the first model that has them
  let datasetNames = null;
  for (const model of v1Models) {
    if (data[model] && data[model].dataset_name) {
      datasetNames = data[model].dataset_name;
      break;
    }
  }
  console.log('OpenX Invalid Predictions Percentage - Dataset names:', datasetNames);
  
  // First, collect all original values to calculate a global minimum visible value
  const allOriginalValues = [];
  v1Models.forEach(model => {
    const modelData = data[model];
    if (modelData && modelData.invalid_predictions_percentage) {
      allOriginalValues.push(...modelData.invalid_predictions_percentage);
    }
  });
  
  // Calculate minimum visible value based on overall data range (percentage)
  const dataMax = Math.max(...allOriginalValues);
  const minVisibleValue = Math.max(0.1, dataMax * 0.01);
  
  const datasets = v1Models.map((model, index) => {
    console.log(`Processing model: ${model}`);
    const modelData = data[model];
    console.log(`Model data for ${model}:`, modelData);
    
    if (!modelData || !modelData.invalid_predictions_percentage) {
      console.warn(`No invalid predictions percentage data found for model ${model}`);
      return null;
    }
    
    console.log(`Invalid predictions percentage for ${model}:`, modelData.invalid_predictions_percentage);
    
    const originalValues = modelData.invalid_predictions_percentage;
    
    // Create display values that ensure small values are visible
    const displayValues = originalValues.map(value => 
      value === 0 ? minVisibleValue : Math.max(value, minVisibleValue)
    );
    
    const colors = [
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(255, 99, 132, 0.7)'
    ];
    
    const borderColors = [
      'rgba(54, 162, 235, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(255, 99, 132, 1)'
    ];
    
    const dataset = {
        label: v1ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        categoryPercentage: 0.4,
        barPercentage: 0.7
    };
    
    console.log(`Created dataset for ${model}:`, dataset);
    return dataset;
  }).filter(d => d !== null);
  
  console.log('Final datasets array:', datasets);
  
  // Use the already calculated dataMax from global calculation
  console.log('OpenX Invalid Predictions Percentage - All original values:', allOriginalValues);
  console.log('OpenX Invalid Predictions Percentage - Data max:', dataMax);
  
  // For invalid percentage, cap at 100% and ensure minimum scale for visibility
  let maxValue;
  if (dataMax <= 5) {
    maxValue = Math.max(10, Math.ceil(dataMax * 1.2)); // At least 10, or 20% above max
  } else {
    maxValue = Math.min(100, Math.max(10, dataMax * 1.1)); // Cap at 100%, min 10
  }
  console.log('OpenX Invalid Predictions Percentage - Y-axis max:', maxValue);
  
  const chartData = {
    labels: datasetNames,
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Invalid Predictions Percentage (%)',
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${originalValue.toFixed(1)}%`;
              }
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Dataset'
          }
        },
        y: {
          beginAtZero: true,
          max: maxValue,
          title: {
            display: true,
            text: 'Invalid Predictions Percentage (%)'
          },
          ticks: {
            callback: function(value) {
              return value.toFixed(1) + '%';
            }
          }
        }
      }
    }
  };
  
  try {
    // Destroy existing chart if it exists
    if (openxInvalidPredictionsPercentageChart) {
      console.log('Destroying existing OpenX Invalid Predictions Percentage chart');
      openxInvalidPredictionsPercentageChart.destroy();
    }
    
    console.log('Creating chart with config:', chartConfig);
    openxInvalidPredictionsPercentageChart = new Chart(ctx, chartConfig);
    console.log('OpenX Invalid Predictions Percentage chart created successfully');
    console.log('Chart instance:', openxInvalidPredictionsPercentageChart);
  } catch (error) {
    console.error('Error creating OpenX Invalid Predictions Percentage chart:', error);
    console.error('Error details:', error.message, error.stack);
  }
}

// OpenX Mean Absolute Error Chart Functions
function initializeOpenXMeanAbsoluteErrorChart() {
  const chartCanvas = document.getElementById('openx-mean-absolute-error-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_openx_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderOpenXMeanAbsoluteErrorChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading OpenX mean absolute error metrics:', error);
    });
}

function renderOpenXMeanAbsoluteErrorChart(data, canvas) {
  console.log('Rendering OpenX Mean Absolute Error chart with data:', data);
  
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // Get dataset names from the first model that has them
  let datasetNames = null;
  for (const model of v1Models) {
    if (data[model] && data[model].dataset_name) {
      datasetNames = data[model].dataset_name;
      break;
    }
  }
  
  // First, collect all original values to calculate a global minimum visible value
  const allOriginalValues = [];
  v1Models.forEach(model => {
    const modelData = data[model];
    if (modelData && modelData.total_dataset_amae) {
      allOriginalValues.push(...modelData.total_dataset_amae);
    }
  });
  
  // Calculate minimum visible value based on overall data range (decimal values)
  const dataMax = Math.max(...allOriginalValues);
  const minVisibleValue = Math.max(0.01, dataMax * 0.01);
  
  const datasets = v1Models.map((model, index) => {
    const modelData = data[model];
    if (!modelData || !modelData.total_dataset_amae) {
      console.warn(`No total dataset AMAE data found for model ${model}`);
      return null;
    }
    
    const originalValues = modelData.total_dataset_amae;
    
    // Create display values that ensure small values are visible
    const displayValues = originalValues.map(value => 
      value === 0 ? minVisibleValue : Math.max(value, minVisibleValue)
    );
    
    const colors = [
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(255, 99, 132, 0.7)'
    ];
    
    const borderColors = [
      'rgba(54, 162, 235, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(255, 99, 132, 1)'
    ];
    
    return {
        label: v1ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        categoryPercentage: 0.4,
        barPercentage: 0.7
    };
  }).filter(d => d !== null);
  
  // Calculate dynamic y-axis max using original values
  const maxValue = getNiceMaxValue(dataMax, null); // No cap for raw MAE values
  
  const chartData = {
    labels: datasetNames,
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Mean Absolute Error',
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${originalValue.toFixed(3)}`;
              }
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Dataset'
          }
        },
        y: {
          beginAtZero: true,
          max: maxValue,
          title: {
            display: true,
            text: 'Mean Absolute Error'
          }
        }
      }
    }
  };
  
  try {
    if (openxMeanAbsoluteErrorChart) {
      openxMeanAbsoluteErrorChart.destroy();
    }
    openxMeanAbsoluteErrorChart = new Chart(ctx, chartConfig);
    console.log('OpenX Mean Absolute Error chart created successfully');
  } catch (error) {
    console.error('Error creating OpenX Mean Absolute Error chart:', error);
  }
}

// OpenX Normalized MAE Chart Functions
function initializeOpenXNormalizedMaeChart() {
  const chartCanvas = document.getElementById('openx-normalized-mae-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_openx_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderOpenXNormalizedMaeChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading OpenX normalized MAE metrics:', error);
    });
}

function renderOpenXNormalizedMaeChart(data, canvas) {
  console.log('Rendering OpenX Normalized MAE chart with data:', data);
  
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // Get dataset names from the first model that has them
  let datasetNames = null;
  for (const model of v1Models) {
    if (data[model] && data[model].dataset_name) {
      datasetNames = data[model].dataset_name;
      break;
    }
  }
  
  // First, collect all original values to calculate a global minimum visible value
  const allOriginalValues = [];
  v1Models.forEach(model => {
    const modelData = data[model];
    if (modelData && modelData.normalized_amae) {
      allOriginalValues.push(...modelData.normalized_amae);
    }
  });
  
  // Filter out null values for calculating dataMax and minVisibleValue
  const validValues = allOriginalValues.filter(value => value !== null);
  const dataMax = validValues.length > 0 ? Math.max(...validValues) : 0;
  const minVisibleValue = Math.max(0.01, dataMax * 0.01);
  
  const datasets = v1Models.map((model, index) => {
    const modelData = data[model];
    if (!modelData || !modelData.normalized_amae) {
      console.warn(`No normalized AMAE data found for model ${model}`);
      return null;
    }
    
    // Keep null values as null (no bar will be displayed)
    const originalValues = modelData.normalized_amae;
    
    // Create display values that ensure small values are visible, but keep null as null
    const displayValues = originalValues.map(value => {
      if (value === null) {
        return null; // Keep null values as null (no bar will be displayed)
      } else if (value === 0) {
        return minVisibleValue;
      } else {
        return Math.max(value, minVisibleValue);
      }
    });
    
    const colors = [
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(255, 99, 132, 0.7)'
    ];
    
    const borderColors = [
      'rgba(54, 162, 235, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(255, 99, 132, 1)'
    ];
    
    return {
        label: v1ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        categoryPercentage: 0.4,
        barPercentage: 0.7
    };
  }).filter(d => d !== null);
  
  // Calculate dynamic y-axis max using original values
  const maxValue = getNiceMaxValue(dataMax, 1.0); // Cap at 1.0 for normalized values
  
  const chartData = {
    labels: datasetNames,
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Normalized MAE',
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${originalValue.toFixed(3)}`;
              }
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Dataset'
          }
        },
        y: {
          beginAtZero: true,
          max: maxValue,
          title: {
            display: true,
            text: 'Normalized MAE'
          }
        }
      }
    }
  };
  
  try {
    if (openxNormalizedMaeChart) {
      openxNormalizedMaeChart.destroy();
    }
    openxNormalizedMaeChart = new Chart(ctx, chartConfig);
    console.log('OpenX Normalized MAE chart created successfully');
  } catch (error) {
    console.error('Error creating OpenX Normalized MAE chart:', error);
  }
}

// OpenX Normalized Quantile Filtered MAE Chart Functions
function initializeOpenXNormalizedQuantileFilteredMaeChart() {
  const chartCanvas = document.getElementById('openx-normalized-quantile-filtered-mae-chart');
  if (!chartCanvas) {
    return;
  }
  
  fetch('../data/v1_openx_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      renderOpenXNormalizedQuantileFilteredMaeChart(data, chartCanvas);
    })
    .catch(error => {
      console.error('Error loading OpenX normalized quantile filtered MAE metrics:', error);
    });
}

function renderOpenXNormalizedQuantileFilteredMaeChart(data, canvas) {
  console.log('Rendering OpenX Normalized Quantile Filtered MAE chart with data:', data);
  
  const chartDiv = canvas.closest('.metric-chart');
  if (chartDiv) {
    chartDiv.style.setProperty('opacity', '1', 'important');
    chartDiv.style.setProperty('pointer-events', 'auto', 'important');
  }
  
  const ctx = canvas.getContext('2d');
  
  // Get dataset names from the first model that has them
  let datasetNames = null;
  for (const model of v1Models) {
    if (data[model] && data[model].dataset_name) {
      datasetNames = data[model].dataset_name;
      break;
    }
  }
  
  // First, collect all original values to calculate a global minimum visible value
  const allOriginalValues = [];
  v1Models.forEach(model => {
    const modelData = data[model];
    if (modelData && modelData.normalized_quantile_filtered_amae) {
      allOriginalValues.push(...modelData.normalized_quantile_filtered_amae);
    }
  });
  
  // Filter out null values for calculating dataMax and minVisibleValue
  const validValues = allOriginalValues.filter(value => value !== null);
  const dataMax = validValues.length > 0 ? Math.max(...validValues) : 0;
  const minVisibleValue = Math.max(0.01, dataMax * 0.01);
  
  const datasets = v1Models.map((model, index) => {
    const modelData = data[model];
    if (!modelData || !modelData.normalized_quantile_filtered_amae) {
      console.warn(`No normalized quantile filtered AMAE data found for model ${model}`);
      return null;
    }
    
    // Keep null values as null (no bar will be displayed)
    const originalValues = modelData.normalized_quantile_filtered_amae;
    
    // Create display values that ensure small values are visible, but keep null as null
    const displayValues = originalValues.map(value => {
      if (value === null) {
        return null; // Keep null values as null (no bar will be displayed)
      } else if (value === 0) {
        return minVisibleValue;
      } else {
        return Math.max(value, minVisibleValue);
      }
    });
    
    const colors = [
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(255, 99, 132, 0.7)'
    ];
    
    const borderColors = [
      'rgba(54, 162, 235, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(255, 99, 132, 1)'
    ];
    
    return {
        label: v1ModelDisplayNames[model],
        data: displayValues,
        originalData: originalValues, // Store original values for tooltips
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        categoryPercentage: 0.4,
        barPercentage: 0.7
    };
  }).filter(d => d !== null);
  
  // Calculate dynamic y-axis max using original values
  const maxValue = getNiceMaxValue(dataMax, 1.0); // Cap at 1.0 for normalized values
  
  const chartData = {
    labels: datasetNames,
    datasets: datasets
  };
  
  const chartConfig = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Normalized Quantile Filtered MAE',
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const originalValue = context.dataset.originalData[context.dataIndex];
              if (originalValue === null) {
                return `${context.dataset.label}: N/A (no data available)`;
              } else {
                return `${context.dataset.label}: ${originalValue.toFixed(3)}`;
              }
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Dataset'
          }
        },
        y: {
          beginAtZero: true,
          max: maxValue,
          title: {
            display: true,
            text: 'Normalized Quantile Filtered MAE'
          }
        }
      }
    }
  };
  
  try {
    if (openxNormalizedQuantileFilteredMaeChart) {
      openxNormalizedQuantileFilteredMaeChart.destroy();
    }
    openxNormalizedQuantileFilteredMaeChart = new Chart(ctx, chartConfig);
    console.log('OpenX Normalized Quantile Filtered MAE chart created successfully');
  } catch (error) {
    console.error('Error creating OpenX Normalized Quantile Filtered MAE chart:', error);
  }
}

})();
