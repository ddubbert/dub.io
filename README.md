# dub.io
This project is meant as a usability test of Continuous Event Stream Processing in a realtime environment. It represents an Agar.io clone based on Continuous Event Streams and Microservices. The Services are based on Node.js and GraphQL. The communication between these services is realized in a loosely coupled way with the help of Apache Kafka.

## Background
Event based architectures are a common way of realizing projects. They enable the distribution of logic to different processes and whole services. This distribution reduces the load of each component and therefore has the potential to acclerate tasks. A loosely coupled architecture also allows for rapid changes and an easy addition of new components. Microservice architectures are therefore a frequently used approach. Furthermore, there are a lot of newly released tools to ease the implementation of such services. One of these is Apollo Gateway / Apollo Federation, which provides ways of connecting different GraphQL based services and automatically generates an appropriate Gateway.

When using Microservices it is recommended to also make use of loosely coupled and asynchronous communication styles, so that an event based communication is often preferred. Apache Kafka is therefore a perfect fit for this project, in that it is one of the most used and refined tools for implementing communication channels in the form of continuous event streams.

Lastly, in realtime environments components need to process high loads in short periods of time. Even small delays might aggrevate the usability of a product / service. One reason for those delays is the time needed for service communication. To negate / minimize such a time loss monolithic architectures are used. In contrast to distributed architectures, they represent a bottle neck because of limited ressources. It needs to be tested, if a combination of Microservices and Event Stream Processing can overcome previous hurdles and acclerate the procession of tasks to allow for distributed realtime applications and how this needs to be done.

## Objectives
The objective is to create a simple copy of the massive multiplayer online game Agar.io with the help of Apache Kafka, Node.js and GraphQL-Services. The main game principles are simple:

* All players are on the same map.
* Each player is represented by a circle.
* Players are allowed to move freely accross the map.
* "Food"-Items are generated automatically / randomly. Players can collect these to grow in size.
* If players collide, the bigger one will consume the other.
* Players loose if they were consumed by others.

Even though there are additional rules and possibilities, these are the ones that form the basis for this project. Each seperate task will be handled by one service. There might be services for movement, collision, food operations, user generation, statistics and so on. Services communicate via Apache Kafka channels and client-server communications are donw via GraphQL and an API-Gateway. The synchronization of all the clients / players is another important task, assigned to a seperate service. This service will collect all the needed informations to update the map. It will also distribute this synchronized map-data to all the clients, so that these only need to update their current view without the need of implementing any other logic.

Focus points for this project are:
* The event-design and setup of communication channels (Apache Kafka-Architecture)
  * Testing and comparing benefits of different designs
* The design and connection of services (Microservice-Architecture, GraphQL)
  * Microservice architectures and needed components (apart from the services)

## Installation
