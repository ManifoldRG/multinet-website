const models = ['gpt4o', 'gpt4_1', 'openvla', 'pi0_fast', 'pi0_base'];
const datasets = [
  'bigfish', 'bossfight', 'caveflyer', 'chaser', 'climber', 'coinrun', 'dodgeball', 'fruitbot',
  'heist', 'jumper', 'leaper', 'maze', 'miner', 'ninja', 'plunder', 'starpilot'
];
const metrics = [
  'brier-mae',
  'normalized_amae',
  'normalized_quantile_filtered_amae',
  'micro-precision',
  'micro-recall',
  'micro-f1',
  'macro-precision',
  'macro-recall',
  'macro-f1'
];

// Map metric to display name
const metricDisplay = {
  'brier-mae': 'Brier MAE',
  'normalized_amae': 'Normalized AMAE',
  'normalized_quantile_filtered_amae': 'Normalized Quantile Filtered AMAE',
  'micro-precision': 'Micro Precision',
  'micro-recall': 'Micro Recall',
  'micro-f1': 'Micro F1',
  'macro-precision': 'Macro Precision',
  'macro-recall': 'Macro Recall',
  'macro-f1': 'Macro F1'
};

let charts = {};

function getMetricData(metric, data) {
  // For Brier MAE, normalized_amae, and normalized_quantile_filtered_amae, only use 4 models (remove pi0_base)
  const useModels = ['brier-mae', 'normalized_amae', 'normalized_quantile_filtered_amae'].includes(metric) 
    ? models.slice(0, 4)  // Use first 4 models (excluding pi0_base)
    : models;  // Use all models for other metrics
  
  // Map the metric names from the UI to the actual keys in the data
  const metricKeyMap = {
    'brier-mae': 'amae',
    'normalized_amae': 'normalized_amae',
    'normalized_quantile_filtered_amae': 'normalized_quantile_filtered_amae',
    'micro-precision': 'micro_precision',
    'micro-recall': 'micro_recall',
    'micro-f1': 'micro_f1',
    'macro-precision': 'macro_precision',
    'macro-recall': 'macro_recall',
    'macro-f1': 'macro_f1'
  };

  return useModels.map(model => {
    const metricKey = metricKeyMap[metric];
    if (!metricKey) {
      console.error(`No mapping found for metric: ${metric}`);
      return Array(16).fill(null);
    }
    
    // Get the data for this model and metric
    const modelData = data[model] && data[model][metricKey];
    if (!modelData) {
      console.warn(`No data found for model ${model} and metric ${metricKey}`);
      return Array(16).fill(null);
    }
    
    // Convert the data to numbers and handle any undefined values
    return modelData.slice(0, 16).map(value => {
      if (value === undefined || value === null) return null;
      return Number(value);
    });
  });
}

function createChartContainer(metric) {
  const div = document.createElement('div');
  div.className = 'metric-chart';
  div.dataset.metric = metric;
  if (metric === 'brier-mae') div.classList.add('active');
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
    
    metrics.forEach(metric => {
      console.log(`Creating chart for metric: ${metric}`);
      const chartDiv = createChartContainer(metric);
      chartsContainer.appendChild(chartDiv);
  
      const ctx = chartDiv.querySelector('canvas').getContext('2d');
      const useModels = ['brier-mae', 'normalized_amae', 'normalized_quantile_filtered_amae'].includes(metric) 
        ? models.slice(0, 4)
        : models;
  
      const colors = [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)'
      ];
  
      const chartData = {
        labels: datasets,
        datasets: useModels.map((model, i) => {
          const modelData = getMetricData(metric, data)[i];
          console.log(`Model ${model} data for ${metric}:`, modelData);
          return {
            label: model,
            data: modelData,
            backgroundColor: colors[i % colors.length],
            borderColor: colors[i % colors.length].replace('0.7', '1'),
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.4,
            categoryPercentage: 0.5
          };
        })
      };
  
      console.log(`Chart data for ${metric}:`, chartData);
  
      try {
        if (!charts[metric]) {
          charts[metric] = new Chart(ctx, {
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
                    padding: 15
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
                    maxRotation: 45,
                    minRotation: 45,
                    font: {
                      size: 11
                    }
                  },
                  grid: {
                    display: false
                  },
                  offset: true,
                  categoryPercentage: 0.5,
                  barPercentage: 0.4,
                  afterFit: function(scaleInstance) {
                    scaleInstance.paddingRight = 20;
                    scaleInstance.paddingLeft = 20;
                  }
                },
                y: { 
                  beginAtZero: true,
                  title: { 
                    display: true, 
                    text: 'Metric Value',
                    font: {
                      weight: 'bold'
                    }
                  },
                  ...(['brier-mae', 'normalized_amae', 'normalized_quantile_filtered_amae'].includes(metric) ? {
                    min: 0,
                    max: 2,
                    ticks: {
                      stepSize: 0.2,
                      font: {
                        size: 11
                      }
                    }
                  } : {}),
                  grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                  }
                }
              },
              animation: {
                duration: 750,
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
          });
        } else {
          charts[metric].data = chartData;
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