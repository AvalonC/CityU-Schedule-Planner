const DAYS = " MTWRFS", FULL_REGEX = /.*f.*u.*l.*l.*/i, NUM_FILTER = /[^\d]/g,
    START_DATE = "2024-01-01 08:30:00",
    END_DATE = "2024-03-31 23:30:00",
    LOC_MAP = {
        "Lau Ming Wai Academic Building": "LAU",
        "Li Dak Sum Yip Yio Chin A Bldg": "LI",
        "Yeung Kin Man Acad Building": "YEUNG",
        "Mong Man Wai Building": "MMW"
    };


let inAddDropPeriod = moment().isBetween(START_DATE, END_DATE, undefined, "[]");
/* 
大循环判断，分别判断
1.当前页面是否是学期规划详情页？（加载全部已选课程数据用以后续操作，因此这个操作应该最先进行。）
2.当前页面是否是某门具体的课程？
3.当前页面是否是CRN输入页面？
*/
//学期规划详情页
if (location.href === "https://banweb.cityu.edu.hk/pls/PROD/bwskfshd.P_CrseSchdDetl") {
    readStudentSchedule();
}
//具体课程详情页
else if (location.href.startsWith("https://banweb.cityu.edu.hk/pls/PROD/hwscrssh_cityu.P_DispOneSection")) {
    modifiedSectionPage();
}
//选课页面
else if (location.href === "https://banweb.cityu.edu.hk/pls/PROD/bwskfreg.P_AltPin") {
    autoFillCRN();
}

function readStudentSchedule() {
    //创建课程列表
    let classes = [];
    //创建元数据列表
    let meta = [];
    //存储datadisplaytable元素
    let z = $(".datadisplaytable");
    //将staticheaders中的元素转换为文本，去掉首位空白，以转行符分割，
    meta = $(".staticheaders").text().trim().split("\n");
    //循环，为课程列表添加信息
    for (let i = 0; i < z.length; i += 2) {
        //创建中转列表
        let j = {};
        //提取课程名称
        j['name'] = z.eq(i).find("caption").text().split(" - ");
        //提取CRN
        j['crn'] = parseInt(z.eq(i).find("tr").eq(1).children().eq(1).text());
        //提取讲师
        j['instruct'] = z.eq(i).find("tr").eq(3).children().eq(1).text().trim();
        //判断table标签summary中的内容，如果没有这个summary，就意味着没有展示具体的时间和讲师，那么时间就为空。
        if (z.eq(i + 1).attr("summary") !== "This table lists the scheduled meeting times and assigned instructors for this class..") {
            j["times"] = [null];
            i--;
        } else {
            j['times'] = z.eq(i + 1).find("tr").slice(1).get().map(v => {
                return {
                    //读取时间（已适配TBA）
                    time: $(v).children().eq(1).text() === "TBA" ? null : $(v).children().eq(1).text().split(" - "),
                    //读取日期
                    day: $(v).children().eq(2).text().trim() === "" ? null : DAYS.indexOf($(v).children().eq(2).text()),
                    //读取课程开展时间范围
                    range: $(v).children().eq(4).text().split(" - "),
                    //读取开课位置（已适配TBA)
                    loc: $(v).children().eq(1).text() === "TBA" ? null : $(v).children().eq(3).text().trim().replace(/^(?<bldg>[\w ]*) (?<rm>LT-\d{1,2}|[A-Z]?\d-?\d{3})$/, function (v, bldg, rm) {
                        return `${LOC_MAP[bldg]} ${rm}`;
                    })
                };
            });
        }
        //增加元素
        classes.push(j);
    }
    //在本地存储创建一个变量叫做ttb，是由meta和classes组成的复合数组
    chrome.storage.local.set({ ttb: { meta, classes } }, () => {
        console.log("Saved timetable data", { meta, classes });
    });
}

