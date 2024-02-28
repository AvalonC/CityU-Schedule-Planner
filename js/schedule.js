const enrol = new mdc.list.MDCList(document.querySelector("#enrolled-list")),
    wishl = new mdc.list.MDCList(document.querySelector("#wish-list")),
    DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];


for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 7; j++) {
        let div$ = $("<div></div");
        if (j >= 5) {
            div$.addClass("weekend");
        }
        $(".timetable .background").append(div$);
    }
}

chrome.storage.local.get(["ttb", "timetable", "display", "schedule", "modified"], ({ ttb, timetable, display, schedule, modified }) => {
    $("#topnav").append(`<a> Current: ${ttb.meta[1]}</a>`);
    schedule.forEach((i) => {
        if (i.status === null) {
            alert("detect the crn without detailed information, they won't show in the preview.")
            let index = schedule.indexOf(i);
            schedule.splice(index, 1);
            return true;
        }
        else {
            let periodp = i.status.period.map(t => new moment(t, "HH:mm"));
            let divp$ = $("<div></div");
            divp$.html(`${i.status.course} <small>${i.status.section}</small><br />`);
            divp$.attr("title", `${i.status.course} < Preview >\n${i.status.crn}\n${periodp[0].format("HH:mm")} - ${periodp[1].format("HH:mm")}`);
            divp$.attr("id", "ttb-preview-block");
            divp$.addClass("preview");
            divp$.css({
                "grid-row-start": `${periodp[0].hour() - 7}`,
                "grid-row-end": `${periodp[1].hour() - 6}`,
                "grid-column-start": `${i.status.date}`
            });
            $(".timetable .content").append(divp$);
        }
    })

    if (!schedule.every(({ status }) => {
        return status == null || status.webenabled;
    })) {
        $("#has-non-web-enabled").show();
    }
    schedule.forEach(({ crn, status }) => {
        let n = document.importNode(document.querySelector("#wish-item-template").content, true);
        $(n.children[0]).find(".mdc-checkbox__native-control").attr("id", `crn-${crn}`);
        $(n.children[0]).find(".mdc-list-item__text").attr("for", `crn-${crn}`);
        if (status == null) {
            $(n.children[0]).find(".mdc-list-item__primary-text").text(`${crn}`);
            $(n.children[0]).find(".mdc-list-item__secondary-text").append($("<span></span>").css("color", "red").text("Check Master Class Schedule for details."));
        } else {
            const { course, section, webenabled, avail, date, period, cap, waitlist, conflict, updated } = status;
            //Insert Course Section (CRN)
            $(n.children[0]).find(".mdc-list-item__primary-text").text(`${course} ${section} | `);
            $(n.children[0]).find(".mdc-list-item__primary-text").append($("<span></span>").text(`${DAYS[date]}`));
            $(n.children[0]).find(".mdc-list-item__secondary-text").append($("<span></span>").css("font-weight", "bold").text(`${period[0]} - ${period[1]}`));
        }
        $(n.children[0]).attr("data-crn", crn).appendTo("#wish-list");
    });

    document.querySelectorAll(".mdc-list-item").forEach((v, i) => {
        mdc.ripple.MDCRipple.attachTo(v);
    });

    document.querySelectorAll(".mdc-checkbox").forEach((v, i) => {
        mdc.checkbox.MDCCheckbox.attachTo(v);
    });

    wishl.layout();

    $("#wish-list").on("change", ".mdc-checkbox__native-control", (e) => {
        if (e.target.checked)
            $(e.target).parents("li").addClass("mdc-list-item--selected");
        else
            $(e.target).parents("li").removeClass("mdc-list-item--selected");
    })


    if (display != true) {
        if (modified != true) {
            timetable = ttb;
            displayTimeTable(timetable);
            chrome.storage.local.set({ timetable: timetable })
            return false;
        }
        else {
            displayTimeTable(timetable);
        }
        chrome.storage.local.set({ timetable: timetable });
    }
});

$("#preview-button").click(() => scheduleReload());

$("#reset-button").click(() => restoreEnrolled());

$("#download-button").click(() => saveAsPic());

