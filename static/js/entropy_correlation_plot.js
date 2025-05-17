document.addEventListener('DOMContentLoaded', () => {
    const plotContainer = document.getElementById('entropy-correlation-plot');
    const tooltip = document.getElementById('entropy-correlation-tooltip');
    const dataPath = '../data/entropy_correlation.json';

    if (!plotContainer) {
        console.error('Plot container #entropy-correlation-plot not found.');
        return;
    }
    if (!tooltip) {
        console.error('Tooltip element #entropy-correlation-tooltip not found.');
        // return; // Tooltip is optional for base functionality but good for UX
    }

    // Function to map value to RdBu_r colormap (approximate)
    // Values range from -1 to 1. Blue for positive, Red for negative.
    function getColor(value) {
        if (value === null || value === undefined) return '#FFFFFF'; // White for missing data
        // Normalize value from [-1, 1] to [0, 1] for simpler color mapping
        const normValue = (value + 1) / 2;

        let r, g, b;
        // Simplified RdBu_r: Dark Red -> Light Red -> White -> Light Blue -> Dark Blue
        if (normValue < 0.1) { r = 103; g = 0; b = 31; } // Dark Red
        else if (normValue < 0.2) { r = 178; g = 24; b = 43; }
        else if (normValue < 0.3) { r = 214; g = 96; b = 77; }
        else if (normValue < 0.4) { r = 244; g = 165; b = 130; }
        else if (normValue < 0.48) { r = 253; g = 219; b = 199; } // Light Red/Pink
        else if (normValue <= 0.52) { r = 247; g = 247; b = 247; } // Near White (for 0)
        else if (normValue < 0.6) { r = 209; g = 229; b = 240; } // Light Blue
        else if (normValue < 0.7) { r = 146; g = 197; b = 222; }
        else if (normValue < 0.8) { r = 67; g = 147; b = 195; }
        else if (normValue < 0.9) { r = 33; g = 102; b = 172; }
        else { r = 5; g = 48; b = 97; } // Dark Blue

        return `rgb(${r},${g},${b})`;
    }

    function getTextColor(bgColor) {
        const rgb = bgColor.match(/\d+/g);
        if (!rgb) return '#000000';
        const r = parseInt(rgb[0]);
        const g = parseInt(rgb[1]);
        const b = parseInt(rgb[2]);
        // Simple brightness check
        return (r * 0.299 + g * 0.587 + b * 0.114) > 160 ? '#000000' : '#FFFFFF';
    }

    fetch(dataPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const { labels, values } = data;
            if (!labels || !values) {
                plotContainer.textContent = 'Error: Data format incorrect.';
                return;
            }

            const table = document.createElement('table');
            table.className = 'table is-bordered is-striped is-narrow is-hoverable is-fullwidth correlation-matrix-table';
            table.style.tableLayout = 'fixed'; // For equal column widths

            // Create header row (X-axis labels)
            const header = table.createTHead().insertRow();
            const emptyTopLeftCell = header.insertCell(); // Add empty cell at the beginning of the header
            emptyTopLeftCell.id = 'empty-top-left-corner-cell'; // Assign a unique ID
            emptyTopLeftCell.style.width = `${100 / (labels.length + 1)}%`; // Set width for the empty cell

            labels.forEach(label => {
                const th = document.createElement('th');
                const labelDiv = document.createElement('div');
                labelDiv.textContent = label.replace(/_/g, ' ');
                labelDiv.style.whiteSpace = 'normal';
                labelDiv.style.width = 'auto';
                labelDiv.style.fontSize = '10px';
                labelDiv.style.display = 'inline-block';
                labelDiv.style.maxWidth = '100%';

                th.style.height = 'auto';
                th.style.minHeight = '50px';
                th.style.verticalAlign = 'middle';
                th.style.textAlign = 'center';
                th.style.width = `${100 / (labels.length + 1)}%`; // Set width for label header cells
                th.appendChild(labelDiv);
                header.appendChild(th);
            });

            // Create data rows (Y-axis labels and values)
            const tbody = table.createTBody();
            values.forEach((rowValues, i) => {
                const row = tbody.insertRow();
                const th = document.createElement('th');
                th.textContent = labels[i].replace(/_/g, ' ');
                th.style.fontSize = '10px';
                th.style.width = `${100 / (labels.length + 1)}%`; // Set width for row header cells
                row.appendChild(th);

                rowValues.forEach((value, j) => {
                    const cell = row.insertCell();
                    cell.textContent = value.toFixed(j === 5 || i === 5 ? 4 : 2); // Show more precision for 0.0032
                    const bgColor = getColor(value);
                    cell.style.backgroundColor = bgColor;
                    cell.style.color = getTextColor(bgColor);
                    cell.style.textAlign = 'center';
                    cell.style.fontWeight = 'bold';
                    cell.style.fontSize = '12px';
                    cell.style.width = `${100 / (labels.length +1)}%` // Distribute width
                    cell.style.height = '50px'; // Fixed height for cells

                    if (tooltip) {
                        cell.addEventListener('mousemove', (e) => {
                            tooltip.style.display = 'block';
                            tooltip.style.left = `${e.pageX + 15}px`;
                            tooltip.style.top = `${e.pageY + 15}px`;
                            tooltip.innerHTML = `Row: ${labels[i].replace(/_/g, ' ')}<br>Col: ${labels[j].replace(/_/g, ' ')}<br>Corr: ${value.toFixed(4)}`;
                        });
                        cell.addEventListener('mouseout', () => {
                            tooltip.style.display = 'none';
                        });
                    }
                });
            });

            plotContainer.appendChild(table);

            // Add some CSS for the table for better presentation if not using Bulma or if further styling needed
            const style = document.createElement('style');
            style.textContent = `
                /* .correlation-matrix-table th div { // This rule was for rotated text, may no longer be needed or be made more specific if other divs are transformed
                    transform-origin: left bottom;
                } */
                .correlation-matrix-table td, .correlation-matrix-table th { /* Common for td and all th */
                    padding: 0.5em 0.5em;
                    transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
                }

                /* Style for the empty top-left cell using its ID to make it invisible */
                #empty-top-left-corner-cell {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                }

                /* Common base styles for actual label th (label boxes) */
                .correlation-matrix-table thead th:not(#empty-top-left-corner-cell),
                .correlation-matrix-table tbody th {
                    border: none !important; /* Kept important due to Bulma base styles */
                    position: relative; /* For z-index context */
                }

                /* Specific background for horizontal axis label boxes */
                .correlation-matrix-table thead th:not(#empty-top-left-corner-cell) {
                    background-image: linear-gradient(to right, #FAFAFA, #C0C0C0);
                }

                /* Specific background for vertical axis label boxes */
                .correlation-matrix-table tbody th {
                    background-image: linear-gradient(to bottom, #FAFAFA, #C0C0C0);
                }

                /* Hover effect for ALL actual label th (label boxes) */
                .correlation-matrix-table thead th:not(#empty-top-left-corner-cell):hover,
                .correlation-matrix-table tbody th:hover {
                    transform: scale(1.03); /* Scale up slightly */
                    box-shadow: 0 6px 12px rgba(0,0,0,0.2);
                    z-index: 5;
                }

                /* Specific styles for vertical axis labels (tbody th) */
                .correlation-matrix-table tbody th {
                    text-align: right;       /* Align text to the right */
                    vertical-align: middle;  /* Center text vertically */
                    padding: 0.5em 1em 0.5em 0.5em; /* Adjust padding: T, R, B, L */
                    /* Ensure text is straight, allow hover transform by removing !important */
                    transform: none;
                }

                /* Specific styles for horizontal axis labels (thead th) */
                .correlation-matrix-table thead th {
                    text-align: center;
                    vertical-align: middle;
                }

                /* Ensure data cells (td) explicitly have their borders, matching Bulma */
                .correlation-matrix-table td {
                    border: 1px solid #dbdbdb !important;
                }
                .correlation-matrix-table td:hover {
                    transform: scale(1.05) translateY(-3px); /* Floating effect */
                    box-shadow: 0 8px 16px rgba(0,0,0,0.2); /* Optional: add shadow for more depth */
                    z-index: 10; /* Ensure hovered cell is on top */
                    position: relative; /* Needed for z-index */
                }
            `;
            document.head.appendChild(style);
        })
        .catch(error => {
            console.error('Failed to load or render entropy correlation plot:', error);
            plotContainer.textContent = `Error loading plot: ${error.message}`;
        });
}); 