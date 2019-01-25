# sms-sender-server
一个Node.js的服务端应用，与Android app协同，远程读取短信。使用Firebase Cloud Message（FCM）服务。

与此服务器配套的Android客户端repo：https://github.com/ZTGeng/sms-sender-android

### 前提：

 - 已有FCM项目或创建一个新的。见：https://console.firebase.google.com/
 - 已安装Node.js 6.0以上和npm

### 开始：

1. clone此repo
2. `npm install`
3. 打开`sms-server.js`，完成注释中的三个TODO项：

   1. 在Firebase console -> 项目Settings -> Service accounts生成和下载私钥文件，保存在此目录下，并将文件名填入`sms-server.js`第6行（同时应将文件名加入`.gitignore`）
   2. 在Firebase console -> 项目Settings -> Service accounts查看数据库URL，填入`sms-server.js`第13行
   3. 打开上面下载的私钥文件，在JSON对象中添加键值对`"password": "..."`，其值为一个自定义的口令
   
4. `node index.js`（服务器默认监听8000端口，可在`index.js`中修改）
5. 如在本地测试运行，可使用同一局域网内的设备访问：http:// + IP地址:8000，应打开主页面
6. 根据指引运行Android app，点击按钮更新Token
7. 在主页面上输入口令，点击按钮获取短信
