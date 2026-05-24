import { updateRunCharts } from "./charts.js";
import {
  getBackupFileName,
  isValidImportedData,
  loadRuns,
  loadShoes,
  loadThemePreference,
  normalizeImportedRuns,
  normalizeImportedShoes,
  saveRuns as persistRuns,
  saveShoes as persistShoes,
  saveThemePreference,
  loadWeeklyGoal,
  saveWeeklyGoal
} from "./storage.js";
import {
  createShoeId,
  getShoeById,
  renderShoes
} from "./shoes.js";
import {
  calculatePace,
  createEmptyState,
  escapeHtml,
  formatRunDate,
  formatSeconds,
  getCurrentWeekRuns,
  getRunStats,
  isValidTimeFormat
} from "./utils.js";
import {
  getNextTheme,
  getPreferredTheme,
  normalizeTheme,
  watchSystemThemeChange
} from "./theme.js";

const elements = {
  runForm: document.getElementById("runForm"),
  runsContainer: document.getElementById("runsContainer"),
  weeklyMileage: document.getElementById("weeklyMileage"),
  weeklyGoal: document.getElementById("weeklyGoal"),
  goalPercent: document.getElementById("goalPercent"),
  progressFill: document.getElementById("progressFill"),
  filterType: document.getElementById("filterType"),
  searchRuns: document.getElementById("searchRuns"),
  runsThisWeek: document.getElementById("runsThisWeek"),
  averagePace: document.getElementById("averagePace"),
  longestRun: document.getElementById("longestRun"),
  weeklyTime: document.getElementById("weeklyTime"),
  themeToggle: document.getElementById("themeToggle"),
  shoeForm: document.getElementById("shoeForm"),
  shoeName: document.getElementById("shoeName"),
  shoeStartingMileage: document.getElementById("shoeStartingMileage"),
  shoeSubmitButton: document.getElementById("shoeSubmitButton"),
  shoesContainer: document.getElementById("shoesContainer"),
  shoeSelect: document.getElementById("shoeSelect"),
  runSubmitButton: document.getElementById("runSubmitButton"),
  exportDataButton: document.getElementById("exportDataButton"),
  importDataInput: document.getElementById("importDataInput"),
  chartsEmptyState: document.getElementById("chartsEmptyState"),
  chartsGrid: document.querySelector(".charts-grid"),
  messageRegion: document.getElementById("messageRegion"),
  confirmModal: document.getElementById("confirmModal"),
  confirmTitle: document.getElementById("confirmTitle"),
  confirmMessage: document.getElementById("confirmMessage"),
  confirmCancelButton: document.getElementById("confirmCancelButton"),
  confirmActionButton: document.getElementById("confirmActionButton"),
  weeklyGoalForm: document.getElementById("weeklyGoalForm"),
  weeklyGoalInput: document.getElementById("weeklyGoalInput")
};

let runs = loadRuns();
let shoes = loadShoes();
let editingRunIndex = null;
let editingShoeId = null;

let weeklyGoal = loadWeeklyGoal();

function setTheme(theme) {
  const nextTheme = normalizeTheme(theme);

  document.body.dataset.theme = nextTheme;

  if (elements.themeToggle) {
    const isDark = nextTheme === "dark";

    elements.themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
    elements.themeToggle.setAttribute("aria-pressed", isDark.toString());
  }
}

function saveTheme(theme) {
  saveThemePreference(theme);
  setTheme(theme);
  updateRunCharts(runs);
}

function saveRuns() {
  persistRuns(runs);
}

function saveShoes() {
  persistShoes(shoes);
}

function clearMessage() {
  if (elements.messageRegion) {
    elements.messageRegion.innerHTML = "";
  }
}

function showMessage(type, title, detail) {
  if (!elements.messageRegion) {
    return;
  }

  const messageType = type === "success" || type === "warning" ? type : "error";
  const detailMarkup = detail ? `<p>${escapeHtml(detail)}</p>` : "";

  elements.messageRegion.innerHTML = `
    <div class="app-message message-${messageType}">
      <div>
        <strong>${escapeHtml(title)}</strong>
        ${detailMarkup}
      </div>
      <button class="message-close" type="button" aria-label="Dismiss message">&times;</button>
    </div>
  `;

  const closeButton = elements.messageRegion.querySelector(".message-close");

  if (closeButton) {
    closeButton.addEventListener("click", clearMessage);
  }
}

