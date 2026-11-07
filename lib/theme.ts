export type Theme = "light" | "dark";

export const THEME_KEY = "eventpass:theme";

/** Runs before first paint so a saved theme never flashes. Black is the default. */
export const themeScript = `(function(){try{document.documentElement.dataset.theme=localStorage.getItem(${JSON.stringify(THEME_KEY)})==="light"?"light":"dark"}catch(e){}})()`;
