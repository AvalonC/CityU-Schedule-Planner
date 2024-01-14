chrome.runtime.onMessage.addListener(({type, data}, s) => {
    if (type === "preview") {
        chrome.storage.local.set({ preview: data }, () => {
            chrome.windows.create({
                url: "preview.html",
                type: "popup",
                focused: true
            });
        });
    }
});

chrome.storage.local.get("wishlist", ({ wishlist }) => {
    if (wishlist) {
        chrome.action.setBadgeText({
            text: `${wishlist.length}`
        });
    }
    chrome.action.setBadgeBackgroundColor({
        color: "#68768a"
    });
})

chrome.storage.onChanged.addListener(({ wishlist }, n) => {
    if (n === "local" && wishlist != null) {
        chrome.action.setBadgeText({
            text: `${wishlist.newValue.length}`
        });
    }
});