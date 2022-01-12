const cron = require('node-cron');
const fs = require('fs');
const https = require('https');
const { version } = require('./package.json');
const spawn = require('child_process').spawn;
const schedulerCron = '0 * * * *'; //PROD
// const schedulerCron = '*/1 * * * *'; // DEBUG
const MAINTENANCE_BASE_URL = 'https://raw.githubusercontent.com/Accelerator-Team/monitoring-producer/main';
const UPDATE_CHECK_URL = `${MAINTENANCE_BASE_URL}/package.json`;
const UPDATE_INSTALL_URL = `${MAINTENANCE_BASE_URL}/systemd/update.sh`;

exports.init = async () => {
    this.scheduler.start();
};

exports.scheduler = cron.schedule(schedulerCron, async () => {
    checkforUpdate();
}, {
    scheduled: false
});

exports.update = () => {
    installUpdate();
};

exports.version =  () => {
    return version;
};


//get latest package.json
function getLatestPackage() {
    let latestVersion;
    return new Promise((resolve, reject) => {
        const options = {
            'method': 'GET',
            'headers': {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(`${UPDATE_CHECK_URL}?nocache=${(+new Date())}`, options, res => {
            // console.log(new Date(), `statusCode: ${res.statusCode}`);
            res.on('data', d => {
                try {
                    d = JSON.parse(d);
                    // console.log(new Date(), `data: ${d['version']}`);
                    latestVersion = d.version
                } catch (e) {
                    console.log(new Date(), 'problem with getLatestPackage data: ' + e.message);
                }

            });

            res.on('end', () => {
                if (latestVersion) {
                    return resolve(latestVersion);
                } else {
                    return reject();
                }
            });
        });

        req.on('error', function (e) {
            return reject();
        });

        req.end();
    });
}

async function checkforUpdate() {
    // console.log('current app version', version);
    try {
        const latestVersion = await getLatestPackage();
        // console.log('latest app version', latestVersion);
        if (version != latestVersion) {
            console.log(new Date(), 'update available: v' + latestVersion + " over old version: " + version);
            installUpdate();
        } else {
            // console.log(new Date(), 'No update available');
        }
    } catch (e) {
        console.log(new Date(), 'problem while checking for update: ' + e.message);
    }
}


function installUpdate() {
    try {
        fs.writeFileSync('/tmp/monitoring-update.sh', `wget -O - ${UPDATE_INSTALL_URL} | bash`);
        fs.chmodSync('/tmp/monitoring-update.sh', "755");
        const child = spawn('/tmp/monitoring-update.sh', [], {
            detached: true, stdio: 'inherit'
        });
        child.unref();
    } catch (e) {
        console.log(new Date(), 'problem spawning install update: ' + e.message);
    }
}
