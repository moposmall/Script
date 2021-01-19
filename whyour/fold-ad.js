/*
 * @Author: whyour
 * @Github: https://github.com/whyour
 * @Date: 2020-12-04 18:49:09
 * @LastEditors: whyour
 * @LastEditTime: 2020-12-04 18:53:52
 */

const xiChuangZhu = '/functions/getLaunchImageForIOS';

const url = $request.url;
let body = $response.body;

if (url.indexOf(xiChuangZhu) != -1) {
  body = JSON.stringify({});
}

$done({ body });
