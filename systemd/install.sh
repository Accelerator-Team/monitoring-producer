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
echo "$token" > /opt/server_token.secret;

#Run AS (default: the current user)
userName=$USER;

echo "";
echo "Download & Install monitoring-producer: ...";
echo "";


ARCH=$(uname -m)

if [[ $ARCH == "x86_64" ]]; then
  URL="https://github.com/Accelerator-Team/monitoring-producer/raw/main/binaries/monitoring-producer-linux.tar.gz"
  wget -c $URL && tar -xzf monitoring-producer-linux.tar.gz -C /bin && rm monitoring-producer-linux.tar.gz
elif [[ $ARCH == "aarch64" ]]; then
  URL="https://github.com/Accelerator-Team/monitoring-producer/raw/main/binaries/monitoring-producer-linux-arm64.tar.gz"
  wget -c $URL && tar -xzf monitoring-producer-linux-arm64.tar.gz -C /bin && rm monitoring-producer-linux-arm64.tar.gz
else
  echo "Unsupported architecture: $ARCH"
  exit 1
fi


echo "";
echo "Copying configuration: ......";


#cp cloudgate.service /etc/systemd/system/cloudgate.service
wget -O /etc/systemd/system/monitoring-producer.service https://raw.githubusercontent.com/Accelerator-Team/monitoring-producer/main/systemd/monitoring-producer.service
sed -i "s#SERVER_TOKEN#${token}#g" /etc/systemd/system/monitoring-producer.service
sed -i "s#MONITORING_URL#${url}#g" /etc/systemd/system/monitoring-producer.service

echo "OK";
echo "";


systemctl enable monitoring-producer
systemctl daemon-reload
systemctl start monitoring-producer


echo "To start/stop monitoring-producer service with: 'systemctl start monitoring-producer' and 'systemctl stop monitoring-producer'";