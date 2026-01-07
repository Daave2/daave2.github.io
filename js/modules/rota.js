
// Rota Module - Fetches schedule from Gist and displays as Gantt chart

const GIST_URL = 'https://gist.githubusercontent.com/Daave2/7f720f7fd9ef5431fb56ae2e6fcfb762/raw';

// Chart config
const CHART_START = 6;  // 6am
const CHART_END = 23;   // 11pm

export async function initRota() {
    const container = document.getElementById('whos-in-container');
    if (!container) return;

    container.innerHTML = '<div class="rota-loading"><i class="fas fa-spinner fa-spin"></i> Loading schedule...</div>';

    try {
        const response = await fetch(GIST_URL);
        if (!response.ok) throw new Error('Failed to fetch schedule');
        const data = await response.json();

        const today = getTodayAbbrev();
        const staffToday = getStaffWorkingToday(data.employees, today);

        renderGanttChart(container, staffToday, data.week, today);

        // Update "now" line every minute
        setInterval(() => updateNowLine(container), 60000);

    } catch (error) {
        console.error('Rota Error:', error);
        container.innerHTML = '<div class="rota-error"><i class="fas fa-exclamation-triangle"></i> Could not load schedule</div>';
    }
}

function getTodayAbbrev() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date().getDay()];
}

function getStaffWorkingToday(employees, todayAbbrev) {
    const working = [];
    const seen = new Set();

    for (const emp of employees) {
        if (emp.schedule && emp.schedule[todayAbbrev]) {
            const key = emp.id;
            if (!seen.has(key)) {
                seen.add(key);
                const shift = parseShift(emp.schedule[todayAbbrev].scheduled);
                if (shift) {
                    working.push({
                        name: formatNameShort(emp.name),
                        department: emp.department,
                        start: shift.start,
                        end: shift.end
                    });
                }
            }
        }
    }

    // Sort by start time
    working.sort((a, b) => a.start - b.start);
    return working;
}

function formatNameShort(name) {
    // "Doherty, Dom" -> "Dom D."
    const parts = name.split(', ');
    if (parts.length === 2) {
        return `${parts[1]} ${parts[0].charAt(0)}.`;
    }
    return name;
}

function parseShift(shiftStr) {
    // "09:00 - 17:00 (7.50)" -> { start: 9, end: 17 }
    const match = shiftStr.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
    if (!match) return null;
    const startH = parseInt(match[1]) + parseInt(match[2]) / 60;
    const endH = parseInt(match[3]) + parseInt(match[4]) / 60;
    return { start: startH, end: endH };
}

function formatTime(decimalHour) {
    const hours = Math.floor(decimalHour);
    const mins = Math.round((decimalHour - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function renderGanttChart(container, staff, weekLabel, today) {
    if (staff.length === 0) {
        container.innerHTML = `
            <div class="rota-empty">
                <i class="fas fa-calendar-times"></i>
                <p>No one scheduled for ${today}</p>
            </div>
        `;
        return;
    }

    // Group by department
    const byDept = {};
    for (const person of staff) {
        if (!byDept[person.department]) byDept[person.department] = [];
        byDept[person.department].push(person);
    }

    // Sort each department by start time
    for (const dept of Object.values(byDept)) {
        dept.sort((a, b) => a.start - b.start);
    }

    const hours = [];
    for (let h = CHART_START; h <= CHART_END; h++) hours.push(h);
    const totalHours = CHART_END - CHART_START;

    // Generate positioned time labels
    const timeLabelsHtml = hours.map((h, i) => {
        const leftPercent = ((h - CHART_START) / totalHours) * 100;
        // Hide odd hours on tablet, show only every 3rd on mobile
        let hideClass = '';
        if (i % 2 === 1) hideClass = 'hide-tablet';
        if (i % 3 !== 0) hideClass += ' hide-mobile';
        return `<span class="gantt-hour ${hideClass}" style="left: ${leftPercent}%">${h}:00</span>`;
    }).join('');

    let html = `
        <div class="gantt-header">
            <span class="gantt-count"><i class="fas fa-users"></i> ${staff.length} in today</span>
            <span class="gantt-week">${weekLabel}</span>
        </div>
        <div class="gantt-chart">
            <div class="gantt-chart-inner">
                <div class="gantt-time-labels">
                    ${timeLabelsHtml}
                </div>
                <div class="gantt-now-line" id="gantt-now-line"></div>
                <div class="gantt-departments">
    `;

    for (const [dept, people] of Object.entries(byDept).sort((a, b) => a[0].localeCompare(b[0]))) {
        html += `
            <div class="gantt-dept">
                <div class="gantt-dept-header">
                    <span class="gantt-dept-name">${dept}</span>
                    <span class="gantt-dept-count">${people.length}</span>
                </div>
                <div class="gantt-rows">
        `;

        for (const person of people) {
            // Clamp start/end to chart bounds
            const clampedStart = Math.max(person.start, CHART_START);
            const clampedEnd = Math.min(person.end, CHART_END);

            const left = ((clampedStart - CHART_START) / totalHours) * 100;
            const width = Math.max(((clampedEnd - clampedStart) / totalHours) * 100, 2); // Min 2% width

            // Format times for display
            const startTime = formatTime(person.start);
            const endTime = formatTime(person.end);

            html += `
                <div class="gantt-row">
                    <span class="gantt-name">${person.name}</span>
                    <div class="gantt-bar-container">
                        <div class="gantt-bar" style="left: ${left}%; width: ${width}%;">
                            <span class="gantt-bar-time">${startTime} - ${endTime}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div></div>';
    }

    html += '</div></div></div>';
    container.innerHTML = html;

    updateNowLine(container);
}

function updateNowLine(container) {
    const nowLine = container.querySelector('#gantt-now-line');
    if (!nowLine) return;

    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const totalHours = CHART_END - CHART_START;

    if (currentHour >= CHART_START && currentHour <= CHART_END) {
        const leftPercent = ((currentHour - CHART_START) / totalHours) * 100;
        nowLine.style.left = `${leftPercent}%`;
        nowLine.style.display = 'block';
    } else {
        nowLine.style.display = 'none';
    }
}

