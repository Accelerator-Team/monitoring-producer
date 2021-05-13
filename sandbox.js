var WebSocket = require("ws");

var options = {
    headers: {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXJ2ZXJJZCI6NzEzLCJzZXJ2ZXJOYW1lIjoicm9ja2V0LWNoYXQtMjU2ODA2LXU0NC52bS5vcGVudm0uY2xvdWQiLCJpYXQiOjE2MjA4MDg2NzZ9.qZvQcc5i41bvjzqWgKcpRQ7kDHQj1nQnZiP7ZFYsCKA"
    }
};

var ws = new WebSocket("wss://rocket-chat-256806-u44.vm.openvm.cloud/monitoring/save", options);

ws.onopen = function () {
    //ws.send(JSON.stringify(obj));
    nbConnectRetry = 0;
    console.log("Client is now connected to GateMaster");
    ws.send(JSON.stringify(payload));
};

ws.onmessage = function(e) {
    console.log('Message received from GateMaster: ', e.data);
};

ws.onclose = function(e) {
    console.log('Socket is closed.', e.code);
};

ws.onerror = function(err) {
    console.error('Socket encountered error: ', err.message, 'Closing socket');
    ws.close();
};


var payload = [
    {
        "time": "2021-05-10T13:35:00.734Z",
        "SERVER_ID": "12345",
        "uptime": 553378,
        "cname": "postman",
        "mem_total": 2033901568,
        "mem_free": 158982144,
        "mem_used": 1874919424,
        "mem_swaptotal": 0,
        "mem_swapused": 0,
        "mem_swapfree": 0,
        "cpu_avgLoad": 0.45,
        "cpu_currentLoad": 21.782178217821784,
        "disksIO_rIO": 2094664,
        "disksIO_wIO": 2283158,
        "disksIO_rIO_sec": 2.0120724346076457,
        "disksIO_wIO_sec": 9.054325955734406,
        "fsStats_rx": 114571376640,
        "fsStats_wx": 29919712256,
        "fsStats_rx_sec": 12399.596367305752,
        "fsStats_wx_sec": 115729.56609485368,
        "fsSize_size": 20026552320,
        "fsSize_used": 5027319808,
        "fsSize_available": 14130700288,
        "networkStats_rx_bytes": 300810053,
        "networkStats_tx_bytes": 300810053,
        "networkStats_rx_sec": 17729.038854805727,
        "networkStats_tx_sec": 17729.038854805727
    },
    {
        "time": "2021-05-10T13:35:01.735Z",
        "SERVER_ID": "12345",
        "uptime": 553379,
        "cname": "postman",
        "mem_total": 2033901568,
        "mem_free": 158474240,
        "mem_used": 1875427328,
        "mem_swaptotal": 0,
        "mem_swapused": 0,
        "mem_swapfree": 0,
        "cpu_avgLoad": 0.45,
        "cpu_currentLoad": 21.21212121212121,
        "disksIO_rIO": 2094664,
        "disksIO_wIO": 2283161,
        "disksIO_rIO_sec": 0,
        "disksIO_wIO_sec": 3,
        "fsStats_rx": 114571376640,
        "fsStats_wx": 29919831040,
        "fsStats_rx_sec": 0,
        "fsStats_wx_sec": 118546.90618762474,
        "fsSize_size": 20026552320,
        "fsSize_used": 5027319808,
        "fsSize_available": 14130700288,
        "networkStats_rx_bytes": 300814462,
        "networkStats_tx_bytes": 300814462,
        "networkStats_rx_sec": 4387.064676616916,
        "networkStats_tx_sec": 4387.064676616916
    },
    {
        "time": "2021-05-10T13:35:02.736Z",
        "SERVER_ID": "12345",
        "uptime": 553380,
        "cname": "postman",
        "mem_total": 2033901568,
        "mem_free": 158191616,
        "mem_used": 1875709952,
        "mem_swaptotal": 0,
        "mem_swapused": 0,
        "mem_swapfree": 0,
        "cpu_avgLoad": 0.45,
        "cpu_currentLoad": 23.232323232323232,
        "disksIO_rIO": 2094664,
        "disksIO_wIO": 2283161,
        "disksIO_rIO_sec": 0,
        "disksIO_wIO_sec": 0,
        "fsStats_rx": 114571376640,
        "fsStats_wx": 29919831040,
        "fsStats_rx_sec": 0,
        "fsStats_wx_sec": 0,
        "fsSize_size": 20026552320,
        "fsSize_used": 5027319808,
        "fsSize_available": 14130700288,
        "networkStats_rx_bytes": 300821032,
        "networkStats_tx_bytes": 300821032,
        "networkStats_rx_sec": 6498.516320474778,
        "networkStats_tx_sec": 6498.516320474778
    },
    {
        "time": "2021-05-10T13:35:03.736Z",
        "SERVER_ID": "12345",
        "uptime": 553381,
        "cname": "postman",
        "mem_total": 2033901568,
        "mem_free": 157421568,
        "mem_used": 1876480000,
        "mem_swaptotal": 0,
        "mem_swapused": 0,
        "mem_swapfree": 0,
        "cpu_avgLoad": 0.45,
        "cpu_currentLoad": 16.161616161616163,
        "disksIO_rIO": 2094664,
        "disksIO_wIO": 2283169,
        "disksIO_rIO_sec": 0,
        "disksIO_wIO_sec": 8.097165991902834,
        "fsStats_rx": 114571376640,
        "fsStats_wx": 29919953920,
        "fsStats_rx_sec": 0,
        "fsStats_wx_sec": 124246.71385237614,
        "fsSize_size": 20026552320,
        "fsSize_used": 5027319808,
        "fsSize_available": 14130700288,
        "networkStats_rx_bytes": 300821032,
        "networkStats_tx_bytes": 300821032,
        "networkStats_rx_sec": 0,
        "networkStats_tx_sec": 0
    },
    {
        "time": "2021-05-10T13:35:04.737Z",
        "SERVER_ID": "12345",
        "uptime": 553382,
        "cname": "postman",
        "mem_total": 2033901568,
        "mem_free": 157409280,
        "mem_used": 1876492288,
        "mem_swaptotal": 0,
        "mem_swapused": 0,
        "mem_swapfree": 0,
        "cpu_avgLoad": 0.45,
        "cpu_currentLoad": 16.161616161616163,
        "disksIO_rIO": 2094664,
        "disksIO_wIO": 2283169,
        "disksIO_rIO_sec": 0,
        "disksIO_wIO_sec": 0,
        "fsStats_rx": 114571376640,
        "fsStats_wx": 29919953920,
        "fsStats_rx_sec": 0,
        "fsStats_wx_sec": 0,
        "fsSize_size": 20026552320,
        "fsSize_used": 5027319808,
        "fsSize_available": 14130700288,
        "networkStats_rx_bytes": 300821188,
        "networkStats_tx_bytes": 300821188,
        "networkStats_rx_sec": 155.688622754491,
        "networkStats_tx_sec": 155.688622754491
    }
];