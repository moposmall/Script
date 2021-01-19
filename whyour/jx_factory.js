/*
 * @Author: whyour
 * @Github: https://github.com/whyour
 * @Date: 2020-11-29 13:14:19
 * @LastEditors: whyour
 * @LastEditTime: 2021-01-13 23:38:00
 * 多谢： https://github.com/MoPoQAQ, https://github.com/lxk0301
 * 添加随机助力
 * 自动开团助力
 * box设置不自动充能
 * 可设置每天通知时间
  quanx:
  [task_local]
  10 * * * * https://raw.githubusercontent.com/whyour/hundun/master/quanx/jx_factory.js, tag=京喜工厂, img-url=https://raw.githubusercontent.com/58xinian/icon/master/jdgc.png, enabled=true

  Loon:
  [Script]
  cron "10 * * * *" script-path=https://raw.githubusercontent.com/whyour/hundun/master/quanx/jx_factory.js,tag=京喜工厂

  Surge:
  京喜工厂 = type=cron,cronexp="10 * * * *",wake-system=1,timeout=20,script-path=https://raw.githubusercontent.com/whyour/hundun/master/quanx/jx_factory.js
*
**/

const $ = new Env('京喜工厂');
const JD_API_HOST = 'https://m.jingxi.com/';
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
$.autoCharge = $.getdata('gc_autoCharge') ? $.getdata('gc_autoCharge') === 'true' : false;
$.showLog = $.getdata('gc_showLog') ? $.getdata('gc_showLog') === 'true' : false;
$.notifyTime = $.getdata('gc_notifyTime');
$.result = [];
$.cookieArr = [];
$.currentCookie = '';
$.allTask = [];
$.info = {};
$.userTuanInfo = {};

!(async () => {
  if (!getCookies()) return;
  for (let i = 0; i < $.cookieArr.length; i++) {
    $.currentCookie = $.cookieArr[i];
    if ($.currentCookie) {
      const userName = decodeURIComponent(
        $.currentCookie.match(/pt_pin=(.+?);/) && $.currentCookie.match(/pt_pin=(.+?);/)[1],
      );
      $.log(`\n开始【京东账号${i + 1}】${userName}`);
      $.result.push(`【京东账号${i + 1}】${userName}`);
      const beginInfo = await getUserInfo();
      await $.wait(500);
      await getCommodityDetail();
      if (checkProductProcess()) return;
      await $.wait(500);
      await getCurrentElectricity();
      await $.wait(500);
      await getTaskList();
      await $.wait(500);
      await browserTask();
      await $.wait(500);
      await getHireRewardList();
      // await $.wait(500);
      // await getFriends();
      // await $.wait(500);
      // await pickUserComponents($.info.user.encryptPin, true);
      await $.wait(500);
      await awardTuan();
      await $.wait(500);
      const endInfo = await getUserInfo();
      $.info.commodityInfo && $.result.push(
        `【名称】：${$.info.commodityInfo.name}`,
        `【电力】：获得(${endInfo.user.electric - beginInfo.user.electric}) 还需(${
          endInfo.productionInfo.needElectric - beginInfo.productionInfo.investedElectric
        })`,
        `【账户剩余】：${endInfo.user.electric}`,
      );
      await $.wait(500);
      await investElectric();
      if (checkProductProcess()) return;
      await $.wait(500);
      await submitInviteId(userName);
      await $.wait(500);
      await createAssistUser();
      await $.wait(500);
      await getTuanId();
      await $.wait(500);
      await submitTuanId(userName);
      await $.wait(500);
      await joinTuan();
    }
  }
  await showMsg();
})()
  .catch(e => $.logErr(e))
  .finally(() => $.done());

function getCookies() {
  if ($.isNode()) {
    $.cookieArr = Object.values(jdCookieNode);
  } else {
    const CookiesJd = JSON.parse($.getdata("CookiesJD") || "[]").filter(x => !!x).map(x => x.cookie);
    $.cookieArr = [$.getdata("CookieJD") || "", $.getdata("CookieJD2") || "", ...CookiesJd];
  }
  if (!$.cookieArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/', {
      'open-url': 'https://bean.m.jd.com/',
    });
    return false;
  }
  return true;
}

