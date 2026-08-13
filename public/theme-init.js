(function () {
  try {
    if (window.history && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  } catch {
    // ignore
  }
  try {
    var t = localStorage.getItem("app:theme");
    document.documentElement.dataset.theme = t === "light" || t === "navy" ? t : "navy";
  } catch {
    document.documentElement.dataset.theme = "navy";
  }
})();
