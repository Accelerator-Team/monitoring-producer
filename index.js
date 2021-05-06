const si = require('systeminformation');
const https = require('https');
const argvs = process.argv.slice(2);
let server_url, apiKey;


// Compute args to extract --url and --api-key for making a post request to monitoring server
if (!argvs.length || argvs.length < 2) {
    throw new Error("Mandatory arguments not received.");
}

for (var i = 0; i < argvs.length; i++) {
    let arg = argvs[i];
    if (arg.indexOf('--url') > -1 || arg.indexOf('--URL') > -1) {
        server_url = arg.split("=")[1].trim();
    } else if (arg.indexOf('--api-key') > -1 || arg.indexOf('--API-KEY') > -1) {
        apiKey = arg.split("=")[1].trim();
    }
}

if (!server_url || !apiKey) {
    throw new Error("Mandatory arguments not received.");
}

// Compute system information
(async () => {
    try {
        let payload = {
            SERVER_ID: "[ServerId]"
        };

        payload['uptime'] = si.time()['uptime'];

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

//si.fsSize. size/used/available

        const fsStats = await si.fsStats();
        payload['fsStats_rx'] = fsStats['rx'];
        payload['fsStats_wx'] = fsStats['wx'];
        payload['fsStats_rx_sec'] = fsStats['rx_sec'];
        payload['fsStats_wx_sec'] = fsStats['wx_sec'];

        const networkStats = await si.networkStats("*");
        if (networkStats.length) {
            payload['networkStats_rx_bytes'] = networkStats[0]['rx_bytes'];
            payload['networkStats_tx_bytes'] = networkStats[0]['tx_bytes'];
            payload['networkStats_rx_sec'] = networkStats[0]['rx_sec'];
            payload['networkStats_tx_sec'] = networkStats[0]['tx_sec'];
        }

        sendSystemInfo(JSON.stringify(payload));
        // set interval 1 min and capture and cache ---> check length of cache to 5 --> post
        // TODO --> Cache to memory and  to post every 5 min
    } catch (e) {
        // Deal with the fact the chain failed
    }
})();

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
            console.log(`statusCode: ${res.statusCode}`)
            // res.on('data', function (chunk) {
                // console.log('BODY: ' + chunk);
            // });
        });

        // req.on('error', function (e) {
            // console.log('problem with request: ' + e.message);
        // });

        req.write(payload)
        req.end()
}
