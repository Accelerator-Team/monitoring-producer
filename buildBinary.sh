if ! command -v node &> /dev/null
then
    echo "node is required to build, try: apt install nodejs"
    exit
fi

if ! command -v pkg &> /dev/null
then
    echo "Installing PKG"
    npm install -g pkg
fi

rm -rf /tmp/monitoring-producer/
mkdir -p /tmp/monitoring-producer/
cp -r * /tmp/monitoring-producer/
rm -rf /tmp/monitoring-producer/binaries/

mkdir -p ./binaries;
rm ./binaries/monitoring-producer
rm ./binaries/monitoring-producer-linux.tar.gz

#package as binaries for linux
pkg /tmp/monitoring-producer/index.js --config package.json

cd ./binaries;

#create tar.gz
cp monitoring-producer-x64 monitoring-producer
tar -czvf monitoring-producer-linux.tar.gz monitoring-producer
rm monitoring-producer

cp monitoring-producer-arm64 monitoring-producer
tar -czvf monitoring-producer-linux-arm64.tar.gz monitoring-producer
rm monitoring-producer