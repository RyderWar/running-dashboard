import { createShoeId } from "./shoes.js";

export const THEME_STORAGE_KEY = "themePreference";

const RUNS_STORAGE_KEY = "runs";
const SHOES_STORAGE_KEY = "shoes";

const storageItems = {
  runs: {
    key: RUNS_STORAGE_KEY,
    fallback: []
  },
  shoes: {
    key: SHOES_STORAGE_KEY,
    fallback: []
  }
};

function loadJson(key, fallbackValue) {
  try {
    const savedValue = localStorage.getItem(key);

    return savedValue ? JSON.parse(savedValue) : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadStorageItem(name) {
  const item = storageItems[name];

  return loadJson(item.key, item.fallback);
}

function saveStorageItem(name, value) {
  const item = storageItems[name];

  saveJson(item.key, value);
}

export function loadRuns() {
  return loadStorageItem("runs");
}

export function saveRuns(runs) {
  saveStorageItem("runs", runs);
}

export function loadShoes() {
  return loadStorageItem("shoes");
}

export function saveShoes(shoes) {
  saveStorageItem("shoes", shoes);
}

const WEEKLY_GOAL_STORAGE_KEY = "weeklyGoal";
const DEFAULT_WEEKLY_GOAL = 50;

export function loadWeeklyGoal(){
  const savedGoal = Number(localStorage.getItem(WEEKLY_GOAL_STORAGE_KEY));

  if (Number.isNaN(savedGoal) || savedGoal <= 0){
    return DEFAULT_WEEKLY_GOAL;
  }

  return savedGoal;
}

export function saveWeeklyGoal(goal){
    localStorage.setItem(WEEKLY_GOAL_STORAGE_KEY, String(goal));
}

export function loadThemePreference() {
  return localStorage.getItem(THEME_STORAGE_KEY);
}

export function saveThemePreference(theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function normalizeImportedRuns(importedRuns) {
  return importedRuns.map(function (run) {
    return {
      date: run.date || "",
      distance: run.distance || "",
      time: run.time || "",
      pace: run.pace || "",
      runType: run.runType || "",
      shoeId: run.shoeId || "",
      notes: run.notes || ""
    };
  });
}

export function normalizeImportedShoes(importedShoes) {
  return importedShoes.map(function (shoe) {
    return {
      id: shoe.id || createShoeId(),
      name: shoe.name || "Unnamed Shoe",
      startingMileage: Number(shoe.startingMileage) || 0
    };
  });
}

export function isValidImportedData(data) {
  return Boolean(
    data &&
    Array.isArray(data.runs) &&
    Array.isArray(data.shoes)
  );
}

export function getBackupFileName() {
  const today = new Date().toISOString().slice(0, 10);

  return `running-dashboard-backup-${today}.json`;
}
