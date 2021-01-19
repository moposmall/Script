/*
 * @Author: whyour
 * @Github: https://github.com/whyour
 * @Date: 2020-11-23 11:30:44
 * @LastEditors: whyour
 * @LastEditTime: 2020-11-30 13:12:02
 
  hostname = restapi.amap.com

  quanx:
  [task_local]
  0 * * * * https://raw.githubusercontent.com/whyour/hundun/master/quanx/caiyun.js, tag=彩云天气, enabled=true
  [rewrite_local]
  https:\/\/restapi\.amap\.com\/v3\/geocode url script-request-body https://raw.githubusercontent.com/whyour/hundun/master/quanx/caiyun.js

  loon:
  [Script]
  http-request https:\/\/restapi\.amap\.com\/v3\/geocode script-path=https://raw.githubusercontent.com/whyour/hundun/master/quanx/caiyun.js, requires-body=true, timeout=10, tag=彩云天气cookie
  cron "0 * * * *" script-path=https://raw.githubusercontent.com/whyour/hundun/master/quanx/ddxw.js, tag=彩云天气

  surge:
  [Script]
  彩云天气 = type=cron,cronexp=0 * * * *,timeout=60,script-path=https://raw.githubusercontent.com/whyour/hundun/master/quanx/caiyun.js,
  彩云天气cookie = type=http-request,pattern=https:\/\/restapi\.amap\.com\/v3\/geocode,requires-body=1,max-size=0,script-path=https://raw.githubusercontent.com/whyour/hundun/master/quanx/caiyun.js
 *
 *  
 **/

const $ = new Env("彩云天气");
$.result = [];
$.isRequest = typeof $request != "undefined";
const GEO_REGEX = /https?:\/\/restapi\.amap\.com\/v3\/geocode/;

!(async () => {
  await getLocation();
  await getWeather();
})()
  .catch((e) => $.logErr(e))
  .finally(() => $.done());

function getLocation() {
  return new Promise((resolve) => {
    if ($.isRequest) {
      if (GEO_REGEX.test($request.url) && $request.body) {
        console.log('\n' + $request.body + '\n');
        try {
          const location = decodeURIComponent($request.body.match(/location=(\S*)&radius=/)[1]);
          $.setdata(location, "caiyun_location");
          $.msg($.name, '', '获取位置信息成功');
        } catch (e) {
          $.logErr(e, $request.response);
        } finally {
          $.done();
        }
      }
    } else {
      resolve();
    }
  });
}

function getWeather() {
  return new Promise((resolve) => {
    const locationData = $.getdata('caiyun_location')
    if (!locationData) {
      $.msg(
        $.name,
        "",
        "【提示】请先打开彩云天气获取一次位置信息",
        {"open-url": ``}
      );
      resolve()
    }
    const [longitude, latitude] = locationData.split(',');
    const weatherReq = "https://api.openweathermap.org/data/2.5/onecall?lat=" + latitude + "&lon=" + longitude + "&exclude=minutely,alerts&units=metric&lang=zh_cn&appid=16b236cf5334d422d365bf95b4c32136";
    $.get({ url: weatherReq }, async (err, resp, data) => { 
      try {
        const result = {};
        const { current, daily: [today, tomorrow], hourly: [, nextHour], message } = JSON.parse(data);
        if (message) {
          $.result.push(_data.message)
          resolve();
        }

        result.currentTemp = current.temp.toFixed(1)
        result.currentFeelsLike = current.feels_like.toFixed(1)
        result.currentCondition = current.weather[0].icon
        result.currentDescription = current.weather[0].description.replace('，', '转')
        result.todaySunrise = current.sunrise
        result.todaySunset = current.sunset
        result.todayHigh = today.temp.max.toFixed(1)
        result.todayLow = today.temp.min.toFixed(1)
      
        result.nextHourTemp = nextHour.temp.toFixed(1)
        result.nextHourFeelsLike = nextHour.feels_like.toFixed(1)
        result.nextHourCondition = nextHour.weather[0].icon
        result.nextHourDescription = nextHour.weather[0].description.replace('，', '转')
      
        result.tomorrowHigh = tomorrow.temp.max.toFixed(1)
        result.tomorrowLow = tomorrow.temp.min.toFixed(1)
        result.tomorrowCondition = tomorrow.weather[0].icon
        result.tomorrowDescription = tomorrow.weather[0].description.replace('，', '转')
        result.tomorrowSunrise = tomorrow.sunrise
        result.tomorrowSunset = tomorrow.sunset

        $.msg(
          `[当前天气] ${result.currentDescription} ${result.currentTemp}° 🌡体感 ${result.currentFeelsLike}°`,
          `[一小时后] ${result.nextHourDescription} ${result.nextHourTemp}° 🌡体感 ${result.nextHourFeelsLike}°`,
          `[今天] ${result.currentDescription} ${result.todayLow}°~${result.todayHigh}°\n🌄日出 ${getTime(result.todaySunrise)} 🌅日落 ${getTime(result.todaySunset)}\n[明天] ${result.tomorrowDescription} ${result.tomorrowLow}°~${result.tomorrowHigh}°\n🌄日出 ${getTime(result.tomorrowSunrise)} 🌅日落 ${getTime(result.tomorrowSunset)}`
          ,
          {
            "media-url": `http://openweathermap.org/img/wn/${result.currentCondition}@4x.png`,
          }
        )
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}

function getTime(number) {
  const date = new Date(number * 1000);
  const hour = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
  const minutes =
    date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
  const seconds =
    date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
  return `${hour}:${minutes}:${seconds}`;
}

// prettier-ignore
function Env(t, e) { class s{ constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `\ud83d\udd14${this.name}, \u5f00\u59cb!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), a = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(a, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t) { let e = { "M+": (new Date).getMonth() + 1, "d+": (new Date).getDate(), "H+": (new Date).getHours(), "m+": (new Date).getMinutes(), "s+": (new Date).getSeconds(), "q+": Math.floor(((new Date).getMonth() + 3) / 3), S: (new Date).getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, ((new Date).getFullYear() + "").substr(4 - RegExp.$1.length))); for (let s in e) new RegExp("(" + s + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? e[s] : ("00" + e[s]).substr(("" + e[s]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t.stack) : this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
