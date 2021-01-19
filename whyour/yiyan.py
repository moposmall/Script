#!/usr/bin/env python
# coding=utf-8
import urllib2,json,pymongo,ssl
from pymongo import MongoClient

print('连接到Mongo服务器...')

connection = MongoClient('mongodb://myblog:526900@23.83.242.217:27017/myBlog')
print('连接上了!')

context = ssl._create_unverified_context()
tdb = connection.myBlog
YiYanTable = tdb.yiyans

url = "https://v1.hitokoto.cn?encode=json"
# req = urllib2.Request(url)
# req.add_header('User-Agent', 'Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)')

html = urllib2.urlopen(url, context=context)

jsonContent = json.loads(html.read())

YiYan = {}
YiYan['content'] = jsonContent['hitokoto']
YiYan['type'] = jsonContent['type']
YiYan['from'] = jsonContent['from']
YiYan['creator'] = jsonContent['creator']
YiYan['created_at'] = jsonContent['created_at']
YiYan['uid'] = jsonContent['id']
print (YiYan)

oneContent = jsonContent['hitokoto'].encode('utf-8')
oneType = jsonContent['type'].encode('utf-8')
oneOrigin = jsonContent['from'].encode('utf-8')
oneCreator = jsonContent['creator'].encode('utf-8')
uid = jsonContent['id']
oneCreatedAt = jsonContent['created_at'].encode('latin-1','ignore')
print (oneContent)
print (oneType)
print (oneCreator)
print (oneCreatedAt)

temp = YiYanTable.find_one({'uid': uid})
if not temp:
    YiYanTable.insert_one(YiYan)


# for data in YiYanTable.find():
#     print (data)

print ('爬取数据并插入mysql数据库完成...')