const models = ['gpt4o', 'gpt4_1', 'openvla', 'pi0_fast', 'pi0_base'];
const datasets = [
  'bigfish', 'bossfight', 'caveflyer', 'chaser', 'climber', 'coinrun', 'dodgeball', 'fruitbot',
  'heist', 'jumper', 'leaper', 'maze', 'miner', 'ninja', 'plunder', 'starpilot'
];
const metrics = [
  'macro-recall',
  'macro-precision',
  'macro-f1',
  'micro-recall',
  'micro-precision',
  'micro-f1',
  'invalid_percentage',
  'brier-mae',
  'normalized_mae',
  'normalized_quantile_filtered_mae'
];

// Map metric to display name
const metricDisplay = {
  'macro-precision': 'Macro Precision',
  'macro-recall': 'Macro Recall',
  'macro-f1': 'Macro F1',
  'micro-precision': 'Micro Precision',
  'micro-recall': 'Micro Recall',
  'micro-f1': 'Micro F1',
  'brier-mae': 'Brier MAE',
  'normalized_mae': 'Normalized MAE',
  'normalized_quantile_filtered_mae': 'Normalized Quantile Filtered MAE',
  'invalid_percentage': 'Invalid Percentage'
};

let charts = {};

function getMetricData(metric, data) {
  // For Brier MAE, normalized_mae, and normalized_quantile_filtered_mae, only use 4 models (remove pi0_base)
  const useModels = ['brier-mae', 'normalized_mae', 'normalized_quantile_filtered_mae'].includes(metric) 
    ? models.slice(0, 4)  // Use first 4 models (excluding pi0_base)
    : models;  // Use all models for other metrics
  
  // Map the metric names from the UI to the actual keys in the data
  const metricKeyMap = {
    'brier-mae': 'mae',
    'normalized_mae': 'normalized_mae',
    'normalized_quantile_filtered_mae': 'normalized_quantile_filtered_mae',
    'micro-precision': 'micro_precision',
    'micro-recall': 'micro_recall',
    'micro-f1': 'micro_f1',
    'macro-precision': 'macro_precision',
    'macro-recall': 'macro_recall',
    'macro-f1': 'macro_f1',
    'invalid_percentage': 'invalid_percentage'
  };

  return useModels.map(model => {
    const metricKey = metricKeyMap[metric];
    if (!metricKey) {
      console.error(`No mapping found for metric: ${metric}`);
      return { values: Array(datasets.length).fill(null), std: Array(datasets.length).fill(null) };
    }
    
    const modelDataRoot = data[model];
    if (!modelDataRoot) {
      console.warn(`No data found for model ${model}`);
      return { values: Array(datasets.length).fill(null), std: Array(datasets.length).fill(null) };
    }

    const metricValues = modelDataRoot[metricKey];
    const stdValues = modelDataRoot[`${metricKey}_std`]; // Attempt to get _std version

    const processedValues = metricValues 
      ? metricValues.slice(0, datasets.length).map(value => (value === undefined || value === null) ? null : Number(value))
      : Array(datasets.length).fill(null);

    const processedStd = stdValues
      ? stdValues.slice(0, datasets.length).map(value => (value === undefined || value === null) ? null : Number(value))
      : Array(datasets.length).fill(null); // Fill with nulls if _std data doesn't exist

    return { values: processedValues, std: processedStd };
  });
}

function createChartContainer(metric) {
  const div = document.createElement('div');
  div.className = 'metric-chart';
  div.dataset.metric = metric;
  if (metric === 'macro-precision') div.classList.add('active');
  const canvas = document.createElement('canvas');
  canvas.id = `chart-${metric}`;
  div.appendChild(canvas);
  return div;
}