function showConfirm(options) {
  if (
    !elements.confirmModal ||
    !elements.confirmTitle ||
    !elements.confirmMessage ||
    !elements.confirmCancelButton ||
    !elements.confirmActionButton
  ) {
    return Promise.resolve(false);
  }

  elements.confirmTitle.textContent = options.title;
  elements.confirmMessage.textContent = options.message;
  elements.confirmActionButton.textContent = options.confirmText || "Confirm";
  elements.confirmActionButton.className = options.confirmClass || "delete-btn";
  elements.confirmModal.hidden = false;
  elements.confirmActionButton.focus();

  return new Promise(function (resolve) {
    function closeModal(confirmed) {
      elements.confirmModal.hidden = true;
      elements.confirmActionButton.removeEventListener("click", confirmHandler);
      elements.confirmCancelButton.removeEventListener("click", cancelHandler);
      elements.confirmModal.removeEventListener("click", backdropHandler);
      document.removeEventListener("keydown", keyHandler);
      resolve(confirmed);
    }

    function confirmHandler() {
      closeModal(true);
    }

    function cancelHandler() {
      closeModal(false);
    }

    function backdropHandler(event) {
      if (event.target === elements.confirmModal) {
        closeModal(false);
      }
    }

    function keyHandler(event) {
      if (event.key === "Escape") {
        closeModal(false);
      }
    }

    elements.confirmActionButton.addEventListener("click", confirmHandler);
    elements.confirmCancelButton.addEventListener("click", cancelHandler);
    elements.confirmModal.addEventListener("click", backdropHandler);
    document.addEventListener("keydown", keyHandler);
  });
}

function getRunSummary(run) {
  if (!run) {
    return "this run";
  }

  const runType = run.runType || "Run";
  const runDateText = run.date ? formatRunDate(run.date) : "no date";

  return `${runType} from ${runDateText}`;
}

function displayShoes() {
  renderShoes({
    shoesContainer: elements.shoesContainer,
    shoeSelect: elements.shoeSelect,
    shoes: shoes,
    runs: runs
  });
}

function editShoe(targetShoeId) {
  const shoe = getShoeById(shoes, targetShoeId);

  if (!shoe) {
    return;
  }

  elements.shoeName.value = shoe.name;
  elements.shoeStartingMileage.value = shoe.startingMileage;
  editingShoeId = targetShoeId;
  elements.shoeSubmitButton.textContent = "Update Shoe";
}

async function deleteShoe(targetShoeId) {
  const shoe = getShoeById(shoes, targetShoeId);

  if (!shoe) {
    showMessage("error", "Shoe not found.", "Refresh the page and try again.");
    return;
  }

  const confirmed = await showConfirm({
    title: "Delete shoe?",
    message: `${shoe.name} will be removed from your shoe tracker. Existing runs will stay saved, but they will no longer have this shoe assigned.`,
    confirmText: "Delete Shoe",
    confirmClass: "delete-btn"
  });

  if (!confirmed) {
    return;
  }

  shoes = shoes.filter(function (existingShoe) {
    return existingShoe.id !== targetShoeId;
  });

  runs = runs.map(function (run) {
    if (run.shoeId !== targetShoeId) {
      return run;
    }

    return {
      ...run,
      shoeId: ""
    };
  });

  if (editingShoeId === targetShoeId) {
    editingShoeId = null;
    elements.shoeForm.reset();
    elements.shoeSubmitButton.textContent = "Add Shoe";
  }

  saveShoes();
  saveRuns();
  displayShoes();
  displayRuns();
  showMessage("success", "Shoe deleted.", `${shoe.name} was removed from your shoe tracker.`);
}

function exportData() {
  const exportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    runs: runs,
    shoes: shoes
  };
  const backupBlob = new Blob([JSON.stringify(exportPayload, null, 2)], {
    type: "application/json"
  });
  const downloadUrl = URL.createObjectURL(backupBlob);
  const downloadLink = document.createElement("a");

  downloadLink.href = downloadUrl;
  downloadLink.download = getBackupFileName();
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(downloadUrl);
}

