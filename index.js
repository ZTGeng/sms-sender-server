const sms_server = require('./sms-server');

const sms_server_port = 8000;

sms_server.create().listen(sms_server_port, function () {
  console.log("Sms fetch server listening port " + sms_server_port)
});
