/*
 * @Author: whyour
 * @Github: https://github.com/whyour
 * @Date: 2020-11-16 11:58:48
 * @LastEditors: whyour
 * @LastEditTime: 2020-11-30 13:12:12
 */
var body = $response.body;
var url = $request.url;
var obj = JSON.parse(body);

const vip = '/v2/user';
const _0xe0e0 = [
  "\x62\x6F\x64\x79",
  "\x70\x61\x72\x73\x65",
  "\x78\x79\x5F\x76\x69\x70\x5F\x65\x78\x70\x69\x72\x65",
  "\x72\x65\x73\x75\x6C\x74",
  "\x69\x73\x5F\x76\x69\x70",
  "\x76\x69\x70\x5F\x65\x78\x70\x69\x72\x65\x64\x5F\x61\x74",
  "\x69\x73\x5F\x78\x79\x5F\x76\x69\x70",
  "\x73\x74\x72\x69\x6E\x67\x69\x66\x79",
];

if (url.indexOf(vip) != -1) {
  var body = $response[_0xe0e0[0]];
  var obj = JSON[_0xe0e0[1]](body);
  obj[_0xe0e0[3]][_0xe0e0[2]] = 1835312949;
  obj[_0xe0e0[3]]['xy_svip_expire'] = 1835312949;
  obj[_0xe0e0[3]]['svip_expired_at'] = 1835312949;
  obj[_0xe0e0[3]]['vip_type'] = "s";
  obj[_0xe0e0[3]][_0xe0e0[4]] = true;
  obj[_0xe0e0[3]][_0xe0e0[5]] = 1835312949;
  obj[_0xe0e0[3]][_0xe0e0[6]] = true;
  obj[_0xe0e0[3]]['wt']['vip']['svip_expired_at'] = 1835312949;
  body = JSON[_0xe0e0[7]](obj);
}

$done({body});