function getUserInfo() {
  return new Promise(resolve => {
    $.get(taskUrl('userinfo/GetUserInfo'), async (err, resp, data) => {
      try {
        const { ret, data: { factoryList = [], productionList = [], user = {} } = {}, msg } = JSON.parse(data);
        $.log(`\n获取用户信息：${msg}\n${$.showLog ? data : ''}`);
        $.info = {
          ...$.info,
          factoryInfo: factoryList[0],
          productionInfo: productionList[0] || {},
          user,
        };
        resolve({
          factoryInfo: factoryList[0],
          productionInfo: productionList[0] || {},
          user,
        });
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function getCommodityDetail() {
  return new Promise(async resolve => {
    if (!$.info.productionInfo.commodityDimId) {
      resolve();
      return;
    }
    $.get(
      taskUrl('diminfo/GetCommodityDetails', `commodityId=${$.info.productionInfo.commodityDimId}`),
      (err, resp, data) => {
        try {
          const { ret, data: { commodityList = [] } = {}, msg } = JSON.parse(data);
          $.log(`\n获取商品详情：${msg}\n${$.showLog ? data : ''}`);
          $.info.commodityInfo = commodityList[0];
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      },
    );
  });
}

function checkProductProcess() {
  if ($.info.productionInfo) {
    const { needElectric, investedElectric } = $.info.productionInfo;
    if (needElectric <= investedElectric) {
      $.msg($.name, `【提示】商品 ${$.info.commodityInfo.name} 已生产完成，请前往京喜工厂兑换并选择新商品！`);
      return true;
    }
  }
  return false;
}

function getCurrentElectricity() {
  return new Promise(async resolve => {
    $.get(
      taskUrl('generator/QueryCurrentElectricityQuantity', `factoryid=${$.info.factoryInfo.factoryId}`),
      async (err, resp, data) => {
        try {
          const {
            ret,
            data: { currentElectricityQuantity, doubleElectricityFlag, maxElectricityQuantity } = {},
            msg,
          } = JSON.parse(data);
          $.log(`\n获取当前电力：${msg}\n${$.showLog ? data : ''}`);
          if (currentElectricityQuantity === maxElectricityQuantity && doubleElectricityFlag) {
            await collectElectricity($.info.factoryInfo.factoryId);
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      },
    );
  });
}

function collectElectricity(facId, master) {
  return new Promise(async resolve => {
    $.get(
      taskUrl(
        'generator/CollectCurrentElectricity',
        `factoryid=${facId}&master=${master ? master : ''}&apptoken=&pgtimestamp=&phoneID=&doubleflag=1&_stk=_time%2Capptoken%2Cdoubleflag%2Cfactoryid%2Cpgtimestamp%2CphoneID%2CtimeStamp%2Czone`,
      ),
      (err, resp, data) => {
        try {
          const { ret, data: { CollectElectricity, loginPinCollectElectricity } = {}, msg } = JSON.parse(data);
          $.log(`${master ? '偷取好友' : '收取'} ${CollectElectricity} 电力 ${msg} \n${$.showLog ? data : ''}`);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      },
    );
  });
}

function pickUserComponents(pin, isMe) {
  return new Promise(async resolve => {
    $.get(taskUrl('usermaterial/GetUserComponent', `pin=${pin}`), async (err, resp, data) => {
      try {
        const { msg, data: { componentList = [] } = {} } = JSON.parse(data);
        $.log(`\n获取${isMe ? '自己' : '好友'}零件：${msg}\n${$.showLog ? data : ''}`);
        if (componentList.length > 0) {
          for (let i = 0; i < componentList.length; i++) {
            await $.wait(1000);
            const { placeId } = componentList[i];
            let status = [false];
            if (!status[0]) {
              status[0] = await pickUpComponent(placeId, pin, isMe);
            }
            if (status[0]) {
              break;
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function pickUpComponent(placeId, pin, isMe) {
  return new Promise(async resolve => {
    $.get(taskUrl('usermaterial/PickUpComponent', `pin=${pin}&placeId=${placeId}`), (err, resp, data) => {
      try {
        const { msg, data: { increaseElectric } = {} } = JSON.parse(data);
        $.log(
          `\n拾取${isMe ? '自己' : '好友'}零件：${msg}，获得电力 ${increaseElectric || 0}\n${$.showLog ? data : ''}`,
        );
        if (!increaseElectric) {
          resolve(true);
        } else {
          resolve(false);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function getTaskList() {
  return new Promise(async resolve => {
    $.get(taskListUrl('GetUserTaskStatusList', `_stk=_cfd_t%2CbizCode%2CdwEnv%2Cptag%2Csource%2CstrZone%2CtaskId`), async (err, resp, data) => {
      try {
        const { ret, data: { userTaskStatusList = [] } = {}, msg } = JSON.parse(data);
        $.allTask = userTaskStatusList.filter(x => x.awardStatus !== 1);
        $.log(`\n获取任务列表 ${msg}，总共${$.allTask.length}个任务！`);
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function browserTask() {
  return new Promise(async resolve => {
    const times = Math.max(...[...$.allTask].map(x => x.configTargetTimes));
    for (let i = 0; i < $.allTask.length; i++) {
      const task = $.allTask[i];
      $.log(`\n开始第${i + 1}个任务：${task.taskName}`);
      const status = [true, true];
      for (let i = 0; i < times; i++) {
        await $.wait(500);
        if (status[0]) {
          status[0] = await doTask(task);
        }
        await $.wait(500);
        if (status[1]) {
          status[1] = await awardTask(task);
        }
        if (!status[0] && !status[1]) {
          break;
        }
      }
      $.log(`\n结束第${i + 1}个任务：${task.taskName}\n`);
    }
    resolve();
  });
}

function awardTask({ taskId, taskName }) {
  return new Promise(resolve => {
    $.get(taskListUrl('Award', `taskId=${taskId}&_stk=_cfd_t%2CbizCode%2CdwEnv%2Cptag%2Csource%2CstrZone%2CtaskId`), (err, resp, data) => {
      try {
        const { msg, ret, data: { prizeInfo = '' } = {} } = JSON.parse(data);
        let str = '';
        if (msg.indexOf('活动太火爆了') !== -1) {
          str = '任务进行中或者未到任务时间';
        } else {
          str = msg + prizeInfo ? ` 获得电力 ${prizeInfo.slice(0, -2)}` : '';
        }
        $.log(`${taskName}[领奖励]：${str}\n${$.showLog ? data : ''}`);
        resolve(ret === 0);
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function doTask({ taskId, completedTimes, configTargetTimes, taskName }) {
  return new Promise(async resolve => {
    if (parseInt(completedTimes) >= parseInt(configTargetTimes)) {
      resolve(false);
      $.log(`\n${taskName}[做任务]： mission success`);
      return;
    }
    $.get(taskListUrl('DoTask', `taskId=${taskId}&_stk=_cfd_t%2CbizCode%2CconfigExtra%2CdwEnv%2Cptag%2Csource%2CstrZone%2CtaskId`), (err, resp, data) => {
      try {
        const { msg, ret } = JSON.parse(data);
        $.log(
          `\n${taskName}[做任务]：${msg.indexOf('活动太火爆了') !== -1 ? '任务进行中或者未到任务时间' : msg}${
            $.showLog ? '\n' + data : ''
          }`,
        );
        resolve(ret === 0);
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function investElectric() {
  return new Promise(async resolve => {
    if (!$.autoCharge) {
      $.result.push('【投入电力】：未打开自动投入');
      resolve();
      return;
    }
    $.get(
      taskUrl('userinfo/InvestElectric', `productionId=${$.info.productionInfo.productionId}`),
      (err, resp, data) => {
        try {
          const { msg, data: { investElectric } = {} } = JSON.parse(data);
          $.log(`\n投入电力: ${investElectric ? investElectric : ''} ${msg}\n${$.showLog ? data : ''}`);
          $.result.push(`【投入电力】：${investElectric}`);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      },
    );
  });
}

function getHireRewardList() {
  return new Promise(async resolve => {
    $.get(taskUrl('friend/QueryHireReward'), async (err, resp, data) => {
      try {
        const { ret, data: { hireReward = [] } = {}, msg } = JSON.parse(data);
        $.log(`\n获取打工奖励列表：${msg}\n${$.showLog ? data : ''}`);
        if (hireReward && hireReward.length > 0) {
          for (let i = 0; i < hireReward.length; i++) {
            const { date } = hireReward[i];
            await hireAward(`date=${date}`);
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function hireAward(body) {
  return new Promise(async resolve => {
    $.get(taskUrl('friend/HireAward', `${body}&_stk=_time%2Cdate%2Ctype%2Czone`), async (err, resp, data) => {
      try {
        const { msg, data: { investElectric } = {} } = JSON.parse(data);
        $.log(`\n收取打工电力：${msg}\n${$.showLog ? data : ''}`);
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function getFriends() {
  return new Promise(async resolve => {
    $.get(taskUrl('friend/QueryFactoryManagerList'), async (err, resp, data) => {
      try {
        const { msg, data: { list = [] } = {} } = JSON.parse(data);
        $.log(`\n获取工厂好友：${msg}\n${$.showLog ? data : ''}`);
        for (let i = 0; i < list.length; i++) {
          const { encryptPin, key, collectFlag } = list[i];
          await pickUserComponents(encryptPin);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function getFactoryIdByPin(pin) {
  return new Promise((resolve, reject) => {
    $.get(taskUrl('userinfo/GetUserInfoByPin', `pin=${pin}`), (err, resp, data) => {
      try {
        const { msg, data: { factoryList = [] } = {} } = JSON.parse(data);
        $.log(`\n获取工厂信息：${msg}\n${$.showLog ? data : ''}`);
        if (factoryList && factoryList[0]) {
          resolve(factoryList[0].factoryId);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function submitInviteId(userName) {
  return new Promise(resolve => {
    if (!$.info.user || !$.info.user.encryptPin) {
      resolve();
      return;
    }
    $.log('你的互助码: ' + $.info.user.encryptPin);
    $.post(
      {
        url: `https://api.ninesix.cc/api/jx-factory/${$.info.user.encryptPin}/${encodeURIComponent(userName)}`,
      },
      (err, resp, _data) => {
        try {
          const { data = {} } = JSON.parse(_data);
          $.log(`\n邀请码提交：${data.value}\n${$.showLog ? _data : ''}`);
          if (data.value) {
            $.result.push('【邀请码】：提交成功！');
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      },
    );
  });
}

function createAssistUser() {
  return new Promise(resolve => {
    $.get({ url: 'https://api.ninesix.cc/api/jx-factory' }, (err, resp, _data) => {
      try {
        const { data = {} } = JSON.parse(_data);
        $.log(`\n${data.value}\n${$.showLog ? _data : ''}`);
        $.get(taskAssistUrl('friend/AssistFriend', `sharepin=${data.value}`), async (err, resp, data) => {
          try {
            const { msg } = JSON.parse(data);
            $.log(`\n${msg}\n${$.showLog ? data : ''}`);
          } catch (e) {
            $.logErr(e, resp);
          } finally {
            resolve();
          }
        });
      } catch (e) {
        $.logErr(e, resp);
      }
    });
  });
}

function getTuanId() {
  return new Promise(async resolve => {
    $.get(taskUrl('tuan/QueryActiveConfig', `activeId=TvjO5k4gaVqVHMRJIogd_g%3D%3D`), async (err, resp, data) => {
      try {
        const { msg, data: { userTuanInfo } = {} } = JSON.parse(data);
        $.log(`\n获取团id：${msg}\n${$.showLog ? data : ''}`);
        if (!userTuanInfo || !userTuanInfo.tuanId) {
          await createTuan();
        } else {
          const tuanInfo = await getTuanInfo(`tuanId=${userTuanInfo.tuanId}`);
          $.log(`获取团详情成功 \n${$.showLog ? JSON.stringify(tuanInfo) : ''}`);
          if ((!tuanInfo || tuanInfo.realTuanNum === tuanInfo.tuanNum || tuanInfo.endTime < Math.ceil(new Date().getTime() / 1000)) && userTuanInfo.surplusOpenTuanNum > 0) {
            await createTuan();
          } else {
            $.userTuanInfo = tuanInfo;
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function getTuanInfo(body) {
  return new Promise(async resolve => {
    $.get(taskUrl('tuan/QueryTuan', `activeId=TvjO5k4gaVqVHMRJIogd_g%3D%3D&${body}`), async (err, resp, data) => {
      try {
        const { msg, data: { tuanInfo = [] } = {} } = JSON.parse(data);
        $.log(`\n获取开团信息：${msg}\n${$.showLog ? data : ''}`);
        if (tuanInfo && tuanInfo[0]) {
          resolve(tuanInfo[0]);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    });
  });
}

function submitTuanId(userName) {
  return new Promise(resolve => {
    if (!$.userTuanInfo || !$.userTuanInfo.tuanId) {
      resolve();
      return;
    }
    $.log('你的团码: ' + $.userTuanInfo && $.userTuanInfo.tuanId);
    $.post(
      {
        url: `https://api.ninesix.cc/api/jx-factory-tuan/${$.userTuanInfo.tuanId}/${encodeURIComponent(userName)}`,
      },
      (err, resp, _data) => {
        try {
          const { data = {} } = JSON.parse(_data);
          $.log(`\n团码提交成功：${data.value}\n${$.showLog ? _data : ''}`);
          if (data.value) {
            $.result.push('团码提交成功！');
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      },
    );
  });
}

function createTuan() {
  return new Promise(async resolve => {
    $.get(
      taskTuanUrl('tuan/CreateTuan', `activeId=TvjO5k4gaVqVHMRJIogd_g%3D%3D&isOpenApp=2&_stk=_time%2CactiveId%2CisOpenApp`),
      async (err, resp, _data) => {
        try {
          const { msg, data = {} } = JSON.parse(_data);
          $.log(`\n开团信息：${msg}\n${$.showLog ? _data : ''}`);
          if (data) {
            $.userTuanInfo = { ...$.userTuanInfo, ...data };
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      },
    );
  });
}

function joinTuan() {
  return new Promise(async resolve => {
    $.get({ url: 'https://api.ninesix.cc/api/jx-factory-tuan' }, (err, resp, _data) => {
      try {
        const { data = {} } = JSON.parse(_data);
        $.log(`\n${data.value}\n${$.showLog ? _data : ''}`);
        $.get(
          taskTuanUrl('tuan/JoinTuan', `activeId=TvjO5k4gaVqVHMRJIogd_g%3D%3D&tuanId=${data.value}`),
          async (err, resp, data) => {
            try {
              const { msg } = JSON.parse(data);
              $.log(
                `\n参团：${msg.indexOf('成功参团') !== -1 ? '您已参过此团或者参团失败' : msg}\n${
                  $.showLog ? data : ''
                }`,
              );
            } catch (e) {
              $.logErr(e, resp);
            } finally {
              resolve();
            }
          },
        );
      } catch (e) {
        $.logErr(e, resp);
      }
    });
  });
}

function awardTuan() {
  return new Promise(async resolve => {
    if (!$.userTuanInfo || !$.userTuanInfo.tuanId) {
      resolve();
      return;
    }
    $.get(
      taskTuanUrl('tuan/Award', `activeId=cKw-LGBsjl0XLu9coQ0d4A%3D%3D&tuanId=${$.userTuanInfo.tuanId}`),
      async (err, resp, data) => {
        try {
          const { ret, msg, data: { electric = 0 } = {} } = JSON.parse(data);
          if (ret === 0) {
            $.log(`\n领取开团奖励：${msg}，获得电力 ${electric}\n${$.showLog ? data : ''}`);
            await createTuan();
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      },
    );
  });
}

function showMsg() {
  return new Promise(resolve => {
    if (!$.info || !$.info.commodityInfo || !$.info.commodityInfo.name) {
      $.result.push('未选择商品，任务已执行完成，请及时选择商品');
    }
    if ($.notifyTime) {
      const notifyTimes = $.notifyTime.split(',').map(x => x.split(':'));
      const now = $.time('HH:mm').split(':');
      $.log(`\n${JSON.stringify(notifyTimes)}`);
      $.log(`\n${JSON.stringify(now)}`);
      if (notifyTimes.some(x => x[0] === now[0] && (!x[1] || x[1] === now[1]))) {
        $.msg($.name, '', `\n${$.result.join('\n')}`);
      }
    } else {
      $.msg($.name, '', `\n${$.result.join('\n')}`);
    }
    resolve();
  });
}

function taskUrl(function_path, body) {
  return {
    url: `${JD_API_HOST}dreamfactory/${function_path}?${body}&zone=dream_factory&sceneval=2&g_login_type=1&_time=${Date.now()}&_=${Date.now()}`,
    headers: {
      Cookie: $.currentCookie,
      Accept: `*/*`,
      Connection: `keep-alive`,
      Referer: `https://st.jingxi.com/pingou/dream_factory/index.html`,
      'Accept-Encoding': `gzip, deflate, br`,
      Host: `m.jingxi.com`,
      'User-Agent': `jdpingou;iPhone;3.16.0;14.2.1;f803928b71d2fcd51c7eae549f7bc3062d17f63f;network/wifi;model/iPhone13,2;appBuild/100374;ADID/00000000-0000-0000-0000-000000000000;supportApplePay/1;hasUPPay/0;pushNoticeIsOpen/0;hasOCPay/0;supportBestPay/0;session/64;pap/JA2019_3111789;brand/apple;supportJDSHWK/1;Mozilla/5.0 (iPhone; CPU iPhone OS 14_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148`,
      'Accept-Language': `zh-cn`,
    },
  };
}

function taskListUrl(function_path, body) {
  return {
    url: `${JD_API_HOST}newtasksys/newtasksys_front/${function_path}?${body}&source=dreamfactory&bizCode=dream_factory&sceneval=2&g_login_type=1&_time=${Date.now()}&_=${Date.now()}`,
    headers: {
      Cookie: $.currentCookie,
      Accept: `*/*`,
      Connection: `keep-alive`,
      Referer: `https://st.jingxi.com/pingou/dream_factory/index.html`,
      'Accept-Encoding': `gzip, deflate, br`,
      Host: `m.jingxi.com`,
      'User-Agent':
        'jdpingou;iPhone;3.15.2;14.2;f803928b71d2fcd51c7eae549f7bc3062d17f63f;network/4g;model/iPhone11,8;appBuild/100365;ADID/0E38E9F1-4B4C-40A4-A479-DD15E58A5623;supportApplePay/1;hasUPPay/0;pushNoticeIsOpen/1;hasOCPay/0;supportBestPay/0;session/2;pap/JA2015_311210;brand/apple;supportJDSHWK/1;',
      'Accept-Language': `zh-cn`,
    },
  };
}

function taskAssistUrl(function_path, body) {
  return {
    url: `${JD_API_HOST}dreamfactory/${function_path}?${body}&zone=dream_factory&sceneval=2&g_login_type=1&_time=${Date.now()}&_=${Date.now()}`,
    headers: {
      Cookie: $.currentCookie,
      Accept: `*/*`,
      Connection: `keep-alive`,
      Referer: `https://st.jingxi.com/pingou/dream_factory/index.html`,
      'Accept-Encoding': `gzip, deflate, br`,
      Host: `m.jingxi.com`,
      'Accept-Language': `zh-cn`,
    },
  };
}

function taskTuanUrl(function_path, body) {
  return {
    url: `${JD_API_HOST}dreamfactory/${function_path}?${body}&zone=dream_factory&sceneval=2&g_login_type=1&_time=${Date.now()}&_=${Date.now()}`,
    headers: {
      Cookie: $.currentCookie,
      Accept: `*/*`,
      Connection: `keep-alive`,
      Referer: `https://st.jingxi.com/pingou/dream_factory/index.html`,
      'Accept-Encoding': `gzip, deflate, br`,
      Host: `m.jingxi.com`,
      'Accept-Language': `zh-cn`,
      'User-Agent': 'jdpingou;',
    },
  };
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t){let e={"M+":(new Date).getMonth()+1,"d+":(new Date).getDate(),"H+":(new Date).getHours(),"m+":(new Date).getMinutes(),"s+":(new Date).getSeconds(),"q+":Math.floor(((new Date).getMonth()+3)/3),S:(new Date).getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,((new Date).getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in e)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?e[s]:("00"+e[s]).substr((""+e[s]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
