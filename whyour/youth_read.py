#!/usr/bin/env python3
# _*_ coding:utf-8 _*_

# 此脚本参考 https://raw.githubusercontent.com/Sunert/Scripts/master/Task/Youth_Read.js

import traceback
import time
import sys
import os
from util import send, requests_session
from datetime import datetime, timezone, timedelta
from concurrent.futures import ProcessPoolExecutor

# body分割方式，默认 &
READ_BODY_SPLIT = '&'

READ_BODY1 = ""
READ_BODY2 = ""

# 多账号
READ_BODYS = [READ_BODY1, ]

# ac读取环境变量
if "YOUTH1_READ_BODY1" in os.environ:
  for i in range(3):
    firstVar = f'YOUTH{str(i+1)}_READ_BODY1'
    if firstVar in os.environ:
      for j in range(10):
        dynamicVar = f'YOUTH{str(i+1)}_READ_BODY{str(j + 1)}'
        if dynamicVar in os.environ:
          globals()['READ_BODY' + str(i + 1)] += f'{os.environ[dynamicVar]}&'
    else:
      break

cur_path = os.path.abspath(os.path.dirname(__file__))
root_path = os.path.split(cur_path)[0]
sys.path.append(root_path)

def get_standard_time():
  """
  获取utc时间和北京时间
  :return:
  """
  # <class 'datetime.datetime'>
  utc_datetime = datetime.utcnow().replace(tzinfo=timezone.utc)  # utc时间
  beijing_datetime = utc_datetime.astimezone(timezone(timedelta(hours=8)))  # 北京时间
  return beijing_datetime

def read(body, i):
  """
  :param body:
  :return:
  """
  try:
    url = 'https://ios.baertt.com/v5/article/complete.json'
    headers = {'User-Agent': 'KDApp/1.7.8 (iPhone; iOS 14.0; Scale/3.00)', 'Content-Type':
               'application/x-www-form-urlencoded;charset=utf-8'}
    response = requests_session().post(
      url=url, headers=headers, data=body, timeout=30).json()
    if response['error_code'] == '0':
      if 'read_score' in response['items']:
        print(f"\n本次阅读获得{response['items']['read_score']}个青豆，请等待30s后执行下一次阅读\n")
        time.sleep(30)
      elif 'score' in response['items']:
        print(f"\n本次阅读获得{response['items']['score']}个青豆，即将开始下次阅读\n")
      elif 'max_notice' in response['items']:
        print(f"\n本次阅读获得{response['items']['max_notice']}个青豆，即将开始下次阅读\n")
    elif response['success'] == False:
      print(f'\n第{i}次阅读请求有误，请删除此请求\n')
    return
  except:
    print(traceback.format_exc())
    return

def run(body, index):
  beijing_datetime = get_standard_time()
  bodyList = body.split(READ_BODY_SPLIT)
  print(f'\n【中青看点账号{index}】{beijing_datetime.strftime("%Y-%m-%d %H:%M:%S")}')
  print(f'\n【中青看点账号{index}】总共{len(bodyList)}个body')
  for i in range(0, len(bodyList)):
    print(f'\n账号{index}开始中青看点第{i+1}次阅读')
    read(body=bodyList[i], i=i+1)
  print(f'\n【账号{index}中青结束】{beijing_datetime.strftime("%Y-%m-%d %H:%M:%S")}')

def main():
  with ProcessPoolExecutor(max_workers=3) as executor:
    for i in range(0, len(READ_BODYS)):
      executor.submit(run, READ_BODYS[i], i+1)
    executor.shutdown(wait=True)

  # 暂无通知
  # if beijing_datetime.hour == 23 and beijing_datetime.minute >= 0 and beijing_datetime.minute <= 10:
  #   send(title=title, content=result)
  # elif not beijing_datetime.hour == 23:
  #   print('未进行消息推送，原因：没到对应的推送时间点\n')
  # else:
  #   print('未在规定的时间范围内\n')

if __name__ == '__main__':
    main()
