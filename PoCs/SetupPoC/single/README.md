## Installation

* Open kafka/server.properties
  * Change log.dirs-Path to match your kafka/data folder path
* Open zookeeper/zookeeper.properties
  * Change dataDir-Path to match your zookeeper/data folder path
* Start a Zookeeper instance with the previously edited zookeeper.properties config-file
  * When on Mac and Kafka was installed via Homebrew use: zookeeper-server-start "path_to_config_file"
* Start a kafka broker with the previously edited server.properties config-file
  * When on Mac and Kafka was installed via Homebrew use: kafka-server-start "path_to_config_file"
* Start the producer with npm start
* Start the consumer with npm start
* Start sending events by using a POST-Operation on localhost:3000 (no body needed)