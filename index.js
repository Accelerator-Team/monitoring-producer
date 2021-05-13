const si = require('systeminformation');
const cron = require('node-cron');
const https = require('https');
const exec = require('child_process').exec;
let WebSocket = require("ws");

const argvs = process.argv.slice(2);
let ws, server_url, serverToken, systemInforCache = [], serverAuthorization, delayTimer = 0, wsConnectRetry = 0;



// Compute args to extract --url and --api-key for making a post request to monitoring server
if (!argvs.length || argvs.length < 2) {
    throw new Error("Mandatory arguments not received.");
}

for (var i = 0; i < argvs.length; i++) {
    let arg = argvs[i];
    if (arg.indexOf('url') > -1 || arg.indexOf('URL') > -1) { // [MONITORING_URL]
        server_url = arg.split("=")[1].trim();
    }
    else if (arg.indexOf('server-token') > -1 || arg.indexOf('SERVER-TOKEN') > -1) { // [SERVER_TOKEN]
        serverToken = arg.split("=")[1].trim();
    }
}

// if (!server_url || !serverToken) {
if (!server_url || !serverToken) {
    throw new Error("Mandatory arguments not received.");
}



//Generate JWT token using server token
async function generateJWT() {
    return new Promise((resolve, reject) => {
        const options = {
            'method': 'GET',
            'headers': {
                'server-token': serverToken,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(`${server_url}/api/jwt/generate`, options, res => {
            // console.log(new Date(), `statusCode: ${res.statusCode}`);
            res.on('data', d => {
                try {
                    d = JSON.parse(d);
                    // console.log(new Date(), `data: ${d['jwt']}`);
                    serverAuthorization = `Bearer ${d['jwt']}`;
                } catch (e) {
                    console.log(new Date(), 'problem with GenerateJWT data: ' + e.message);
                }

            });

            res.on('end', () => {
                if (serverAuthorization) {
                    return resolve(serverAuthorization);
                } else {
                    return reject()
                }
            });
        });

        req.on('error', function (e) {
            console.log(new Date(), 'problem with GenerateJWT request: ' + e.message);
            return reject();
        });

        req.end();
    });
}



function initWebSocket() {
    const options = {
        headers: {
            "Authorization": serverAuthorization
        }
    };

    ws = new WebSocket(`${server_url}/ws/monitoring/save`, options);

    ws.onopen = function () {
        wsConnectRetry = 0;
        // console.log(new Date(), 'Monitoring producer is now connected to OpenVM backend');
    };

    ws.onmessage = function (e) {
        // console.log(new Date(), 'Message received from OpenVM backend: ', e.data);
        try {
            if (e.data) {
                let msg = JSON.parse(e.data);
                if (msg && msg.hasOwnProperty('delayTimer')) { // check if delayTimer in message
                    delayTimer = parseInt(msg['delayTimer']);
                    console.log(new Date(), 'delayTimer to post data:', delayTimer);
                }
            }
        } catch (err) {
            // Survive
        }
    };

    ws.onclose = function (e) {
        console.log(new Date(), 'Socket is closed. Code:', e.code, 'Retry after:', 1000 * wsConnectRetry);
        setTimeout(function () {
            initWebSocket();
        }, 1000 * wsConnectRetry); //backoff mechanism
    };

    ws.onerror = function (err) {
        console.error(new Date(), 'Socket encountered error: ', err.message, 'Closing socket');
        ws.close();
        wsConnectRetry += 1;
    };

    return ws;
}



// get number of network packets out 
function execCommandAsync(command) {
    return new Promise((resolve, reject) => {
        exec(command, function (error, stdout, stderr) {
            if (error) {
                console.log(new Date(), 'exec error: ' + error);
            }
            if (stderr) {
                console.log(new Date(), 'exec stderr: ' + stderr);
            }
            return resolve(stdout);
        });
    });
}


// get number of network packets in/out 
async function getNetworkPackets() {
    let rx_packets = null, tx_packets = null;
    try {
        rx_packets = await execCommandAsync('cat /sys/class/net/eth0/statistics/rx_packets');
        rx_packets = parseInt(rx_packets);
        tx_packets = await execCommandAsync('cat /sys/class/net/eth0/statistics/tx_packets');
        tx_packets = parseInt(tx_packets);
    } catch (err) {
        console.log(new Date(), 'problem while executing getNetworkPackets : ' + err);
    }
    return { rx_packets, tx_packets };
}


// Collect and return system information
async function getSystemInformation() {
    try {
        let payload = {
            time: new Date(),
        };

        payload['uptime'] = si.time()['uptime'];

        const osInfo = await si.osInfo();
        payload['cname'] = osInfo['fqdn'];

        const mem = await si.mem();
        payload['mem_total'] = mem['total'];
        payload['mem_free'] = mem['free'];
        payload['mem_used'] = mem['used'];
        payload['mem_swaptotal'] = mem['swaptotal'];
        payload['mem_swapused'] = mem['swapused'];
        payload['mem_swapfree'] = mem['swapfree'];

        const cpu = await si.currentLoad();
        payload['cpu_avgLoad'] = cpu['avgLoad'];
        payload['cpu_currentLoad'] = cpu['currentLoad'];

        const disksIO = await si.disksIO();
        payload['disksIO_rIO'] = disksIO['rIO'];
        payload['disksIO_wIO'] = disksIO['wIO'];
        payload['disksIO_rIO_sec'] = disksIO['rIO_sec'];
        payload['disksIO_wIO_sec'] = disksIO['wIO_sec'];

        const fsStats = await si.fsStats();
        payload['fsStats_rx'] = fsStats['rx'];
        payload['fsStats_wx'] = fsStats['wx'];
        payload['fsStats_rx_sec'] = fsStats['rx_sec'];
        payload['fsStats_wx_sec'] = fsStats['wx_sec'];

        const fsSize = await si.fsSize();
        if (fsSize.length) {
            payload['fsSize_size'] = fsSize[0]['size'];
            payload['fsSize_used'] = fsSize[0]['used'];
            payload['fsSize_available'] = fsSize[0]['available'];
        }

        const networkStats = await si.networkStats("*");
        if (networkStats.length) {
            payload['networkStats_rx_bytes'] = networkStats[0]['rx_bytes'];
            payload['networkStats_tx_bytes'] = networkStats[0]['tx_bytes'];
            payload['networkStats_rx_sec'] = networkStats[0]['rx_sec'];
            payload['networkStats_tx_sec'] = networkStats[0]['tx_sec'];
        }

        const networkPackets = await getNetworkPackets();
        payload['networkStats_rx_packets'] = networkPackets['rx_packets'];
        payload['networkStats_tx_packets'] = networkPackets['tx_packets'];

        // console.log(JSON.stringify(payload));
        return payload;
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(new Date(), "Error getting system info", e);
    }
}

// Compute system information */1 * * * *

async function spawnWorker() {
    const sysInfo = await getSystemInformation();
    if(systemInforCache.length < 5){
        systemInforCache.push(sysInfo);
    }else{
        systemInforCache.shift();
        systemInforCache.push(sysInfo);
    }

    setTimeout(function () {
        ws.send(JSON.stringify(systemInforCache));
        systemInforCache = [];
    }, 1000 * delayTimer); //openVM mechanism
}

const task = cron.schedule('*/1 * * * *', async () => {
    spawnWorker();
}, {
    scheduled: false
});


async function mainWorker() {
    try {
        await generateJWT();
    } catch (err) {
        console.log(new Date(), 'error calling generateJWT ' + err);
        mainWorker();
        return;
    }
    initWebSocket();
    // Debug
    // await spawnWorker();
    // Prod
    task.start();
}

// (async () => {
    mainWorker();
    console.log(new Date(), "monitoring-producer cron job started..");
// })();

