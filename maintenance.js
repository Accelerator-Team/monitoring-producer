const cron = require('node-cron');
const https = require('https');
const { version } = require('./package.json');
const exec = require('child_process').exec;
// const schedulerCron = '0 * * * *'; //PROD
const schedulerCron = '*/1 * * * *'; // DEBUG
const MAINTENANCE_BASE_URL = 'https://raw.githubusercontent.com/Accelerator-Team/monitoring-producer/main';
const UPDATE_CHECK_URL = `${MAINTENANCE_BASE_URL}/package.json`;
const UPDATE_INSTALL_URL = `${MAINTENANCE_BASE_URL}/systemd/update.sh`;
let latestVersion;

exports.init = async () => {
    this.scheduler.start();
};

exports.scheduler = cron.schedule(schedulerCron, async () => {
    checkforUpdate();
}, {
    scheduled: false
});

exports.update = () => {
    checkforUpdate();
};


//get latest package.json
function getLatestPackage() {
    return new Promise((resolve, reject) => {
        const options = {
            'method': 'GET',
            'headers': {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(`${UPDATE_CHECK_URL}`, options, res => {
            // console.log(new Date(), `statusCode: ${res.statusCode}`);
            res.on('data', d => {
                try {
                    d = JSON.parse(d);
                    // console.log(new Date(), `data: ${d['jwt']}`);
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
    try {
        await getLatestPackage();
        if (version != latestVersion) {
            console.log(new Date(), 'update available: v' + latestVersion);
            installUpdate();
        } else {
            console.log(new Date(), 'No update available');
        }
    } catch (e) {
        console.log(new Date(), 'problem while checking for update: ' + e.message);
    }
}

function installUpdate() {
    try {
        exec(`wget -O - ${UPDATE_INSTALL_URL} | bash`, function (error, stdout, stderr) {
            if (error) {
                console.log(new Date(), 'exec error: ' + error);
            }
            if (stderr) {
                console.log(new Date(), 'exec stderr: ' + stderr);
            }
        });
    } catch (e) {
        console.log(new Date(), 'problem spawning install update: ' + e.message);
    }
}