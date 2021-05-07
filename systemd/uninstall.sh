systemctl stop monitoring-producer
systemctl disable monitoring-producer
systemctl daemon-reload
rm /etc/systemd/system/monitoring-producer.service