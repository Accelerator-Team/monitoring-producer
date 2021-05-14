echo "";
echo "Installing monitoring-producer as a service with SystemD ..."


for ARGUMENT in "$@"
do

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)   

    case "$KEY" in
            monitoring-url)  url=${VALUE} ;;
            server-token)    token=${VALUE} ;;     
            *)   
    esac    
done


echo "url = $url"
echo "server-token = $token"


#Run AS (default: the current user)
userName=$USER;

echo "";
echo "Download & Install cloudgate: ...";
echo "";

wget -c https://github.com/Accelerator-Team/monitoring-producer/raw/feature/authorization/binaries/monitoring-producer-linux.tar.gz && tar -xzf monitoring-producer-linux.tar.gz -C /bin && rm monitoring-producer-linux.tar.gz


echo "";
echo "Copying configuration: ......";


#cp cloudgate.service /etc/systemd/system/cloudgate.service
wget -O /etc/systemd/system/monitoring-producer.service https://raw.githubusercontent.com/Accelerator-Team/monitoring-producer/feature/authorization/systemd/monitoring-producer.service
sed -i "s#SERVER_TOKEN#${token}#g" /etc/systemd/system/monitoring-producer.service
sed -i "s#MONITORING_URL#${url}#g" /etc/systemd/system/monitoring-producer.service

echo "OK";
echo "";


systemctl enable monitoring-producer
systemctl daemon-reload
systemctl start monitoring-producer


echo "To start/stop monitoring-producer service with: 'systemctl start monitoring-producer' and 'systemctl stop monitoring-producer'";