function importData(file) {
  const fileReader = new FileReader();

  fileReader.addEventListener("load", async function () {
    try {
      const importedData = JSON.parse(fileReader.result);

      if (!isValidImportedData(importedData)) {
        showMessage("error", "Import failed.", "Choose a JSON backup exported from this dashboard.");
        return;
      }

      const importedRuns = normalizeImportedRuns(importedData.runs);
      const importedShoes = normalizeImportedShoes(importedData.shoes);
      const confirmed = await showConfirm({
        title: "Replace current data?",
        message: `Importing this backup will replace your current ${runs.length} runs and ${shoes.length} shoes with ${importedRuns.length} runs and ${importedShoes.length} shoes from the file.`,
        confirmText: "Import Data",
        confirmClass: "delete-btn"
      });

      if (!confirmed) {
        showMessage("warning", "Import canceled.", "Your current running data was not changed.");
        return;
      }

      runs = importedRuns;
      shoes = importedShoes;

      saveRuns();
      saveShoes();
      displayShoes();
      displayRuns();

      showMessage("success", "Data imported.", `Imported ${runs.length} runs and ${shoes.length} shoes.`);
    } catch (error) {
      showMessage("error", "Import failed.", "That file could not be read as valid JSON. Choose a dashboard backup file and try again.");
    } finally {
      elements.importDataInput.value = "";
    }
  });

  fileReader.addEventListener("error", function () {
    showMessage("error", "Import failed.", "The selected file could not be read. Try choosing it again.");
    elements.importDataInput.value = "";
  });

  fileReader.readAsText(file);
}

function updateWeeklyStats() {
  const currentWeekRuns = getCurrentWeekRuns(runs);
  const currentWeekStats = getRunStats(currentWeekRuns);

  const percentComplete = Math.round((currentWeekStats.totalMileage / weeklyGoal) * 100);
  const cappedPercent = Math.min(percentComplete, 100);

  elements.weeklyMileage.textContent = currentWeekStats.totalMileage;
  elements.weeklyGoal.textContent = weeklyGoal;
  elements.goalPercent.textContent = cappedPercent;
  elements.progressFill.style.width = cappedPercent + "%";

  if (currentWeekRuns.length === 0) {
    elements.runsThisWeek.textContent = "No runs yet";
    elements.averagePace.textContent = "No runs yet";
    elements.longestRun.textContent = "No runs yet";
    elements.weeklyTime.textContent = "No runs yet";
    return;
  }

  elements.runsThisWeek.textContent = currentWeekRuns.length;
  elements.averagePace.textContent = `${formatSeconds(currentWeekStats.totalPaceSeconds / currentWeekRuns.length, { forceMinutes: true })} / mile`;
  elements.longestRun.textContent = `${currentWeekStats.longestDistance} miles`;
  elements.weeklyTime.textContent = formatSeconds(currentWeekStats.totalSeconds);
}

function displayRuns() {
  updateWeeklyStats();
  displayShoes();

  if (elements.chartsEmptyState && elements.chartsGrid) {
    const hasRuns = runs.length > 0;

    elements.chartsEmptyState.hidden = hasRuns;
    elements.chartsGrid.hidden = !hasRuns;
  }

  updateRunCharts(runs);

  elements.runsContainer.innerHTML = "";

  if (runs.length === 0) {
    elements.runsContainer.innerHTML = createEmptyState("No runs yet. Log your first run to start tracking.");
    return;
  }

  const selectedRunTypeFilter = elements.filterType.value;
  const searchTerm = elements.searchRuns.value.trim().toLowerCase();

  const visibleRuns = runs
    .map(function (run, index) {
      return {
        run: run,
        originalIndex: index
      };
    })
    .filter(function (item) {
      const runType = item.run.runType || "";
      const notes = item.run.notes || "";
      const matchesFilter = selectedRunTypeFilter === "All" || runType === selectedRunTypeFilter;
      const matchesSearch =
        searchTerm === "" ||
        runType.toLowerCase().includes(searchTerm) ||
        notes.toLowerCase().includes(searchTerm);

      return matchesFilter && matchesSearch;
    });

  visibleRuns.sort(function (itemA, itemB) {
    return new Date(itemB.run.date) - new Date(itemA.run.date);
  });

  if (visibleRuns.length === 0) {
    elements.runsContainer.innerHTML = createEmptyState("No runs match your search or filter.");
    return;
  }

  visibleRuns.forEach(function (item) {
    const run = item.run;
    const index = item.originalIndex;
    const assignedShoe = getShoeById(shoes, run.shoeId);

    const runCard = document.createElement("div");
    runCard.classList.add("run-card");

    runCard.innerHTML = `
      <h3>${escapeHtml(run.runType)}</h3>
      <p><strong>Date:</strong> ${formatRunDate(run.date)}</p>
      <p><strong>Distance:</strong> ${escapeHtml(run.distance)} miles</p>
      <p><strong>Time:</strong> ${escapeHtml(run.time)}</p>
      <p><strong>Pace:</strong> ${escapeHtml(run.pace || calculatePace(run.distance, run.time))} / mile</p>
      <p><strong>Shoe:</strong> ${assignedShoe ? escapeHtml(assignedShoe.name) : "No shoe selected"}</p>
      <p><strong>Notes:</strong> ${escapeHtml(run.notes)}</p>
      <div class="card-actions">
        <button class="edit-btn" type="button" data-run-action="edit" data-run-index="${index}">Edit</button>
        <button class="delete-btn" type="button" data-run-action="delete" data-run-index="${index}">Delete</button>
      </div>
    `;

    elements.runsContainer.append(runCard);
  });
}

