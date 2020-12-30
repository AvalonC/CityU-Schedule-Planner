for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 7; j++) {
        let div$ = $("<div></div");
        if (j >= 5) {
            div$.addClass("weekend");
        }
        $(".timetable .background").append(div$);
    }
}

chrome.storage.local.get(["ttb", "preview"], ({ ttb, preview }) => {

    ttb.forEach((i) => {
        i.times.forEach(j => {
            if (j === null) {
                $("#no-scheduled-time").show().append(`<br />${i.name[1].replace(" ", "")} ${i.name[2]}`);
                return;
            }
            let times = j.time.map(t => new moment(t, "hh:mm a"));
            let id = `ttb-${j.day}-${times[0].hour() - 7}-${times[1].hour() - 6}`;
            if ($(`#${id}`).length === 0) {
                let div$ = $("<div></div");
                div$.html(`${i.name[1].replace(" ", "")} <small>${i.name[2]}</small><br /><small>${j.loc}</small>`);
                div$.attr("title", `${i.name[0]}\n${i.crn}\n${times[0].format("HH:mm")} - ${times[1].format("HH:mm")}\n${i.instruct}`);
                div$.attr("id", id);
                div$.css({
                    "grid-row-start": `${times[0].hour() - 7}`,
                    "grid-row-end": `${times[1].hour() - 6}`,
                    "grid-column-start": `${j.day}`
                });
                $(".timetable .content").append(div$);
            }
        });
    });


    let timep = preview.time.map(t => new moment(t, "HH:mm"));
    let divp$ = $("<div></div");
    divp$.html(`${preview.course} <small>${preview.section}</small><br /><small>${preview.loc}</small>`);
    divp$.attr("title", `${preview.course} < Preview >\n${preview.crn}\n${timep[0].format("HH:mm")} - ${timep[1].format("HH:mm")}\n${preview.instruct}`);
    divp$.attr("id", "ttb-preview-block");
    divp$.addClass("preview");
    divp$.css({
        "grid-row-start": `${timep[0].hour() - 7}`,
        "grid-row-end": `${timep[1].hour() - 6}`,
        "grid-column-start": `${preview.day}`
    });
    $(".timetable .content").append(divp$);

    window.resizeTo(900, 600);
});