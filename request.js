const copyButton = document.querySelector("[data-copy-request]");
const requestTemplate = document.querySelector("[data-request-template]");
const copyStatus = document.querySelector("[data-copy-status]");
copyButton?.addEventListener("click", async () => {
    if (!requestTemplate || !copyStatus) {
        return;
    }
    try {
        await navigator.clipboard.writeText(requestTemplate.value);
        copyStatus.textContent = "Request text copied.";
    }
    catch {
        requestTemplate.focus();
        requestTemplate.select();
        copyStatus.textContent =
            "Copying did not work. Request text selected; use your device's copy command.";
    }
});
export {};
