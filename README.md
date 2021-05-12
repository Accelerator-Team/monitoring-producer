    
# monitoring-producer

An app to capture system informartion and post it to an URL and exits the process.

**Note: You may want to run this as a CRON job to capture system information on specfic inverals***


## Quickstart for Linux systemd service(Binary version)
### Linux one line installer: stable binary (no requirements, recommended)

    wget -O - https://github.com/Accelerator-Team/monitoring-producer/raw/main/systemd/install.sh | bash


**This version includes Node.js and all the dependencies in the binary, so it can run on any linux x64 without requirements**

&nbsp;
&nbsp;

# Requirements
- Linux, Windows or Mac OS
- Node LTE 

## Install Node.js 12, NPM and GIT (Debian/Ubuntu)

    sudo apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates
    curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
    sudo apt -y install nodejs npm git

## Clone this repository
Clone this repo then install NPM dependencies for ws-monitoring:

    git clone https://github.com/Accelerator-Team/monitoring-producer.git
    cd ws-monitoring
    npm install --ignore-scripts

# Run monitoring-producer
    node index.js url="https://<<host>>" server-token="000000"

## How to build a custom binary file

    ./buildBinary.sh

The output will be placed in `binaries` folder
