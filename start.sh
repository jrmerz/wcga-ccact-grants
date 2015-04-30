#! /bin/bash

pidfile=/var/run/funding-wizard.pid

pid=`less $pidfile`
pid=`ps -ef | grep $pid | awk '{print $2}'`

kill -9 $pid
#if [ -z "$pid" ]
#then
#       echo "killing server with pid $pid"
#       kill -9 $pid
#else
#       echo "No server found running..."
#fi

node node_modules/MongoQueryEngine/server.js /opt/funding-wizard/config.js &
echo $! > $pidfile

echo 'Funding Wizard Started.'
