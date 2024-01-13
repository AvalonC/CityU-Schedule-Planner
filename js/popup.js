const tabBar = new mdc.tabBar.MDCTabBar(document.querySelector(".mdc-tab-bar")),
    t_addCrn = new mdc.textField.MDCTextField(document.querySelector("#add-crn")),
    list = new mdc.list.MDCList(document.querySelector("#crn-list")),
    snackbar = new mdc.snackbar.MDCSnackbar(document.querySelector('.mdc-snackbar')),
    s_autofill = new mdc.switchControl.MDCSwitch(document.querySelector('#autofill-switch-container')),
    d_details = new mdc.dialog.MDCDialog(document.querySelector("#section-details-dialog")),
    START_DATE = "2024-01-01 08:30:00",
    END_DATE = "2024-01-31 23:30:00",
    DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

snackbar.timeoutMs = 4000;

if (!(moment().isBetween(START_DATE, END_DATE, undefined, "[]"))) {
    $(".mdc-tab-bar").hide();
}

document.querySelectorAll(".mdc-button").forEach((v, i) => {
    mdc.ripple.MDCRipple.attachTo(v);
});

for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 7; j++) {
        let div$ = $("<div></div");
        if (j >= 5) {
            div$.addClass("weekend");
        }
        $(".timetable .background").append(div$);
    }
}

tabBar.listen("MDCTabBar:activated", ({ detail: { index } }) => {
    $(".tabbed-content").hide();
    $(`.tabbed-content:eq(${index})`).show();
});

s_autofill.listen("change", () => {
    chrome.storage.local.set({ autofill: s_autofill.checked }, () => {
        snackbar.labelText = "Auto-fill setting changed.";
        snackbar.open();
    });
});