function editRun(targetRunIndex) {
  const run = runs[targetRunIndex];

  if (!run) {
    return;
  }

  document.getElementById("runDate").value = run.date || "";
  document.getElementById("distance").value = run.distance;
  document.getElementById("time").value = run.time;
  document.getElementById("runType").value = run.runType;
  elements.shoeSelect.value = run.shoeId || "";
  document.getElementById("notes").value = run.notes;

  editingRunIndex = targetRunIndex;

  elements.runSubmitButton.textContent = "Update Run";
}

async function deleteRun(targetRunIndex) {
  const run = runs[targetRunIndex];

  if (!run) {
    showMessage("error", "Run not found.", "Refresh the page and try again.");
    return;
  }

  const confirmed = await showConfirm({
    title: "Delete run?",
    message: `${getRunSummary(run)} will be permanently removed from your saved runs.`,
    confirmText: "Delete Run",
    confirmClass: "delete-btn"
  });

  if (!confirmed) {
    return;
  }

  runs.splice(targetRunIndex, 1);

  saveRuns();

  displayRuns();
  showMessage("success", "Run deleted.", `${getRunSummary(run)} was removed.`);
}

function handleShoeSubmit(event) {
  event.preventDefault();

  const trimmedName = elements.shoeName.value.trim();
  const startingMileageValue = elements.shoeStartingMileage.value;
  const startingMileageNumber = startingMileageValue === "" ? 0 : Number(startingMileageValue);
  const isEditingShoe = editingShoeId !== null;

  if (!trimmedName) {
    showMessage("error", "Shoe name is required.", "Enter the shoe name before saving.");
    return;
  }

  if (Number.isNaN(startingMileageNumber) || startingMileageNumber < 0) {
    showMessage("error", "Starting mileage is invalid.", "Enter 0 or a positive number.");
    return;
  }

  if (editingShoeId === null) {
    shoes.push({
      id: createShoeId(),
      name: trimmedName,
      startingMileage: startingMileageNumber
    });
  } else {
    shoes = shoes.map(function (shoe) {
      if (shoe.id !== editingShoeId) {
        return shoe;
      }

      return {
        ...shoe,
        name: trimmedName,
        startingMileage: startingMileageNumber
      };
    });

    editingShoeId = null;
    elements.shoeSubmitButton.textContent = "Add Shoe";
  }

  saveShoes();
  elements.shoeForm.reset();
  displayShoes();
  displayRuns();
  showMessage("success", isEditingShoe ? "Shoe updated." : "Shoe saved.", `${trimmedName} is ready for mileage tracking.`);
}

