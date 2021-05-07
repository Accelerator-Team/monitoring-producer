const si = require('systeminformation');
const https = require('https');
const argvs = process.argv.slice(2);
let server_url, apiKey; serverId;
let systemInforCache = [];
const intervalInMilliseconds = 60000;

// Compute args to extract --url and --api-key for making a post request to monitoring server
if (!argvs.length || argvs.length < 2) {
    throw new Error("Mandatory arguments not received.");
}

for (var i = 0; i < argvs.length; i++) {
    let arg = argvs[i];
    if (arg.indexOf('url') > -1 || arg.indexOf('URL') > -1) { // [MONITORING_URL]
        server_url = arg.split("=")[1].trim();
    } else if (arg.indexOf('api-key') > -1 || arg.indexOf('API-KEY') > -1) { // [API_KEY]
        apiKey = arg.split("=")[1].trim();
    } else if (arg.indexOf('server-id') > -1 || arg.indexOf('SERVER-ID') > -1) { // [SERVER_ID]
        serverId = arg.split("=")[1].trim();
    }
}

if (!server_url || !apiKey) {
    throw new Error("Mandatory arguments not received.");
}


// Post system information to monitoring server
function sendSystemInfo(payload) {
    const options = {
        'method': 'POST',
        'headers': {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'Content-Length': payload.length
        }
    };

    const req = https.request(server_url, options, res => {
        // console.log(new Date(), `statusCode: ${res.statusCode}`);
    });

    req.on('error', function (e) {
        // Deal with the fact the chain failed
        console.log(new Date(), 'problem with post system information request: ' + e.message);
    });

    req.write(payload);
    req.end()
}

// Collect and return system information
async function getSystemInformation() {
    try {
        let payload = {
            time: new Date(),
            SERVER_ID: serverId,
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

        // console.log(JSON.stringify(payload));
        return payload;
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(new Date(), "Error getting system info", e);
    }
}

// Compute system information every ${intervalInMilliseconds} miliseconds
setInterval(initWorker, intervalInMilliseconds);
console.log(new Date(), "monitoring-producer scheduler started..");

async function initWorker() {
    const sysInfo = await getSystemInformation();
    systemInforCache.push(sysInfo);

    if (systemInforCache.length >= 5) {
        sendSystemInfo(JSON.stringify(systemInforCache));
        systemInforCache = [];
    }
}

// Debug
// (async () => {
//     await initWorker();
// })();