## Installation

* Each service, the gateway and every PoC ship an **.env.example** with the default settings. Copy it to **.env** next to it, e.g. from the repository root:
  `find . -name .env.example -not -path '*/node_modules/*' -exec sh -c 'cp "$1" "${1%.example}"' _ {} \;`

* Open **kafka/b1/server.properties**
  * Change **log.dirs**-Path to match your **kafka/b1/data** folder path
  
* Open **zookeeper/zookeeper.properties**
  * Change **dataDir**-Path to match your **zookeeper/data** folder path
 
* For each folder: **gateway**, **client/dub_client**, **services/User**, **services/Statistic**, **services/Render**, **services/Obstacle**, **services/NodeCollector**, **services/Item**, **services/Food**, **services/Collision**
  * Run **npm install**
  * Alternatively if you are using macOS: run `osascript install.scpt` in the **dub.io** folder.

## Start Program
If you are using macOS: run `osascript start.scpt` in the **dub.io** folder.

<p align="center">
  <img src="https://github.com/ddubbert/dub.io/blob/master/images/startScript.gif"/>
</p>

If not, do as follows:
  
* Start a Zookeeper instance with the previously edited **zookeeper.properties** config-file
  * When on Mac and Kafka was installed via Homebrew use: **zookeeper-server-start "path-to-config-file"**
  
* Start a kafka broker with the previously edited **b1/server.properties** config-file
  * When on Mac and Kafka was installed via Homebrew use: **kafka-server-start "path-to-b1-config-file"**

* Start the services, the gateway and the client. The sequence is important!
  * Start the **Render** service with **npm start**

  * Start the **NodeCollector** service with **npm start**

  * Start the **User** service with **npm start**

  * Start the **Food** service with **npm start**

  * Start the **Obstacle** service with **npm start**

  * Start the **Item** service with **npm start**

  * Start the **Collision** service with **npm start**

  * Start the **Statistic** service with **npm start**

  * Start the **Gateway** with **npm start**

  * Start the **Client** with **npm run serve**

* Open a Browser, visit **localhost:8080** and have fun ;D (host can be changed in the **config.js** file inside of the **dub.io** folder)

* If you want to change the amount of Food-Node, the FPS or other options do so in the **gameOptions** file
  * This might be needed if your Computer is not able to handle that many Nodes, or is able to handle even more Nodes. The performance bottleneck is the Frontend / Client which still needs to be improved !!! (but is enough for a prototype)
  
* If you want to reset the kafka state / data and if you are using macOS: run `osascript clear.scpt` in the **dub.io** folder