function renderCharts(data) {
    console.log('Rendering charts with data:', data);
    const chartsContainer = document.querySelector('.metrics-charts');
    if (!chartsContainer) {
      console.error('Could not find .metrics-charts container');
      return;
    }
    chartsContainer.innerHTML = '';
    
    // Create a custom plugin to draw error bars
    const errorBarPlugin = {
      id: 'errorBar',
      afterDatasetsDraw: function(chart) {
        const metric = chart.config._config.metric; // Get metric from chart config
        console.log('Drawing error bars for metric:', metric);
        
        // Only apply to metrics that should have error bars
        if (!['micro-precision', 'micro-recall', 'micro-f1', 'macro-precision', 'macro-recall', 'macro-f1'].includes(metric)) {
          return;
        }
        
        const ctx = chart.ctx;
        
        chart.data.datasets.forEach((dataset, datasetIndex) => {
          // Skip if dataset isn't visible or doesn't have std data
          const meta = chart.getDatasetMeta(datasetIndex);
          if (!meta.visible) return;
          
          // Get std data stored in dataset
          const stdData = dataset.stdData;
          if (!stdData || !stdData.length) {
            console.log(`No stdData found for dataset ${datasetIndex}`, dataset);
            return;
          }
          
          // Draw error bars for each data point
          ctx.save();
          // Use consistent thin black lines for all error bars
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(197, 117, 117, 0.8)';
          
          meta.data.forEach((element, index) => {
            const stdValue = stdData[index];
            const value = dataset.data[index];
            
            // Skip if no std value or data point
            if (stdValue === null || stdValue === undefined || value === null || value === undefined) {
              return;
            }
            
            console.log(`Drawing error bar for dataset ${datasetIndex}, index ${index}: value=${value}, std=${stdValue}`);
            
            // Get position for the current bar
            const barX = element.x;
            
            // Get y scale
            const yScale = chart.scales.y;
            
            // Calculate positions in pixels
            const yCenter = element.y; // Center of the bar (value)
            const yTop = yScale.getPixelForValue(value + stdValue); // Top of error bar
            const yBottom = yScale.getPixelForValue(Math.max(0, value - stdValue)); // Bottom of error bar
            
            // Draw vertical line
            ctx.beginPath();
            ctx.moveTo(barX, yTop);
            ctx.lineTo(barX, yBottom);
            ctx.stroke();
            
            // Draw top whisker
            ctx.beginPath();
            ctx.moveTo(barX - 4, yTop);
            ctx.lineTo(barX + 4, yTop);
            ctx.stroke();
            
            // Draw bottom whisker
            ctx.beginPath();
            ctx.moveTo(barX - 4, yBottom);
            ctx.lineTo(barX + 4, yBottom);
            ctx.stroke();
          });
          
          ctx.restore();
        });
      }
    };
    
    metrics.forEach(metric => {
      console.log(`Creating chart for metric: ${metric}`);
      const chartDiv = createChartContainer(metric);
      chartsContainer.appendChild(chartDiv);
  
      const ctx = chartDiv.querySelector('canvas').getContext('2d');
      const useModels = ['brier-mae', 'normalized_mae', 'normalized_quantile_filtered_mae'].includes(metric) 
        ? models.slice(0, 4)
        : models;
  
      const colors = [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)'
      ];

      // Get metric data for all models
      const metricData = getMetricData(metric, data);
      console.log(`Metric data for ${metric}:`, metricData);

      const chartData = {
        labels: datasets,
        datasets: useModels.map((model, i) => {
          const modelData = metricData[i];
          
          const dataset = {
            label: model,
            data: modelData.values,
            backgroundColor: colors[i % colors.length],
            borderColor: colors[i % colors.length].replace('0.7', '1'),
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.6
          };
          
          // Store std data directly in the dataset for the plugin
          if (modelData.std && modelData.std.some(s => s !== null && s !== undefined)) {
            dataset.stdData = modelData.std; // Use stdData instead of _stdData
            console.log(`Added std data for ${model}:`, modelData.std);
          }
          
          return dataset;
        })
      };
  
      console.log(`Chart data for ${metric}:`, chartData);
  
      try {
        if (!charts[metric]) {
          // Calculate the Y-axis scale dynamically for metrics with error bars
          let yAxisConfig = { 
            beginAtZero: true,
            title: { 
              display: true, 
              text: 'Metric Value',
              font: {
                weight: 'bold'
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          };
          
          // Special handling for specific metrics
          if (['brier-mae', 'normalized_mae', 'normalized_quantile_filtered_mae'].includes(metric)) {
            // Keep the fixed scale for these metrics
            yAxisConfig = {
              ...yAxisConfig,
              min: 0,
              max: 2,
              ticks: {
                stepSize: 0.2,
                font: {
                  size: 11
                }
              }
            };
          } else if (['micro-precision', 'micro-recall', 'micro-f1', 'macro-precision', 'macro-recall', 'macro-f1'].includes(metric)) {
            // For metrics with error bars, dynamically calculate the max value
            let maxValue = 0;
            
            chartData.datasets.forEach(dataset => {
              if (dataset.data && dataset.stdData) {
                dataset.data.forEach((value, index) => {
                  if (value !== null && value !== undefined) {
                    const stdValue = dataset.stdData[index];
                    if (stdValue !== null && stdValue !== undefined) {
                      // Consider value + std for maximum
                      maxValue = Math.max(maxValue, value + stdValue);
                    } else {
                      maxValue = Math.max(maxValue, value);
                    }
                  }
                });
              } else if (dataset.data) {
                // If no std data, just check the regular data values
                dataset.data.forEach(value => {
                  if (value !== null && value !== undefined) {
                    maxValue = Math.max(maxValue, value);
                  }
                });
              }
            });
            
            // Add padding (20%) and round to a nice number
            maxValue = maxValue * 1.2;
            
            // Round to a nice value based on the magnitude
            const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
            maxValue = Math.ceil(maxValue / magnitude) * magnitude;
            
            // Set the axis limits
            yAxisConfig = {
              ...yAxisConfig,
              min: 0,
              max: maxValue,
              ticks: {
                font: {
                  size: 11
                }
              }
            };
            
            console.log(`Calculated Y-axis max for ${metric}: ${maxValue}`);
          }
          
          const chartConfig = {
            type: 'bar',
            data: chartData,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { 
                  position: 'top',
                  labels: {
                    boxWidth: 12,
                    padding: 15,
                    generateLabels: function(chart) {
                      if (window.innerWidth < 768) {
                        return [];
                      }
                      return Chart.defaults.plugins.legend.labels.generateLabels(chart);
                    }
                  }
                },
                title: { 
                  display: false
                }
              },
              scales: {
                x: { 
                  stacked: false, 
                  title: { 
                    display: true, 
                    text: 'Dataset',
                    font: {
                      weight: 'bold'
                    }
                  },
                  ticks: {
                    maxRotation: window.innerWidth < 768 ? 90 : 45,
                    minRotation: window.innerWidth < 768 ? 90 : 45,
                    font: {
                      size: 11
                    }
                  },
                  grid: {
                    display: false
                  },
                  offset: true,
                  categoryPercentage: 0.9,
                  afterFit: function(scaleInstance) {
                    scaleInstance.paddingRight = 5;
                    scaleInstance.paddingLeft = 5;
                  }
                },
                y: yAxisConfig // Use our calculated Y-axis configuration
              },
              animation: {
                duration: 750,
                easing: 'easeInOutQuart'
              },
              layout: {
                padding: {
                  top: 10,
                  right: 10,
                  bottom: 10,
                  left: 10
                }
              }
            },
            plugins: [errorBarPlugin],
            metric: metric
          };
          
          charts[metric] = new Chart(ctx, chartConfig);
        } else {
          // For existing charts, recalculate max value when updating
          if (['micro-precision', 'micro-recall', 'micro-f1', 'macro-precision', 'macro-recall', 'macro-f1'].includes(metric)) {
            let maxValue = 0;
            
            chartData.datasets.forEach(dataset => {
              if (dataset.data && dataset.stdData) {
                dataset.data.forEach((value, index) => {
                  if (value !== null && value !== undefined) {
                    const stdValue = dataset.stdData[index];
                    if (stdValue !== null && stdValue !== undefined) {
                      maxValue = Math.max(maxValue, value + stdValue);
                    } else {
                      maxValue = Math.max(maxValue, value);
                    }
                  }
                });
              } else if (dataset.data) {
                dataset.data.forEach(value => {
                  if (value !== null && value !== undefined) {
                    maxValue = Math.max(maxValue, value);
                  }
                });
              }
            });
            
            // Add padding and round
            maxValue = maxValue * 1.2;
            const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
            maxValue = Math.ceil(maxValue / magnitude) * magnitude;
            
            // Update scale
            charts[metric].options.scales.y.max = maxValue;
            console.log(`Updated Y-axis max for ${metric}: ${maxValue}`);
          }
          
          charts[metric].data = chartData;
          charts[metric].config._config.metric = metric;
          charts[metric].update();
        }
      } catch (error) {
        console.error(`Error creating chart for ${metric}:`, error);
      }
    });
}

function showChart(metric) {
  document.querySelectorAll('.metric-chart').forEach(div => {
    div.classList.remove('active');
    if (div.dataset.metric === metric) div.classList.add('active');
  });
}

function initializeCharts() {
  console.log('Initializing charts...');
  fetch('../data/v0_2_metrics.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Data loaded successfully:', data);
      renderCharts(data);

      document.querySelectorAll('.metric-button').forEach(button => {
        button.addEventListener('click', () => {
          document.querySelectorAll('.metric-button').forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          showChart(button.dataset.metric);
        });
      });
    })
    .catch(error => {
      console.error('Error loading metrics:', error);
      // Add visual feedback for users
      const chartsContainer = document.querySelector('.metrics-charts');
      chartsContainer.innerHTML = `<div class="notification is-danger">
        Error loading charts: ${error.message}
      </div>`;
    });
}

// Add this to ensure the script runs after DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCharts);
} else {
  initializeCharts();
}

// Add window resize handler to maintain chart heights
window.addEventListener('resize', () => {
  Object.values(charts).forEach(chart => {
    if (chart) {
      chart.resize();
    }
  });
});