const fs = require('fs');
const si = require('systeminformation');
const cron = require('node-cron');
const https = require('https');
const exec = require('child_process').exec;
let WebSocket = require("ws");
const os = require("os");
const manitenance = require('./maintenance');
const { version } = require('./package.json');

console.log("Starting monitoring producer V" + version);

//check if is up to date for debug
/*
(async () => {
    var v1 = await manitenance.latestPackage();
    var v2 = manitenance.version()
    console.log("v1==v2: ", (v1 == v2))
})();
return;
*/

/*
setTimeout(function(){
    manitenance.checkforUpdateNow();
}, 2000);
*/

const argvs = process.argv.slice(2);
let ws, server_url, serverToken, siStatupCache = {}, siCpuCache = {}, systemInforCache = [], serverAuthorization, delayTimer = 0,
    schedulerReqSchema = { uptime: 1, cname: 1, memory: 1, cpu: 1, disksIO: 1, fsStats: 1, fsSize: 1, networkStats: 1 },
    schedulerCron = '*/1 * * * *', wsConnectRetry = 0, mainWorkerInitRetry = 0, streamController;


// Compute args to extract --url and --api-key for making a post request to monitoring server
for (var i = 0; i < argvs.length; i++) {
    let arg = argvs[i];
    if (arg.indexOf('url') > -1 || arg.indexOf('URL') > -1) { // [MONITORING_URL]
        server_url = arg.split("=")[1].trim();
    }
    else if (arg.indexOf('server-token') > -1 || arg.indexOf('SERVER-TOKEN') > -1) { // [SERVER_TOKEN]
        serverToken = arg.split("=")[1].trim();
    }
}

if (!serverToken) { // read serverToken from /opt/server_token.secret
    try {
        serverToken = fs.readFileSync('/opt/server_token.secret', 'utf8');
        serverToken = serverToken.trim();
    } catch (err) {
        console.log(new Date(), 'problem while reading /opt/server_token.secret: ' + err);
    }
}

// if (!server_url || !serverToken) {
if (!server_url || !serverToken) {
    throw "Mandatory arguments not received.";
}