function modifiedSectionPage() {
    //自本地存储中取得ttb和wishlist
    chrome.storage.local.get(["ttb", "wishlist"], ({ ttb, wishlist }) => {
        //如果用户尚未有wishlist
        if (wishlist == null) {
            //新建一个
            wishlist = [];
        }
        let ctd$;
        let params = new URLSearchParams(location.search);
        //学期判断
        //读取“选中的学期”
        let selected = /Courses Offered in  (Semester [AB] \d{4}\/\d{2}|Summer \d{4})/.exec($(".pagetitlediv h2").text())[1];
        //与ttb中meta的第1个元素作比较
        let current = ttb.meta[1];
        if (selected !== current) {
            //如果不等，将学期不等的显示字样打出
            let f$ = $("<div></div>").css({ "font-size": "18px", "padding": "8px", "position": "fixed", "top": "20px", "right": "20px", "left": "20px", "text-align": "center", "background-color": "white", "border": "5px solid orange" })
                .text(`Term selected in Master Class Schedule is not compatible with your saved schedule (Required: ${selected}; Found: ${current})`)
                .appendTo(document.body);
        }
        //修改Timetable样式
        $(".body table[border] tr").each((i, v) => {
            if (i === 0) {
                //追加status列头
                let th1$ = $("<th></th>").text("Status");
                //追加actions列头
                let th2$ = $("<th></th>").text("Actions");
                //判断是否在选课周期,在则显示列
                if (inAddDropPeriod)
                    th2$.attr("colspan", "2");
                $(v).append([th1$, th2$]);
            }
            else {
                //不在的时候进行一系列判断，为此先行准备一系列变量
                let flag = true;
                let crash = null;
                let wlitem = null;
                let wlidx = 0;
                let td1$ = $("<td></td>");
                let td2$ = $("<td></td>");
                let td3$ = $("<td></td>");
                //判断背景颜色是否为网选粉
                if ($(v).is("[bgcolor='#ffccff']")) {
                    //如果是，那么判断这门课有没有可用容量
                    if ($(v).children().eq(6).text().trim() !== "") {
                        ctd$ = $(v);
                        //判断这门课是不是wishlist里面的课程
                        wlitem = wishlist.find(({ crn }) => crn === parseInt(ctd$.children().eq(0).text()));
                        //如果是，那么更新状态
                        if (wlitem != null) {
                            wlitem.status = {
                                //取得课程信息
                                course: `${params.get("subj")}${params.get("crse")}`,
                                //取得section
                                section: ctd$.children().eq(1).text().trim(),
                                //网选状态为true
                                webenabled: true,
                                //记录avail数据
                                avail: FULL_REGEX.test(ctd$.children().eq(6).text()) ? 0 : parseInt(ctd$.children().eq(6).text().replace(NUM_FILTER, "")),
                                //记录总容量
                                cap: parseInt(ctd$.children().eq(7).text().replace(NUM_FILTER, "")),
                                //记录日期
                                date: DAYS.indexOf(ctd$.children().eq(10).text()),
                                //记录时间
                                period: ctd$.children().eq(11).text().split(" - "),
                                //记录waitlist容量
                                waitlist: ctd$.children().eq(8).text().includes("N") ? false : (FULL_REGEX.test(ctd$.children().eq(8).text()) ? 0 : parseInt(ctd$.children().eq(8).text().replace(NUM_FILTER, ""))),
                                //冲突状态为false
                                conflict: false,
                                //更新时间为执行完毕这一系列操作的现在时间
                                updated: new Date().getTime()
                            };
                        }
                    }
                    //如果在ttb中找到了此CRN
                    if (ttb.classes.findIndex(u => u.crn === parseInt(ctd$.children().eq(0).text())) !== -1) {
                        //显示此课程已经被注册
                        td1$.css("color", "red").text(`Course registered`);
                        //开始判断其他情况
                    }
                    else {
                        //最大容量已满
                        if (FULL_REGEX.test(ctd$.children().eq(6).text())) {
                            //waitlist已满
                            if (FULL_REGEX.test(ctd$.children().eq(8).text())) {
                                //标注为全满
                                td1$.css("color", "red").text("Section is full, waitlist full");
                                //如果waitlist一列显示“N”
                            } else if (ctd$.children().eq(8).text().includes("N")) {
                                //显示全满且waitlist不可用
                                td1$.css("color", "red").text("Section is full, waitlist not available");
                            } else {
                                //waitlist未满，判断会否产生冲突，如果这个元素为无，一定不冲突
                                if ($(v).children().eq(11).text().trim() === "") {
                                    //展示waitlist余额
                                    td1$.css("color", "darkorange").html("Section is full, waitlist available<br />Registrable");
                                    //判断是否还在选课期，展示增加到wishlist操作
                                    if ($(v).children().eq(0).text().trim() !== "" && inAddDropPeriod) {
                                        td2$.append($("<a></a>").text("Add to Wishlist").attr({ "data-crn": $(v).children().eq(0).text(), "href": "#" }).click(addCRNToWishlist));
                                    }
                                } else {
                                    //取日期
                                    let day = DAYS.indexOf($(v).children().eq(10).text());
                                    //取时间
                                    let ztime = $(v).children().eq(11).text().split(" - ").map(t => new moment(t, "HH:mm"));
                                    //确认在一个学期
                                    if (selected === current) {
                                        //循环ttb中所有课程以检查时间冲突
                                        y: for (let i of ttb.classes) {
                                            //循环课程中所有时间
                                            for (let j of i.times) {
                                                //如果为空，或者时间为空。跳出循环继续执行
                                                if (j === null || j.time === null) continue;
                                                //将课程中的时间提取出来，放入一个map
                                                let times = j.time.map(t => new moment(t, "hh:mm a"));
                                                //如果计划选择课程的时间在已有课程的时间周期中，或已有课程的时间周期在选择课程的时间周期中
                                                if (day === j.day && (ztime.some(m => m.isBetween(times[0], times[1], undefined, "[]")) || times.some(m => m.isBetween(ztime[0], ztime[1], undefined, "[]")))) {
                                                    //将flag设置为false
                                                    flag = false;
                                                    //将有冲突课程记录
                                                    crash = `${i.name[1].replace(" ", "")} ${i.name[2]}`;
                                                    //从循环中跳出
                                                    break y;
                                                }
                                            }
                                        }
                                        //如果wishlist不是空的
                                        if (wlitem != null) {
                                            //判断wishlist的里面的conlict状态，flag为false的时候，走到此处的课程为crash
                                            wlitem.status.conflict = flag ? false : crash;
                                        }
                                    }
                                    //如果flag为true
                                    if (flag) {
                                        //提示此课时已满，waitlist可用，根据学期追加“无冲突”或者“非当前学期”的判断
                                        td1$.css("color", "darkorange").html(`Section is full, waitlist available<br />${selected === current ? "No conflicts" : "Incompatible terms"}`);
                                        //存在CRN且在选课期内，给出添加到wishlist的操作
                                        if ($(v).children().eq(0).text().trim() !== "" && inAddDropPeriod) {
                                            td2$.append($("<a></a>").text("Add to Wishlist").attr({ "data-crn": $(v).children().eq(0).text(), "data-waitlist": "true", "href": "#" }).click(addCRNToWishlist));
                                        }
                                        //存在上课时间且处于当学期，给出预览操作
                                        if ($(v).children().eq(11).text().trim() !== "" && selected === current) {
                                            td3$.append($("<a></a>").text("Preview").attr("href", "#").click(preview));
                                        }
                                    } else {
                                        //提示此课时已满，waitlist可用，但存在课程冲突
                                        td1$.css("color", "red").html(`Section is full, waitlist available<br />Conflicts with ${crash}`);
                                        //如果正在选课期，则显示增加到wishlist操作
                                        if ($(v).children().eq(0).text().trim() !== "" && inAddDropPeriod) {
                                            td2$.append($("<a></a>").text("Add to Wishlist").attr({ "data-crn": $(v).children().eq(0).text(), "data-crash": crash, "data-waitlist": "true", "href": "#" }).click(addCRNToWishlist));
                                        }
                                        //如果正在当前学期，给出预览的操作
                                        if ($(v).children().eq(11).text().trim() !== "" && selected === current) {
                                            td3$.append($("<a></a>").text("Preview").attr("href", "#").click(preview));
                                        }
                                    }
                                }
                            }
                            //最大容量未满
                        } else {
                            //不存在上课时间
                            if ($(v).children().eq(11).text().trim() === "") {
                                //显示可注册
                                td1$.css("color", "green").text("Registrable");
                                //存在CRN且在选课期内，显示添加到wishlist操作
                                if ($(v).children().eq(0).text().trim() !== "" && inAddDropPeriod) {
                                    td2$.append($("<a></a>").text("Add to Wishlist").attr({ "data-crn": $(v).children().eq(0).text(), "href": "#" }).click(addCRNToWishlist));
                                }
                                //存在上课时间
                            } else {
                                //取得日期
                                let day = DAYS.indexOf($(v).children().eq(10).text());
                                //取得时间
                                let ztime = $(v).children().eq(11).text().split(" - ").map(t => new moment(t, "HH:mm"));
                                //如果学期相符
                                if (selected === current) {
                                    //循环ttb中的所有课程
                                    x: for (let i of ttb.classes) {
                                        //循环所有课程的时间
                                        for (let j of i.times) {
                                            //如果为空，或者时间为空。跳出循环继续执行
                                            if (j === null || j.time === null) continue;
                                            //将课程中的时间提取出来，放入一个map
                                            let times = j.time.map(t => new moment(t, "hh:mm a"));
                                            //如果计划选择课程的时间在已有课程的时间周期中，或已有课程的时间周期在疾患选择课程的时间周期中
                                            if (day === j.day && (ztime.some(m => m.isBetween(times[0], times[1], undefined, "[]")) || times.some(m => m.isBetween(ztime[0], ztime[1], undefined, "[]")))) {
                                                //将flag设置为false
                                                flag = false;
                                                //记录冲突课程
                                                crash = `${i.name[1].replace(" ", "")} ${i.name[2]}`;
                                                //自此跳出循环
                                                break x;
                                            }
                                        }
                                    }
                                    //如果wishlist不为空
                                    if (wlitem != null) {
                                        //判断wishlist的里面的conlict状态，flag为false的时候，走到此处的课程为crash
                                        wlitem.status.conflict = flag ? false : crash;
                                    }
                                }
                                //如果flag为true
                                if (flag) {
                                    //判断学期，显示无冲突或错误的学期
                                    td1$.css("color", selected === current ? "green" : "darkorange").text(selected === current ? "No conflicts" : "Incompatible terms");
                                    //存在CRN且在选课期内，给出添加到wishlist的操作
                                    if ($(v).children().eq(0).text().trim() !== "" && inAddDropPeriod) {
                                        td2$.append($("<a></a>").text("Add to Wishlist").attr({ "data-crn": $(v).children().eq(0).text(), "href": "#" }).click(addCRNToWishlist));
                                    }
                                    //存在上课时间且处于当学期，给出预览操作
                                    if ($(v).children().eq(11).text().trim() !== "" && selected === current) {
                                        td3$.append($("<a></a>").text("Preview").attr("href", "#").click(preview));
                                    }
                                    //如果flag为false
                                } else {
                                    //显示冲突课程
                                    td1$.css("color", "red").text(`Conflicts with ${crash}`);
                                    //如果存在CRN且在选课期内，给出添加到wishlist的操作
                                    if ($(v).children().eq(0).text().trim() !== "" && inAddDropPeriod) {
                                        td2$.append($("<a></a>").text("Add to Wishlist").attr({ "data-crn": $(v).children().eq(0).text(), "data-crash": crash, "href": "#" }).click(addCRNToWishlist));
                                    }
                                    //如果存在上课时间。给出预览操作
                                    if ($(v).children().eq(11).text().trim() !== "") {
                                        td3$.append($("<a></a>").text("Preview").attr("href", "#").click(preview));
                                    }
                                }
                            }
                        }
                    }
                    //如果背景不是网选粉，那么如果此行有16个子元素的话
                } else if ($(v).children().length === 16) {
                    //如果有容量
                    if ($(v).children().eq(6).text().trim() !== "") {
                        ctd$ = $(v);
                        //判断这门课是不是wishlist里面的课程
                        wlitem = wishlist.find(({ crn }) => crn === parseInt(ctd$.children().eq(0).text()));
                        //如果是，更新其状态
                        if (wlitem != null) {
                            wlitem.status = {
                                course: `${params.get("subj")}${params.get("crse")}`,
                                section: ctd$.children().eq(1).text().trim(),
                                webenabled: false,
                                avail: null,
                                cap: null,
                                waitlist: null,
                                conflict: false,
                                updated: new Date().getTime()
                            };
                        }
                    }
                    //如果网选状态为N，显示此门课程非网选
                    if ($(v).children().eq(8).text().includes("N")) {
                        td1$.css("color", "red").text("Section not web-enabled");
                    }
                }
                //如果在选课周期，则增加三个新操作列
                if (inAddDropPeriod)
                    $(v).append([td1$, td2$, td3$]);
                //不在的时候增加状态和预览即可，增加到wishlist操作已经失去意义
                else
                    $(v).append([td1$, td3$]);
            }
        });
        //存储wishlist
        chrome.storage.local.set({ wishlist: wishlist });
    });
}