chrome.storage.local.get(["ttb", "wishlist", "autofill"], ({ ttb, wishlist, autofill }) => {
    s_autofill.checked = autofill || false;

    if (ttb != null) {
        let m1 = moment(ttb.meta[2], "MMM DD, YYYY h:mm a");
        $("#meta-text").text(`${ttb.meta[0]}, ${ttb.meta[1]}, updated at ${m1.format("dddd, Do MMMM, YYYY HH:mm")}`);
        ttb.classes.forEach((i) => {
            i.times.forEach(j => {
                if (j === null || j.time === null) {
                    let div$ = $("<div></div>");
                    div$.html(`${i.name[1].replace(" ", "")} ${i.name[2]}`);
                    div$.attr("title", `${i.name[0]}\n${i.crn}\n${i.instruct}`);
                    div$.attr("data-crse", `${i.name[1]},${i.name[2]}`);
                    div$.click(showDetails);
                    $("#no-scheduled-time").show().append(div$);
                    return;
                }
                let times = j.time.map(t => new moment(t, "hh:mm a"));
                let id = `ttb-${j.day}-${times[0].hour() - 7}-${times[1].hour() - 6}`;
                if ($(`#${id}`).length === 0) {
                    let div$ = $("<div></div>");
                    div$.html(`${i.name[1].replace(" ", "")} <small>${i.name[2]}</small><br /><small>${j.loc}</small>`);
                    div$.attr("title", `${i.name[0]}\n${i.crn}\n${times[0].format("HH:mm")} - ${times[1].format("HH:mm")}\n${i.instruct}`);
                    div$.attr("id", id);
                    div$.attr("data-crse", `${i.name[1]},${i.name[2]}`);
                    div$.css({
                        "grid-row-start": `${times[0].hour() - 7}`,
                        "grid-row-end": `${times[1].hour() - 6}`,
                        "grid-column-start": `${j.day}`
                    });
                    div$.click(showDetails);
                    $(".timetable .content").append(div$);
                }
            });
        });
    }

    if (wishlist != null) {
        if (!wishlist.every(({ status }) => {
            return status == null || status.webenabled;
        })) {
            $("#has-non-web-enabled").show();
        }
        wishlist.forEach(({ crn, status }) => {
            let n = document.importNode(document.querySelector("#crn-item-template").content, true);
            $(n.children[0]).find(".mdc-checkbox__native-control").attr("id", `crn-${crn}`);
            $(n.children[0]).find(".mdc-list-item__text").attr("for", `crn-${crn}`);
            if (status == null) {
                $(n.children[0]).find(".mdc-list-item__primary-text").text(`${crn}`);
                $(n.children[0]).find(".mdc-list-item__secondary-text").append($("<span></span>").css("color", "red").text("Check Master Class Schedule for details."));
            } else {
                const { course, section, webenabled, avail, cap, waitlist, conflict, updated } = status;
                $(n.children[0]).find(".mdc-list-item__primary-text").text(`${crn} (${course} ${section})`);
                if (webenabled) {
                    let warn = false;
                    if (avail === 0) {
                        if (waitlist === false) {
                            warn = true;
                            $(n.children[0]).find(".mdc-list-item__secondary-text").append($("<span></span>").css("color", "red").text(`Section is full, waitlist not available`));
                        } else if (waitlist === 0) {
                            warn = true;
                            $(n.children[0]).find(".mdc-list-item__secondary-text").append($("<span></span>").css("color", "red").text(`Section is full, waitlist full`));
                        } else {
                            $(n.children[0]).find(".mdc-list-item__secondary-text").append($("<span></span>").css("color", "darkorange").text(`Section is full, waitlist remaining ${waitlist}`));
                        }
                    } else {
                        $(n.children[0]).find(".mdc-list-item__secondary-text").append($("<span></span>").css("color", "green").text(`Available: ${avail} / ${cap}`));
                    }
                    $(n.children[0]).find(".mdc-list-item__secondary-text").append("; ");
                    if (conflict) {
                        warn = true;
                        $(n.children[0]).find(".mdc-list-item__secondary-text").append($("<span></span>").css("color", "red").text(`Conflicts with ${conflict}`));
                    } else {
                        $(n.children[0]).find(".mdc-list-item__secondary-text").append($("<span></span>").css("color", "green").text(`No conflicts`));
                    }
                    if (warn) {
                        $(n.children[0]).append(`<i class="material-icons mdc-list-item__meta" aria-hidden="true">warning</i>`);
                    }
                } else {
                    $(n.children[0]).append(`<i class="material-icons mdc-list-item__meta" aria-hidden="true">error</i>`);
                    $(n.children[0]).find(".mdc-list-item__secondary-text").append($("<span></span>").css("color", "red").text(`Section not web-enabled`));
                }
                $(n.children[0]).find(".mdc-list-item__secondary-text").append("; ");
                $(n.children[0]).find(".mdc-list-item__secondary-text").append(`Updated ${moment(updated).fromNow()}`);
            }
            $(n.children[0]).attr("data-crn", crn).appendTo("#crn-list");
        });

        document.querySelectorAll(".mdc-list-item").forEach((v, i) => {
            mdc.ripple.MDCRipple.attachTo(v);
        });

        document.querySelectorAll(".mdc-checkbox").forEach((v, i) => {
            mdc.checkbox.MDCCheckbox.attachTo(v);
        });

        list.layout();
    }
});

$("#crn-list").on("change", ".mdc-checkbox__native-control", (e) => {
    if (e.target.checked)
        $(e.target).parents("li").addClass("mdc-list-item--selected");
    else
        $(e.target).parents("li").removeClass("mdc-list-item--selected");
})

$("#empty-button").click(() => emptyWishlist());

$("#delete-button").click(() => deleteCRN());

$("#add-crn-button").click(() => {
    if (t_addCrn.valid && t_addCrn.value !== "") {
        addCRNToWishlist(parseInt(t_addCrn.value));
        t_addCrn.value = "";
    }
});

$("#add-crn-input").keydown((e) => {
    if (e.keyCode === 13) {
        if (t_addCrn.valid && t_addCrn.value !== "") {
            addCRNToWishlist(parseInt(t_addCrn.value));
            t_addCrn.value = "";
        }
    }
})

