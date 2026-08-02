const toggle = document.querySelector("[data-nav-toggle]");
const navigation = document.querySelector("[data-site-navigation]");
if (toggle && navigation) {
    toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        navigation.hidden = expanded;
    });
    const wideViewport = window.matchMedia("(min-width: 48rem)");
    const syncNavigation = () => {
        navigation.hidden = !wideViewport.matches;
        toggle.setAttribute("aria-expanded", String(wideViewport.matches));
    };
    wideViewport.addEventListener("change", syncNavigation);
    syncNavigation();
}
export {};