function addCRNToWishlist() {
    let params = new URLSearchParams(location.search);
    chrome.storage.local.get(["ttb", "wishlist"], ({ ttb, wishlist }) => {
        let ctd$ = $(this).parents("tr");
        let data = {
            crn: $(this).data("crn"),
            status: {
                course: `${params.get("subj")}${params.get("crse")}`,
                section: ctd$.children().eq(1).text().trim(),
                webenabled: true,
                //add day
                date: DAYS.indexOf(ctd$.children().eq(10).text()),
                //add time
                period: ctd$.children().eq(11).text().split(" - "),
                avail: FULL_REGEX.test(ctd$.children().eq(6).text()) ? 0 : parseInt(ctd$.children().eq(6).text().replace(NUM_FILTER, "")),
                cap: parseInt(ctd$.children().eq(7).text().replace(NUM_FILTER, "")),
                waitlist: ctd$.children().eq(8).text().includes("N") ? false : (FULL_REGEX.test(ctd$.children().eq(8).text()) ? 0 : parseInt(ctd$.children().eq(8).text().replace(NUM_FILTER, ""))),
                conflict: $(this).data("crash") ?? false,
                updated: new Date().getTime()
            }
        };
        console.log("add to wishlist triggered with data:", data);
        //如果没有wishlist
        if (wishlist == null) {
            //新建一个
            wishlist = [];
        }
        if (ttb.classes.findIndex(v => v.crn === $(this).data("crn")) !== -1) {
            //如果这个课在ttb里面有，显示已经注册
            let f$ = $("<div></div>").css({ "font-size": "18px", "padding": "8px", "position": "fixed", "top": "20px", "right": "20px", "background-color": "white", "border": "5px solid red", "color": "red" }).text("This course is been already registered").appendTo(document.body);
            setTimeout(() => f$.remove(), 5000);
            return false;
        }
        if (wishlist.findIndex(({ crn }) => crn === $(this).data("crn")) !== -1) {
            //如果这个课在wishlist里面有，显示已经添加
            let f$ = $("<div></div>").css({ "font-size": "18px", "padding": "8px", "position": "fixed", "top": "20px", "right": "20px", "background-color": "white", "border": "5px solid red", "color": "red" }).text("CRN already exist in the wishlist").appendTo(document.body);
            setTimeout(() => f$.remove(), 5000);
            return false;
        }
        if ($(this).data("crash")) {
            //如果这个课的crash存在，那么给予用户警告，必须先要退改课再加课。
            if (!confirm("This course section is conflicted with a course that you have been registered.\n\nYou must change/drop the conflicted course if you want to add this course.\n\nProceed anyway?"))
                return false;
        }
        if ($(this).data("waitlist")) {
            //如果这门课有waitlist，那么给予用户提示，这门课配额已满，有可用的waitlist，尽管加入但是可能最后还是选不上，还要操作吗？
            if (!confirm("This course section is full and waitlist available.\n\nYou will be put into the waitlist if you try to register this course.\n\nYOU MAY NOT BE ABLE TO REGISTER THIS COURSE AT THE END.\n\nProceed anyway?"))
                return false;
        }
        wishlist.push(data);
        chrome.storage.local.set({ wishlist: wishlist }, () => {
            //提示用户已经成功加入
            let f$ = $("<div></div>").css({ "font-size": "18px", "padding": "8px", "position": "fixed", "top": "20px", "right": "20px", "background-color": "white", "border": "5px solid black" }).text("CRN added to wishlist").appendTo(document.body);
            setTimeout(() => f$.remove(), 5000);
        });
    });
    return false;
}
function autoFillCRN() {
    //确认wishlist和autofill功能是否启动
    chrome.storage.local.get(["wishlist", "autofill"], ({ wishlist, autofill }) => {
        //如果启动autofill
        if (autofill) {
            //筛选出状态为null，或者状态为可网选且状态处于等待列表或剩余容量大于0的CRN，组成一个队列
            wishlist.filter(({ status }) => status == null || (status.webenabled && (status.waitlist || status.avail > 0))).map(v => v.crn).forEach((v, i) => {
                //在不到10个的前提下，将CRN依次填入表格
                if (i < 10)
                    document.querySelectorAll("input[name='CRN_IN'][id]")[i].value = v;
            });
        }
    });
}

function preview() {
    let params = new URLSearchParams(location.search);
    let td$ = $(this).parents("tr");
    let ctd$ = td$;
    while (ctd$.children().eq(0).text().trim() === "") {
        ctd$ = ctd$.prev();
    }
    chrome.runtime.sendMessage({
        type: "preview",
        data: {
            course: `${params.get("subj")}${params.get("crse")}`,
            crn: parseInt(ctd$.children().eq(0).text()),
            day: DAYS.indexOf(td$.children().eq(10).text()),
            time: td$.children().eq(11).text().split(" - "),
            section: ctd$.children().eq(1).text(),
            instruct: ctd$.children().eq(14).text(),
            loc: `${ctd$.children().eq(12).text()} ${ctd$.children().eq(13).text()}`
        }
    });
    return false;
}