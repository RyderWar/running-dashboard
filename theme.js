const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

export function normalizeTheme(theme) {
  return theme === "dark" ? "dark" : "light";
}

export function isSavedTheme(theme) {
  return theme === "dark" || theme === "light";
}

export function getSystemTheme() {
  if (window.matchMedia && window.matchMedia(SYSTEM_THEME_QUERY).matches) {
    return "dark";
  }

  return "light";
}

export function getPreferredTheme(savedTheme) {
  if (isSavedTheme(savedTheme)) {
    return savedTheme;
  }

  return getSystemTheme();
}

export function getNextTheme(theme) {
  return normalizeTheme(theme) === "dark" ? "light" : "dark";
}

export function watchSystemThemeChange(callback) {
  if (!window.matchMedia) {
    return;
  }

  window.matchMedia(SYSTEM_THEME_QUERY).addEventListener("change", function (event) {
    callback(event.matches ? "dark" : "light");
  });
}
