for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 7; j++) {
        let div$ = $("<div></div");
        if (j >= 5) {
            div$.addClass("weekend");
        }
        $(".timetable .background").append(div$);
    }
}

chrome.storage.local.get(["schedule"], ({ schedule }) => {
    schedule.forEach((i) => {
        i.times.forEach(j => {
            if (j === null) {
                $("#no-scheduled-time").show().append(`<br />${i.name[1].replace(" ", "")} ${i.name[2]}`);
                return;
            }
            let times = j.time.map(t => new moment(t, "hh:mm a"));
            let id = `ttb-${j.day}-${times[0].hour() - 7}-${times[1].hour() - 6}`;
            if ($(`#${id}`).length === 0) {
                let div$ = $("<div></div");
                div$.html(`${i.course} <small>${i.section}</small><br />`);
                div$.attr("title", `${i.course}\n${i.crn}\n${times[0].format("HH:mm")} - ${times[1].format("HH:mm")}`);
                div$.attr("id", id);
                div$.css({
                    "grid-row-start": `${times[0].hour() - 7}`,
                    "grid-row-end": `${times[1].hour() - 6}`,
                    "grid-column-start": `${j.day}`
                });
                $(".timetable .content").append(div$);
            }
        })
    })
});