function showDetails(e) {
    chrome.storage.local.get("ttb", ({ ttb }) => {
        $("#section-details-table .mdc-data-table__content").empty();
        let le = ttb.classes.find(v => {
            let g = $(e.target).data("crse").split(",");
            return v.name[1] === g[0] && v.name[2] === g[1];
        });
        if (le == null) return;
        let details = [
            ["Course Code", le.name[1].replace(" ", "")],
            ["Course Name", le.name[0]],
            ["Section", le.name[2]],
            ["CRN", le.crn],
            ["Time", le.times.map(w => w?.time?.join(" - ") ?? "").join("<br />")],
            ["Days", le.times.map(w => w ? DAYS[w.day] : "").join("<br />")],
            ["Where", le.times.map(w => w?.loc ?? "").join("<br />")],
            ["Date Range", le.times.map(w => w?.range?.join(" - ") ?? "").join("<br />")],
            ["Instructor", le.instruct]
        ];
        $("#section-details-table .mdc-data-table__content").append(details.map(de => {
            let n = document.importNode(document.querySelector("#data-table-row-template").content, true);
            $(n.children[0]).find(".details-name").text(de[0]);
            $(n.children[0]).find(".details-value").html(de[1]);
            return $(n.children[0]);
        }))
        d_details.open();
    })
}

function deleteCRN() {
    chrome.storage.local.get("wishlist", ({ wishlist }) => {
        let sel$ = $("#crn-list .mdc-list-item.mdc-list-item--selected");
        if (sel$.length > 0) {
            sel$.each((i, li) => wishlist.splice(wishlist.findIndex(({ crn }) => crn === $(li).data("crn")), 1));
            chrome.storage.local.set({ wishlist: wishlist }, () => {
                snackbar.labelText = "Selected CRNs are removed from wishlist.";
                snackbar.open();
                sel$.remove();
                list.layout();
            });
        } else {
            snackbar.labelText = "No CRN selected.";
            snackbar.open();
        }
    });
}

function emptyWishlist() {
    chrome.storage.local.set({ wishlist: [] }, () => {
        snackbar.labelText = "Wishlist cleared.";
        snackbar.open();
        $("#crn-list").empty();
        list.layout();
    });
}

function addCRNToWishlist(crn) {
    chrome.storage.local.get(["ttb", "wishlist"], ({ ttb, wishlist }) => {
        if (wishlist == null) {
            wishlist = [];
        }
        if (ttb.classes.findIndex(v => v.crn === crn) !== -1) {
            snackbar.labelText = "This course is already registered.";
            snackbar.open();
            return;
        }
        if (wishlist.includes(crn)) {
            snackbar.labelText = "CRN already exists.";
            snackbar.open();
            return;
        }
        wishlist.push({ crn: crn, status: null });
        chrome.storage.local.set({ wishlist: wishlist }, () => {
            snackbar.labelText = "CRN added to wishlist.";
            snackbar.open();
            let n = document.importNode(document.querySelector("#crn-item-template").content, true);
            $(n.children[0]).find(".mdc-checkbox__native-control").attr("id", `crn-${crn}`);
            $(n.children[0]).find(".mdc-list-item__text").attr("for", `crn-${crn}`);
            $(n.children[0]).find(".mdc-list-item__primary-text").text(crn);
            $(n.children[0]).find(".mdc-list-item__secondary-text").text("No details saved; Please check Master Class Schedule for details.");
            $(n.children[0]).attr("data-crn", crn).appendTo("#crn-list");

            list.layout();

            document.querySelectorAll(".mdc-list-item").forEach((v, i) => {
                mdc.ripple.MDCRipple.attachTo(v);
            });

            document.querySelectorAll(".mdc-checkbox").forEach((v, i) => {
                mdc.checkbox.MDCCheckbox.attachTo(v);
            });
        });
    });
    return false;
}