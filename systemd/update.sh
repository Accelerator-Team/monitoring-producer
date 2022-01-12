echo "";
echo "Staring to update monitoring-producer ..."


echo "";
echo "Removing current monitoring-producer: ...";
echo "";

rm /bin/monitoring-producer

echo "";
echo "Download & Installing new monitoring-producer: ...";
echo "";

wget -q -c https://github.com/Accelerator-Team/monitoring-producer/raw/main/binaries/monitoring-producer-linux.tar.gz && tar -xzf monitoring-producer-linux.tar.gz -C /bin && rm monitoring-producer-linux.tar.gz

echo "Restarting monitoring-producer ..."
systemctl restart monitoring-producer


echo "To start/stop monitoring-producer service with: 'systemctl start monitoring-producer' and 'systemctl stop monitoring-producer'";




