const container = document.getElementById('watchlist-container');

const STORAGE_KEY = 'watchlistProgress';
const LEGACY_KEYS = { mcu: 'mcuProgress', dc: 'dcProgress', xmen: 'xmenProgress' };

function readAllProgress() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}

function writeAllProgress(all) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function getProgress(universeKey) {
    return readAllProgress()[universeKey] || {};
}

function saveProgress(universeKey, progress) {
    const all = readAllProgress();
    all[universeKey] = progress;
    writeAllProgress(all);
}

// One-time merge of the legacy per-universe keys into the consolidated blob.
function migrateLegacyStorage() {
    const all = readAllProgress();
    let didMigrate = false;
    Object.entries(LEGACY_KEYS).forEach(([universeKey, legacyKey]) => {
        const raw = localStorage.getItem(legacyKey);
        if (raw === null) return;
        try {
            all[universeKey] = { ...(all[universeKey] || {}), ...JSON.parse(raw) };
            localStorage.removeItem(legacyKey);
            didMigrate = true;
        } catch (e) {
            console.warn(`Could not migrate legacy key '${legacyKey}'; leaving it in place.`, e);
        }
    });
    if (didMigrate) writeAllProgress(all);
}

function collapseIfAllChecked(detailsEl) {
    const checkboxes = detailsEl.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked)) {
        detailsEl.open = false;
    }
}

function buildWatchlist() {
    container.innerHTML = '';

    Object.keys(universalData).forEach(universeKey => {
        const universe = universalData[universeKey];
        const progress = getProgress(universeKey);

        const groupedData = universe.data.reduce((acc, item) => {
            (acc[item.category] = acc[item.category] || []).push(item);
            return acc;
        }, {});

        const universeDetails = document.createElement('details');
        universeDetails.className = 'bg-gray-800 rounded-lg';
        universeDetails.open = universeKey === 'mcu';

        const universeSummary = document.createElement('summary');
        universeSummary.className = `p-4 text-xl font-bold cursor-pointer flex justify-between items-center text-${universe.themeColor}-400`;
        universeSummary.innerHTML = `
            <span>${universe.title}</span>
            <svg class="summary-arrow w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        `;
        universeDetails.appendChild(universeSummary);

        const universeContent = document.createElement('div');
        universeContent.className = 'p-4 border-t border-gray-700 space-y-3';

        Object.keys(groupedData).forEach(categoryName => {
            const categoryDetails = document.createElement('details');
            categoryDetails.className = 'bg-gray-700/50 rounded-lg';
            categoryDetails.open = true;

            const categorySummary = document.createElement('summary');
            categorySummary.className = 'px-4 py-3 text-lg font-semibold cursor-pointer flex justify-between items-center';
            categorySummary.innerHTML = `
                <span>${categoryName}</span>
                <svg class="summary-arrow w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            `;
            categoryDetails.appendChild(categorySummary);

            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'px-4 pb-2 space-y-2';

            groupedData[categoryName].forEach(item => {
                const isChecked = progress[item.title] || false;

                let hindiBorder;
                let hindiBg;
                if (item.hindi === 'Yes') {
                    hindiBorder = 'border-l-4 border-l-green-500';
                    hindiBg = 'bg-green-500/10';
                } else {
                    hindiBorder = 'border-l-4 border-l-amber-500';
                    hindiBg = 'bg-amber-500/10';
                }

                const itemDiv = document.createElement('div');
                itemDiv.className = `p-3 ${hindiBorder} ${hindiBg} border-b border-gray-600/50 flex items-start space-x-4 ${isChecked ? 'text-gray-500' : ''}`;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = isChecked;
                checkbox.className = `mt-1 w-5 h-5 text-${universe.themeColor}-600 bg-gray-700 border-gray-600 rounded focus:ring-${universe.themeColor}-500 focus:ring-2 cursor-pointer flex-shrink-0`;
                checkbox.dataset.title = item.title;

                checkbox.addEventListener('change', (e) => {
                    const currentProgress = getProgress(universeKey);
                    currentProgress[item.title] = e.target.checked;
                    saveProgress(universeKey, currentProgress);
                    itemDiv.classList.toggle('text-gray-500', e.target.checked);

                    if (e.target.checked) {
                        collapseIfAllChecked(categoryDetails);
                        collapseIfAllChecked(universeDetails);
                    }
                });

                const textDiv = document.createElement('div');
                textDiv.className = 'flex-grow';

                const titleP = document.createElement('p');
                titleP.className = 'font-semibold';
                titleP.textContent = `${item.title} (${item.year})`;

                const detailsP = document.createElement('p');
                detailsP.className = 'text-sm text-gray-400';

                let platformText = '';
                if (item.hotstar) {
                    platformText = `Hotstar: ${item.hotstar}, `;
                } else if (item.ott) {
                    platformText = `Platform: ${item.ott}, `;
                }
                detailsP.appendChild(document.createTextNode(platformText));

                const hindiSpan = document.createElement('span');
                const hindiTextColor = item.hindi === 'Yes' ? 'text-green-400' : 'text-amber-400';
                hindiSpan.className = `font-medium ${hindiTextColor}`;
                hindiSpan.textContent = `Hindi: ${item.hindi}`;
                detailsP.appendChild(hindiSpan);

                textDiv.appendChild(titleP);
                textDiv.appendChild(detailsP);
                itemDiv.appendChild(checkbox);
                itemDiv.appendChild(textDiv);
                itemsContainer.appendChild(itemDiv);
            });

            categoryDetails.appendChild(itemsContainer);
            universeContent.appendChild(categoryDetails);
            collapseIfAllChecked(categoryDetails);
        });

        universeDetails.appendChild(universeContent);
        container.appendChild(universeDetails);
        collapseIfAllChecked(universeDetails);
    });
}

migrateLegacyStorage();

// First-time setup: pre-mark MCU items as watched up through the user's last seen episode.
if (!('mcu' in readAllProgress())) {
    const progress = {};
    const cutoffTitle = "Your Friendly Neighborhood Spider-Man";
    let pastCutoff = false;
    universalData.mcu.data.forEach(item => {
        if (!pastCutoff) progress[item.title] = true;
        if (item.title === cutoffTitle) pastCutoff = true;
    });
    saveProgress('mcu', progress);
}

buildWatchlist();