function displayTimeTable(timetable) {

    // let m1 = moment(timetable.meta[2], "MMM DD, YYYY h:mm a");
    // $("#meta-text").text(`${timetable.meta[0]}, ${timetable.meta[1]}, updated at ${m1.format("dddd, Do MMMM, YYYY HH:mm")}`);
    timetable.classes.forEach((i) => {
        i.times.forEach(j => {
            if (j === null || j.time === null) {
                let div$ = $("<div></div>");
                div$.html(`${i.name[1].replace(" ", "")} ${i.name[2]}`);
                div$.attr("title", `${i.name[0]}\n${i.crn}\n${i.instruct}`);
                div$.attr("data-crse", `${i.name[1]},${i.name[2]}`);
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
                $(".timetable .content").append(div$);
            }
        });
        let n = document.importNode(document.querySelector("#enrol-item-template").content, true);
        $(n.children[0]).find(".mdc-checkbox__native-control").attr("id", `crn-${i.crn}`);
        $(n.children[0]).find(".mdc-list-item__text").attr("for", `crn-${i.crn}`);
        //Insert Course Section 
        $(n.children[0]).find(".mdc-list-item__primary-text").text(`${i.name[1]} ${i.name[2]} | `);
        weekday = i.times[0].day;
        $(n.children[0]).find(".mdc-list-item__primary-text").append($("<span></span>").text(`${DAYS[weekday]}`));
        i.times.forEach(j => {
            if (j === null || j.time === null) {
                let div$ = $("<div></div>");
                div$.html(`${i.name[1].replace(" ", "")} ${i.name[2]}`);
                div$.attr("title", `${i.name[0]}\n${i.crn}\n${i.instruct}`);
                div$.attr("data-crse", `${i.name[1]},${i.name[2]}`);
                $("#no-scheduled-time").show().append(div$);
                return;
            }
            let times = j.time.map(t => new moment(t, "hh:mm a"));
            $(n.children[0]).find(".mdc-list-item__secondary-text").append($("<span></span>").css("font-weight", "bold").text(`${times[0].format("HH:mm")} - ${times[1].format("HH:mm")}`));
        })
        $(n.children[0]).attr("data-crn", i.crn).appendTo("#enrolled-list");

        document.querySelectorAll(".mdc-list-item").forEach((v, i) => {
            mdc.ripple.MDCRipple.attachTo(v);
        });
        document.querySelectorAll(".mdc-checkbox").forEach((v, i) => {
            mdc.checkbox.MDCCheckbox.attachTo(v);
        });
    })
    enrol.layout();
    $("#enrolled-list").on("change", ".mdc-checkbox__native-control", (e) => {
        if (e.target.checked)
            $(e.target).parents("li").addClass("mdc-list-item--selected");
        else
            $(e.target).parents("li").removeClass("mdc-list-item--selected");
    })
}

function scheduleReload() {

    let selectWish = $("#wish-list .mdc-list-item.mdc-list-item--selected");
    let selectEnroll = $("#enrolled-list .mdc-list-item.mdc-list-item--selected");

    chrome.storage.local.get(["ttb", "wishlist", "schedule", "timetable", "display"], ({ ttb, wishlist, schedule, timetable, display }) => {

        if (selectWish.length == 0 && selectEnroll.length == 0) {
            alert("You didn't choose any course(s) to keep.");
            return false;
        }
        else {
            schedule = [];
            classes = [];
            //用CRN从Wishlist中找到指定课程，并将其保存在schedule
            selectWish.each(function (i, li) {
                selCou = wishlist.find(selCou => selCou.crn === $(li).data("crn"));
                schedule.push(selCou);
            })
            chrome.storage.local.set({ schedule: schedule });
            selectEnroll.each(function (i, li) {
                selEnrl = timetable.classes.find(selEnrl => selEnrl.crn === $(li).data("crn"));
                classes.push(selEnrl);
            })
            meta = ttb.meta
            chrome.storage.local.set({ timetable: { meta, classes } });
            if (display == false) {
                chrome.storage.local.set({ modified: true })
            }
            location.reload();
        }
    })
}

function restoreEnrolled() {
    chrome.storage.local.get(["display"], (display) => {
        if (display.display == true) {
            alert("You required that \" Do not display timetable \", Please modified setting, close page and restart.");
        }
        else {
            confirm("You will restore every courses that already enrolled\nProcess?");
            chrome.storage.local.get(["timetable"], (timetable) => {
                timetable = [];
                chrome.storage.local.set({ timetable: timetable });
                chrome.storage.local.set({ modified: false });
                location.reload();
            })
        }
    })
}

function saveAsPic() {
    html2canvas(document.querySelector(".printarea")).then(canvas => {
        //将canvas内容保存为文件并下载
        canvas.toBlob(function (blob) {
            saveAs(blob, "course.png");
        });
    });
}