function handleRunSubmit(event) {
  event.preventDefault();

  const runDateValue = document.getElementById("runDate").value;
  const distance = document.getElementById("distance").value;
  const time = document.getElementById("time").value;
  const runType = document.getElementById("runType").value;
  const selectedShoeId = elements.shoeSelect.value;
  const notes = document.getElementById("notes").value;
  const distanceNumber = Number(distance);

  if (!runDateValue) {
    showMessage("error", "Run date is required.", "Choose the date for this run before saving.");
    return;
  }

  if (!distance || Number.isNaN(distanceNumber) || distanceNumber <= 0) {
    showMessage("error", "Distance is invalid.", "Enter a distance greater than 0.");
    return;
  }

  if (!time || !isValidTimeFormat(time)) {
    showMessage("error", "Time format is invalid.", "Use MM:SS or H:MM:SS, like 40:00 or 1:05:30.");
    return;
  }

  if (!runType) {
    showMessage("error", "Run type is required.", "Choose the run type before saving.");
    return;
  }

  const pace = calculatePace(distance, time);

  const newRun = {
    date: runDateValue,
    distance: distance,
    time: time,
    pace: pace,
    runType: runType,
    shoeId: selectedShoeId,
    notes: notes
  };

  const isEditingRun = editingRunIndex !== null;

  if (editingRunIndex === null) {
    runs.push(newRun);
  } else {
    runs[editingRunIndex] = newRun;
    editingRunIndex = null;
    elements.runSubmitButton.textContent = "Save Run";
  }

  saveRuns();

  displayRuns();

  elements.runForm.reset();
  elements.shoeSelect.value = "";
  showMessage("success", isEditingRun ? "Run updated." : "Run saved.", `${runType} on ${formatRunDate(runDateValue)} is now in your log.`);
}

function handleRunActionClick(event) {
  const actionButton = event.target.closest("[data-run-action]");

  if (!actionButton) {
    return;
  }

  const targetRunIndex = Number(actionButton.dataset.runIndex);

  if (actionButton.dataset.runAction === "edit") {
    editRun(targetRunIndex);
    return;
  }

  if (actionButton.dataset.runAction === "delete") {
    deleteRun(targetRunIndex);
  }
}

function handleShoeActionClick(event) {
  const actionButton = event.target.closest("[data-shoe-action]");

  if (!actionButton) {
    return;
  }

  const targetShoeId = actionButton.dataset.shoeId;

  if (actionButton.dataset.shoeAction === "edit") {
    editShoe(targetShoeId);
    return;
  }

  if (actionButton.dataset.shoeAction === "delete") {
    deleteShoe(targetShoeId);
  }
}

function handleWeeklyGoalSubmit(event){
  event.preventDefault();

  const goalValue = Number(elements.weeklyGoalInput.value);

  if(Number.isNaN(goalValue) || goalValue <= 0){
    showMessage(
      "error",
      "Invalid weekly goal.",
      "Enter a number greater than 0."
    );

    return;
  }

  weeklyGoal = goalValue;

  saveWeeklyGoal(weeklyGoal);

  updateWeeklyStats();

  showMessage(
    "success",
    "Weekly goal updated.",
    `Your weekly goal is now ${weeklyGoal} miles.`
  );
}

function bindEventListeners() {
  elements.shoeForm.addEventListener("submit", handleShoeSubmit);
  elements.runForm.addEventListener("submit", handleRunSubmit);
  elements.filterType.addEventListener("change", displayRuns);
  elements.searchRuns.addEventListener("input", displayRuns);
  elements.runsContainer.addEventListener("click", handleRunActionClick);
  elements.shoesContainer.addEventListener("click", handleShoeActionClick);

  if (elements.themeToggle) {
    elements.themeToggle.addEventListener("click", function () {
      saveTheme(getNextTheme(document.body.dataset.theme));
    });
  }

  watchSystemThemeChange(function (systemTheme) {
    if (!loadThemePreference()) {
      setTheme(systemTheme);
      updateRunCharts(runs);
    }
  });

  if (elements.exportDataButton) {
    elements.exportDataButton.addEventListener("click", function () {
      exportData();
      showMessage("success", "Backup exported.", "Your running dashboard backup download has started.");
    });
  }

  if (elements.importDataInput) {
    elements.importDataInput.addEventListener("change", function () {
      const selectedFile = elements.importDataInput.files[0];

      if (selectedFile) {
        importData(selectedFile);
      }
    });
  }

  if (elements.weeklyGoalForm){
    elements.weeklyGoalForm.addEventListener(
      "submit",
      handleWeeklyGoalSubmit
    );
  }
}

function initializeApp() {
  bindEventListeners();
  setTheme(getPreferredTheme(loadThemePreference()));
  document.getElementById("runDate").valueAsDate = new Date();
  displayShoes();
  if (elements.weeklyGoalInput){
    elements.weeklyGoalInput.value = weeklyGoal;
  }
  displayRuns();
}

initializeApp();