//Generate JWT token using server token
function generateJWT() {
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
                    return reject();
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


async function setIntervalStreamStart(reqSchema) {
    try {
        let sysInfo = await getSystemInformation(reqSchema, true);
        if (ws && ws.readyState == 1 && sysInfo) {
            ws.send(JSON.stringify({ event: "START_STREAM", data: sysInfo }));
        }
    } catch (err) {
        // console.log(new Date(), 'getSystemInformation error: ' + err);
    }
}


function handleStartConfig(msg) {
    if (msg.hasOwnProperty('deplay')) {
        delayTimer = parseInt(msg['deplay']);
    }

    if (msg.hasOwnProperty('scheduler_req_schema')) {
        schedulerReqSchema = msg['scheduler_req_schema'];
    }

    console.log(new Date(), 'delayTimer to post data:', delayTimer);
}

function handleStreamStart(msg) {
    if (!streamController && msg.hasOwnProperty('interval')) {
        let reqSchema;
        if (msg['stream_req_schema']) {
            reqSchema = msg['stream_req_schema'];
        }
        setIntervalStreamStart(reqSchema);
        const interval = msg['interval'] || 1000;
        streamController = setInterval(setIntervalStreamStart, interval, reqSchema);
    }
}

function handleStreamStop() {
    if (streamController) {
        clearInterval(streamController);
        streamController = undefined;
    }
}


async function handleFetchProcesses() {
    try {
        let payload = {
            time: new Date(),
        };

        payload['processes'] = await si.processes();
        ws.send(JSON.stringify({ event: "FETCH_PROCESSES", data: payload }));
        return;
    } catch (err) {
        console.log(new Date(), "Error getting system info", err);
        ws.send(JSON.stringify({ event: "FETCH_PROCESSES", data: { status: "500", message: "INTERNAL_SERVER_ERROR: Error getting system information" } }), isBinary);
    }
}

function handleGetVersion() {
    try {
        if (ws && ws.readyState == 1) {
            ws.send(JSON.stringify({ event: "GET_PRODUCER_VERSION", data: manitenance.version() }));
        }
    } catch (err) {
        // console.log(new Date(), 'get app version error: ' + err);
    }
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
        wsSendSystemInfoCache();
        // console.log(new Date(), 'Monitoring producer is now connected to OpenVM backend');
    };

    ws.onmessage = function (e) {
        // console.log(new Date(), 'Message received from OpenVM backend: ', e.data);
        try {
            if (e.data) {
                let msg = JSON.parse(e.data);
                if (msg && msg.hasOwnProperty('cmd')) {
                    const cmd = msg['cmd'];
                    switch (cmd) {
                        case "START_CONFIG":
                            handleStartConfig(msg);
                            break;
                        case "STREAM_START":
                            handleStreamStart(msg);
                            break;
                        case "STREAM_UPDATE":
                            handleStreamStop();
                            handleStreamStart(msg);
                            break;
                        case "STREAM_STOP":
                            handleStreamStop();
                            break;
                        case "SCHEDULER_START":
                            task.start();
                            break;
                        case "SCHEDULER_STOP":
                            task.stop();
                            break;
                        case "FETCH_PROCESSES":
                            handleFetchProcesses();
                            break;
                        case "UPDATE_MONITORING_PRODUCER":
                            manitenance.update();
                            break;
                        case "GET_PRODUCER_VERSION":
                            handleGetVersion();
                            break;
                        default:
                            console.log("Unsupported command received from server");
                    }
                }
            }
        } catch (err) {
            // Survive
        }
    };

    ws.onclose = function (e) {
        handleStreamStop();
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

function wsSendSystemInfoCache() {
    if (ws && ws.readyState == 1 && systemInforCache.length) {
        ws.send(JSON.stringify({ event: "SCHEDULED_STREAM", data: systemInforCache }));
        systemInforCache = [];
    }
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
var mainInterfaceName = ""; 
async function getNetworkPackets() {

    if (mainInterfaceName == ""){
        mainInterfaceName = await execCommandAsync('ip route | grep default | sed -e "s/^.*dev.//" -e "s/.proto.*//"');
        mainInterfaceName = mainInterfaceName.trim();

        //remove strange chars (case with oneprovider)
        if ( mainInterfaceName.indexOf("eth0") > -1){
            mainInterfaceName = "eth0";
        }
    }

    let rx_packets = null, tx_packets = null;
    try {
        rx_packets = await execCommandAsync('cat /sys/class/net/' + mainInterfaceName + '/statistics/rx_packets');
        rx_packets = parseInt(rx_packets);
        tx_packets = await execCommandAsync('cat /sys/class/net/' + mainInterfaceName + '/statistics/tx_packets');
        tx_packets = parseInt(tx_packets);
    } catch (err) {
        //console.log(new Date(), 'problem while executing getNetworkPackets : ' + err);
    }
    return { rx_packets, tx_packets };
}


// Get average cpu load
function getAvgCpuLoad() {
    let cpu = {};
    try {
        const cpus = os.cpus();
        const load = os.loadavg();
        cpu = {
            load1: load[0],
            load5: load[1],
            load15: load[2],
            cores: Array.isArray(cpus) ? os.cpus().length : null,
        };
        // cpu.load1 = Math.min((cpu.load1 * 100 / cpu.cores).toFixed(2), 100);
        // cpu.load5 = Math.min((cpu.load5 * 100 / cpu.cores).toFixed(2), 100);
        // cpu.load15 = Math.min((cpu.load15 * 100 / cpu.cores).toFixed(2), 100);
        cpu.load1 = Math.min((cpu.load1 * 100).toFixed(2), 100);
        cpu.load5 = Math.min((cpu.load5 * 100 ).toFixed(2), 100);
        cpu.load15 = Math.min((cpu.load15 * 100).toFixed(2), 100);
    } catch (err) {

    }
    return cpu;
}


// Collect and return system information
async function getSystemInformation(req = { uptime: 0, cname: 1, memory: 1, cpu: 1, disksIO: 0, fsStats: 0, fsSize: 1, networkStats: 0 }, isStreaming = false) {
    try {
        let payload = {
            time: new Date(),
        };

        if (req.uptime) {
            payload['uptime'] = si.time()['uptime'];
        }


        if (req.cname) {
            // Read and set to cache as the value remains same
            if (!siStatupCache.cname) {
                siStatupCache.cname = os.hostname();
            }
            payload['cname'] = siStatupCache.cname;
        }


        if (req.memory) {
            const mem = await si.mem();
            payload['mem_total'] = mem['total'];
            payload['mem_free'] = mem['available'];
            payload['mem_used'] = mem['active'];
            payload['mem_swaptotal'] = mem['swaptotal'];
            payload['mem_swapused'] = mem['swapused'];
            payload['mem_swapfree'] = mem['swapfree'];
        }


        if (req.cpu) {
            if (isStreaming || !streamController) {
                const cpu = await si.currentLoad();
                // siCpuCache['cpu_avgLoad'] = cpu['avgLoad'];
                siCpuCache['cpu_currentLoad'] = cpu['currentLoad'];
            }

            payload['cpu_currentLoad'] = siCpuCache['cpu_currentLoad'];

            let avgCpuLoad = getAvgCpuLoad();
            payload['cpu_avgLoad'] = avgCpuLoad['load15'];
            
            if (!isStreaming) {
                siCpuCache = {};
            }
        }


        if (req.disksIO) {
            const disksIO = await si.disksIO();
            payload['disksIO_rIO'] = disksIO['rIO'];
            payload['disksIO_wIO'] = disksIO['wIO'];
            payload['disksIO_rIO_sec'] = disksIO['rIO_sec'];
            payload['disksIO_wIO_sec'] = disksIO['wIO_sec'];
        }


        if (req.fsStats) {
            const fsStats = await si.fsStats();
            payload['fsStats_rx'] = fsStats['rx'];
            payload['fsStats_wx'] = fsStats['wx'];
            payload['fsStats_rx_sec'] = fsStats['rx_sec'];
            payload['fsStats_wx_sec'] = fsStats['wx_sec'];
        }


        if (req.fsSize) {
            const fsSize = await si.fsSize();
            if (fsSize.length) {
                payload['fsSize_size'] = fsSize[0]['size'];
                payload['fsSize_used'] = fsSize[0]['used'];
                payload['fsSize_available'] = fsSize[0]['available'];
            }
        }


        if (req.networkStats) {
            const networkStats = await si.networkStats();
            if (networkStats.length) {
                payload['networkStats_rx_bytes'] = networkStats[0]['rx_bytes'];
                payload['networkStats_tx_bytes'] = networkStats[0]['tx_bytes'];
                payload['networkStats_rx_sec'] = networkStats[0]['rx_sec'];
                payload['networkStats_tx_sec'] = networkStats[0]['tx_sec'];
            }

            const networkPackets = await getNetworkPackets();
            payload['networkStats_rx_packets'] = networkPackets['rx_packets'];
            payload['networkStats_tx_packets'] = networkPackets['tx_packets'];
        }


        // console.log(JSON.stringify(payload));
        return payload;
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(new Date(), "Error getting system info", e);
    }
}

// Compute system information */1 * * * *

async function spawnWorker() {
    const sysInfo = await getSystemInformation(schedulerReqSchema, false);
    if (systemInforCache.length < 5) {
        systemInforCache.push(sysInfo);
    } else {
        systemInforCache.shift();
        systemInforCache.push(sysInfo);
    }

    setTimeout(function () {
        wsSendSystemInfoCache();
    }, 1000 * delayTimer); //openVM mechanism
}

const task = cron.schedule(schedulerCron, async () => {
    spawnWorker();
}, {
    scheduled: false
});


async function mainWorker() {
    manitenance.init();
    try {
        await generateJWT();
        mainWorkerInitRetry = 0;
    } catch (err) {
        console.log(new Date(), 'error calling generateJWT ');
        if (mainWorkerInitRetry < 50) {
            mainWorkerInitRetry += 1;
            setTimeout(function () {
                mainWorker();
            }, 60000 * mainWorkerInitRetry);
        } 
        else {
            console.log(new Date(), 'Max attempts exceed to generateJWT for this server. Monitoring process will exit now.');
        }
        return;
    }
    initWebSocket();
    mainWorkerInitRetry = 0;
    // Debug
    // await spawnWorker();
    // Prod
    task.start();
}

// (async () => {
mainWorker();
// handleStartStream({ interval: 1000, stream_req_schema: {networkStats: 1, cpu: 1} })
console.log(new Date(), "monitoring-producer cron job started..");
// })();

