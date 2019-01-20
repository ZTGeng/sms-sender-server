const http = require('http');
const url = require("url");
const admin = require('firebase-admin');
// TODO: 在Firebase console -> Settings -> Service accounts生成和下载私钥文件，并写入下方代码。
// 您应该将该文件名加入到.gitignore中以避免将其暴露于公开repo。
const serviceAccount = require('path/to/serviceAccountKey.json');

const DEFAULT_SMS_NUMBER = 5;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // TODO: 在Firebase console -> Settings -> Service accounts查看此URL。
  databaseURL: 'https://<DATABASE_NAME>.firebaseio.com'
});

// 此demo使用一个变量暂时地保存移动设备的FCM Token。此Token用于将消息发送给特定某一台设备。
// 您应该考虑使用更长久的方式保存此Token，例如数据库。
// 客户端在一些情况下会刷新Token，因此需要提供更新的方式。
var token;

// 暂时地保存请求方的http response，以便在获取短信文本后通过它返回给请求方。
// 您也可以考虑不保存response，而是通过FCM消息的方式发送文本给请求方。
var resBuffer = function() {
    var resTemp;
    var timer;

    // （据说）一些浏览器在超过120秒未获得响应时会终止连接。因此我们限制等待时间为110秒。
    var start = (res) => {
        clearTimeout(timer);
        drop();
        resTemp = res;
        timer = setTimeout(drop, 110000);
        console.log("Waiting for fetching sms result");
    };
    var drop = () => {
        if (resTemp) {
            resTemp.writeHead(204, { "Content-Type": "text/html; charset=utf-8" });
            resTemp.end("<p>Failed to fetch sms!</p>");
            resTemp = null;
            console.log("Res buffer dropped due to timeout or new request coming");
        }
    };
    var end = (html) => {
        clearTimeout(timer);
        if (resTemp) {
            resTemp.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            resTemp.end(html);
            resTemp = null;
            console.log("Sms fetching result sent to requester");
        } else {
            console.log("Previous res buffer was unexpected dropped!")
        }
    };

    return {
        start: start,
        end: end
    };
}();

// 此demo封装于一个函数内，以方便地从其他node项目中调用。调用方法参考index.js。
// 此demo因API过于简单而没有使用Express路由以减少依赖。用也是可以的。
function create() {
    return http.createServer((req, res) => {
        var method = req.method;
        var path = url.parse(req.url).pathname;
        console.log(`${method} ${path}`);

        // 手机端：更新设备的FCM Token。
        if (method == 'POST' && path == '/token') {
            getBody(req, (data) => {
                token = data;
                console.log("New token: " + data);
            });
            res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Token update success!")
            return;
        }

        // 手机端：发送短信文本，格式为JSONArray。
        if (method == 'POST' && path == '/sms') {
            getBody(req, (data) => {
                var sms = JSON.parse(data);
                resBuffer.end(parseSms(sms));
                console.log(JSON.stringify(sms, null, 2));
            });
            res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Send sms success!")
            return;
        }

        // 网页端：发起查询请求。使用一个自定义的静态口令进行授权。
        // TODO: 此demo出于简化考虑，将该口令添加在下载的Firebase私钥文件中，即下方serviceAccount.password。
        // 该文件为JSON格式，只需在其中添加一行："password": "（自定义口令）",
        // 您应该考虑使用数据库等方式保存该口令，并可以基于数据库进一步提供多用户、口令修改等功能。
        // 不可在此代码文件中直接hard code保存口令，以避免将其暴露于公开repo。
        if (method == 'POST' && path == '/fetch') {
            getBody(req, (data) => {
                var params = parseParams(data);
                if (params.password && params.password == serviceAccount.password) {
                    fetchSms(params.number || DEFAULT_SMS_NUMBER, req.headers.host);
                    resBuffer.start(res);
                } else {
                    res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" });
                    res.end("<p>Password not matching!</p>");
                }
            });
            return;
        }

        // 网页端：显示主页面。
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
        <p>This is sms fetch server!</p>
        <form action="/fetch" method="post">
          <input type="password" name="password" placeholder="Input password"><br>
          <input type="number" name="number" value=${DEFAULT_SMS_NUMBER}><br>
          <input type="submit" value="Fetch">
        </form>
        `)
    });
}

// 向移动设备发送FCM消息，要求其发送短信文本。
function fetchSms(number) {
    if (!token) {
        console.log("No valid token");
        return;
    }

    var message = {
        data: {
            number: number,
            server: host
        },
        android: {
            collapseKey: 'fetch_sms',
            priority: 'high',
            ttl: 110000,
            restrictedPackageName: 'com.ztgeng.smssenderkotlin'
        },
        token: token
    };

    admin.messaging().send(message)
        .then((response) => {
            console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            console.log('Error sending message:', error);
        });
}

// 读取http request中的body。大小限制为1M。
function getBody(req, callback) {
    var data = "";
    req.on('data', (chunk) => {
        data += chunk.toString();
        if (data.length > 1e6) {
            req.connection.destroy();
        }
    });
    req.on('end', () => {
        callback(data);
    });
}

function parseSms(jsonArray) {
    var html = "";
    jsonArray.forEach(json => {
        html += `<p>From: ${json.number}</p><p>${json.time}</p><p>${json.message}</p><br>`
    });
    return html;
}

function parseParams(data) {
    var params = {};
    data.split("&").forEach(param => {
        var pair = param.split("=");
        if (pair.length == 2) {
            params[pair[0]] = pair[1];
        }
    });
    return params;
}

exports.create = create;
