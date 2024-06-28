const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const investmentSlider = document.getElementById('investmentSlider');
const investmentInput = document.getElementById('investmentInput');
const indexSelect = document.getElementById('indexSelect');
const customRateInput = document.getElementById('customRateInput');
const customRate = document.getElementById('customRate');
const inflationRate = document.getElementById('inflationRate');
const taxOption = document.getElementById('taxOption');
const goalAmount = document.getElementById('goalAmount');
const resultsDiv = document.getElementById('results');
const ctx = document.getElementById('chart').getContext('2d');
let chart;

// Set default dates
const today = new Date();
startDateInput.value = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
endDateInput.value = new Date(today.getFullYear() + 1, today.getMonth(), 0).toISOString().split('T')[0];

// Sync slider and input
investmentSlider.addEventListener('input', () => investmentInput.value = investmentSlider.value);
investmentInput.addEventListener('input', () => investmentSlider.value = investmentInput.value);

// Mode button functionality
const modeButtons = document.querySelectorAll('.mode-button');
modeButtons.forEach(button => {
    button.addEventListener('click', () => {
        modeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        calculate();
    });
});

// Interest type button functionality
const interestButtons = document.querySelectorAll('.interest-button');
interestButtons.forEach(button => {
    button.addEventListener('click', () => {
        interestButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        calculate();
    });
});

// Tab functionality
const tabButtons = document.querySelectorAll('.tab-buttons button');
const tabContents = document.querySelectorAll('.tab-content');
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.dataset.tab;
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.add('active');
    });
});

// Show/hide custom rate input
indexSelect.addEventListener('change', () => {
    customRateInput.style.display = indexSelect.value === 'CUSTOM' ? 'block' : 'none';
    calculate();
});

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function calculate() {
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);
    const monthlyInvestment = parseFloat(investmentInput.value);
    const mode = document.querySelector('.mode-button.active').dataset.mode;
    const interestType = document.querySelector('.interest-button.active').dataset.interest;
    const selectedIndex = indexSelect.value;
    const inflationRateValue = parseFloat(inflationRate.value) / 100;
    const taxOptionValue = taxOption.value;
    const goalAmountValue = parseFloat(goalAmount.value);

    let total = 0;
    let invested = 0;
    const dataPoints = [];
    const labels = [];

    // Estimated annual returns for different indexes (adjust as needed)
    const annualReturns = {
        SP500: { past: 0.10, future: 0.08 },
        STOXX600: { past: 0.08, future: 0.07 },
        NIKKEI225: { past: 0.09, future: 0.07 },
        MSCIWORLD: { past: 0.09, future: 0.075 },
        NASDAQ: { past: 0.12, future: 0.10 },
        RUSSELL2000: { past: 0.11, future: 0.09 },
        CUSTOM: { past: parseFloat(customRate.value) / 100, future: parseFloat(customRate.value) / 100 }
    };

    const annualReturn = annualReturns[selectedIndex][mode];
    const monthlyReturn = Math.pow(1 + annualReturn, 1/12) - 1;

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        invested += monthlyInvestment;
        
        if (interestType === 'compound') {
            total = (total + monthlyInvestment) * (1 + monthlyReturn);
        } else {
            total += monthlyInvestment + (invested * monthlyReturn);
        }

        // Apply inflation adjustment
        total /= (1 + inflationRateValue / 12);

        dataPoints.push(total);
        labels.push(currentDate.toISOString().split('T')[0]);
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Apply tax
    let taxRate = 0;
    if (taxOptionValue === 'us') taxRate = 0.15; // Simplified US long-term capital gains tax
    if (taxOptionValue === 'germany') taxRate = 0.25; // Simplified German capital gains tax

    const gainBeforeTax = total - invested;
    const taxAmount = gainBeforeTax * taxRate;
    const totalAfterTax = total - taxAmount;

    resultsDiv.innerHTML = `
        <p>Total (Before Tax): <span class="result-value">${formatCurrency(total)}</span></p>
        <p>Total (After Tax): <span class="result-value">${formatCurrency(totalAfterTax)}</span></p>
        <p>Invested: <span class="result-value">${formatCurrency(invested)}</span></p>
        <p>Gained (After Tax): <span class="result-value">${formatCurrency(totalAfterTax - invested)}</span></p>
        <p>Tax Paid: <span class="result-value">${formatCurrency(taxAmount)}</span></p>
    `;

    if (goalAmountValue > 0) {
        const monthsToGoal = Math.ceil(Math.log(goalAmountValue / total) / Math.log(1 + monthlyReturn));
        resultsDiv.innerHTML += `<p>Months to reach goal: <span class="result-value">${monthsToGoal}</span></p>`;
    }

    if (chart) {
        chart.destroy();
    }

	    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Portfolio Value',
                data: dataPoints,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value, index, values) {
                            return formatCurrency(value);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += formatCurrency(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// Initial calculation
calculate();

// Add event listeners for real-time updates
document.querySelectorAll('input, select').forEach(element => {
    element.addEventListener('change', calculate);
});

// Comparison mode functionality (placeholder)
function compareIndexes() {
    // This function will be implemented when the comparison mode is developed
    console.log("Compare indexes functionality to be implemented");
}