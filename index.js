const si = require('systeminformation');
const cron = require('node-cron');
const https = require('https');
const exec = require('child_process').exec;

const argvs = process.argv.slice(2);
let server_url, serverToken;
let systemInforCache = [], serverAuthorization;


// Compute args to extract --url and --api-key for making a post request to monitoring server
if (!argvs.length || argvs.length < 2) {
    throw new Error("Mandatory arguments not received.");
}

for (var i = 0; i < argvs.length; i++) {
    let arg = argvs[i];
    if (arg.indexOf('url') > -1 || arg.indexOf('URL') > -1) { // [MONITORING_URL]
        server_url = arg.split("=")[1].trim();
        // } else if (arg.indexOf('api-key') > -1 || arg.indexOf('API-KEY') > -1) { // [API_KEY]
        //     apiKey = arg.split("=")[1].trim();
    }
    else if (arg.indexOf('server-token') > -1 || arg.indexOf('SERVER-TOKEN') > -1) { // [SERVER_ID]
        serverToken = arg.split("=")[1].trim();
    }
}

// if (!server_url || !serverToken) {
if (!server_url|| !serverToken) {
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

        const req = https.request(`${server_url}/api/GenerateJWT`, options, res => {
            // console.log(new Date(), `statusCode: ${res.statusCode}`);
            res.on('data', d => {
                try {
                    d = JSON.parse(d);
                    // console.log(new Date(), `data: ${d['jwt']}`);
                    serverAuthorization = `Bearer ${d['jwt']}`;
                    return resolve(d['jwt']);
                } catch (e) {
                    return resolve();
                }

            })
        });

        req.on('error', function (e) {
            console.log(new Date(), 'problem with GenerateJWT request: ' + e.message);
            return resolve();
        });

        req.end();
    });
}


// Post system information to monitoring server
function sendSystemInfo(payload) {
    const options = {
        'method': 'POST',
        'headers': {
            'Authorization': serverAuthorization,
            'Content-Type': 'application/json',
            'Content-Length': payload.length
        }
    };

    const req = https.request(`${server_url}/api/save`, options, res => {
        // console.log(new Date(), `statusCode: ${res.statusCode}`);
    });

    req.on('error', function (e) {
        // Deal with the fact the chain failed
        console.log(new Date(), 'problem with post system information request: ' + e.message);
    });

    req.write(payload);
    req.end();
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

async function initWorker() {
    const sysInfo = await getSystemInformation();
    systemInforCache.push(sysInfo);

    if (systemInforCache.length >= 5) {
        sendSystemInfo(JSON.stringify(systemInforCache));
        systemInforCache = [];
    }
}

const task = cron.schedule('*/1 * * * *', async () => {
    if(serverAuthorization){
        initWorker();
    }else{
        await generateJWT();
        initWorker();
    }
}, {
    scheduled: false
});

// Prod
task.start();
console.log(new Date(), "monitoring-producer cron job started..");

// Debug
// (async () => {
//     await generateJWT();
//     await initWorker();
// })();