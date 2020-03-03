## Installation

* Open **kafka/b1/server.properties**
  * Change **log.dirs**-Path to match your **kafka/b1/data** folder path
  
* Open **zookeeper/zookeeper.properties**
  * Change **dataDir**-Path to match your **zookeeper/data** folder path
  
* Start a Zookeeper instance with the previously edited **zookeeper.properties** config-file
  * When on Mac and Kafka was installed via Homebrew use: **zookeeper-server-start "path-to-config-file"**
  
* Start a kafka broker with the previously edited **b1/server.properties** config-file
  * When on Mac and Kafka was installed via Homebrew use: **kafka-server-start "path-to-b1-config-file"**
  
* Start the **producer** with **npm start**

* Start the **consumer** with **npm start**

* Start sending events by using a **POST**-Operation on **localhost:3001**
  * Body can contain amount of Events that should be generated:
  
  ```jsonc
  	{
  		"numberOfEvents": 20000
  	}
  ```
