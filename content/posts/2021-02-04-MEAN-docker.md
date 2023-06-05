---
layout: post
title: Dockerizing a Mongo database
subheading: Using Docker, we can ensure our Mongo database can conveniently grow and change with our application in a local development environment.
published: true
tags: 
 - mongo
 - docker 
---

![Vines](/assets/img/docker-mdb/splash.jpg){:class="post-splash"}
###### Photo by [Salomé Guruli](https://unsplash.com/@sguruli?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText) on [Unsplash](https://unsplash.com/s/photos/vines?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText)

## Introduction
I tend to have about a dozen or so little tech projects loaded onto my machine at any given time - little web app ideas that I work on and stop, an occasional hackathon entry, something I've built working through a tutorial, a few experiments. I've gotten to really enjoy working with MongoDB over the past year, and I'll usually add that in as a persistence layer when appropriate. One thing I've realized working off of a local MongoDB development server is all of those databases can accumulate, making it a little scary to experiment with different server configurations and deployment setups for one app. Indeed, one of the challenges during local development is constantly changing and reconfiguring the database as the project evolves, and safely dropping, rebuilding, and reseeding databases.

One way I've found to add some flexibility to the database layer when developing locally is using Docker to run a database server that's dedicated to the project. By leveraging volumes with Docker, we can quickly configure, change, and migrate a database, making it easier to keep database configurations consistent in higher environments. Likewise, this setup can also simplify creating and tearing down pre-populated databases for automated tests.

In this article, I'll show you my Docker setup for container configurations and scripts to run a project's MongoDB server in a Docker container. We'll add some configuration files for a local database, then go on to seed some data, as well as simple commands to tear down and rebuild the database.

## Prerequisites and loading the sample project
In order to test out the Docker scripts, you'll need [Docker Desktop](https://www.docker.com/products/docker-desktop) running on your local development machine. If you want to follow along with the sample repo, you'll also need [Node.js](https://nodejs.org) installed. Lastly, a database browser tool like [MongoDB Compass](https://www.mongodb.com/products/compass) will be helpful for testing and inspecting the databases that we build.

To demonstrate, I've created [a simple MEAN-stack repo](https://github.com/jsheridanwells/MeanUrls) and I'll show how to add scripts for containerizing the database. However, you could also easily carry out these steps in any other project that uses Mongo - I'll just be going over the Docker setup in this article. The example repo uses Angular, Express, and Typescript, but you don't need to be familiar with any of those to follow along.

I won't be explaining any MongoDB concepts, but that's not likely to get in the way of understanding the steps below. 

I'll give a brief overview of some Docker terms and concepts so that the explanations are clear, but if you're still getting started with Docker, [there are far better tutorials out there](https://docker-curriculum.com/).

Now for loading the sample project if you're going to use it: 

Clone the repo:
```bash
$ git clone https://github.com/jsheridanwells/MeanUrls.git
$ cd MeanUrls
```

The `main` branch of the repo is the complete example. There is also a branch called `start` which is the project without the setup. Check out the `start` branch and install the dependencies:
```
$ git checkout start
$ npm install
```
This example web app is an extremely simple URL shortener. There are a few npm scripts included to simplify running the project. 

To compile and run the code for the API server:
```bash
$ npm run cp:www
$ npm run build:api
$ npm run start:api
```
You should see the Express app start up as expected, but then after a few seconds, an error will appear in the console because the application can't connect to a database server. We'll fix that below.

In a second terminal window, run the Angular client application:
```bash
$ npm run start
```
After the Node and Angular servers spin up, if you navigate to `http://localhost:4200`, you should see:

![A start page for the web application with a form, a button, and an empty results table](/assets/img/mdb-docker/img-1.png){:class="post-img"}

Again, you'll see some error messages in the browser console caused by not having a database available. 

Stop both the API server and the Angular server (`CTL+C`).
## Some terms and concepts
Before we set up our Docker configuration, I'd like to go over some concepts that will help clarify the steps we go through. 

__Docker__ is a platform for creating virtual environments called __containers__. I think of a container as a tiny, isolated server that is given just enough resources to run a single, specific application or a task. Docker containers run on a __host machine__ which is a physical piece of hardware, e.g. my computer if I'm developing locally, or the physical server in a public deployment. Docker containers come from __images__ which are basically a blueprint for creating the container: at a minimum, an image will describe an operating system to run in the container, and it will usually also have packages and libraries installed to help an application accomplish a task. 

One of the most powerful aspects of Docker is that we can layer different pre-configured images, then add our own configurations and artifacts. Hundreds of different vendors and platforms make official Docker images available for their products - different Linux flavors, different Windows products, MySQL, Postgres, SQL Server - and indeed it's a great way to play with all sorts of different technologies. For our purposes, there is [an official MongoDB image](https://hub.docker.com/_/mongo) that we'll use to run a containerized database.

Once an image is defined, we can run the container on the host. When a container is run, usually we specify ports and network settings that are opened so that data can pass from the host machine to the container, or from container to container. We would also want to pass environment configuration settings to the container, for example a connection string so that the container can connect to an external database. Docker provides us with a variety of commands including one to run the container as a background process (__"detached mode"__), or with a command to be able to enter the container through the terminal and inspect its contents (`docker exec`, which we'll use later on).

One advantage of containers is that they are ephemeral - all you need is a command `$ docker run <...>` and the container will start with all of the components defined by its Docker image. When we don't need it, another command will make the container shut down and disappear. This helps developers to consistently deploy an application to different environments and to be sure it's most likely to run the exact same way. However, any data that is saved inside of the container will also disappear once the container is stopped. To handle persisted data, Docker uses __volumes__ to connect data or files from the host machine to the container when it is running, as well as to write data from the container back to the host. There are two types: The first, __bind mounts__ are directories that the developer manages directly. For example, if I want a directory of scripts available in the container, I can bind my local scripts directory in a project's source code to a directory in the container. The second type are called __volumes__ and these are resources that are managed by Docker and live in a special location in the host machine's file system that we don't necessarily need to access directly. The advantage of using Docker volumes is that it gives us some special commands to create, manage, and dispose of persistent data that is consumed by a Docker container.

Lastly, __Docker Compose__ is a feature that allows you to manage multiple Docker containers. Normally, it's best practice for a Docker container to do only one thing, so for a web application, I might have one container to serve static files publicly, one container to handle the web API, and a third container to run a database server. Docker Compose allows us to create a YAML file, normally named `docker-compose.yaml`, to define how multiple containers are configured and how they are allowed to communicate with each other.

So, taking all of these concepts together, we are going to use Docker to run our development database server in the following ways:
 - We'll use the official MongoDB __image__ to create a __container__ to have all of the functionality of a Mongo server without having to go through the cumbersome process of installing it on a development machine.
 - We'll __bind mount__ a directory of startup scripts to a special directory on the Mongo container called `/docker-entrypoint-initdb.d`. Any bash scripts or Javascript files in this directory are immediately run when the container is launched. We'll use this to create a MongoDB database and an application user.
 - We'll define a Docker __volume__ so that the Mongo container can persist data on our host machine. If we ever need to remove all of the saved data and start over, we'll have Docker commands available to do that.
 - Lastly, we'll use __Docker Compose__ to define the Mongo container as a service. With a `docker-compose.yaml` file defined, an application service or other services can be added on for a more robust application.

For the rest of this article, I'll go through the steps for accomplishing all of this.

## Environment variables
The first thing to do is establish the various values we'll need to build a MongoDB connection string and the names of the database and collection(s) for the project. The project contains the file `env.sample` with all of the values we'll need for this example:
```
MONGO_INITDB_ROOT_USERNAME=mongo_root
MONGO_INITDB_ROOT_PASSWORD=mongo_root()
APP_USER=app_user
APP_PWD=app_user()
DB_NAME=MeanUrls
DB_COLLECTION_NAME=Urls
MONGO_HOSTNAME=mongodb
MONGO_PORT=28017
```
These are the values that Docker will use to configure the server running in a Docker container. This example uses the following:
 - The root login and password for the database server.
 - An app user and password. These are the credentials the application itself will use, This helps to limit the application's access to just what it needs.
 - The name of the database and the name of a collection to start with.
 - The value `MONGO_HOSTNAME` is the name to access the database server in the Docker container from our host machine. This host name must match the name we give the container service that we'll set up later. 
 - `MONGO_PORT` is the port that our application will use to access the database. MongoDB runs on port `27017` by convention; I like to change it to `28017` so I can tell it apart form any local instance of Mongo running on my machine, but that's just a personal preference.

Adjust these variables if necessary, then copy them as your actual `.env` file. 
```bash
$ cp .env.sample .env
```
This is the file that we'll use to pass secret keys (e.g., the root password) to the Docker container and to the application. It can also be recreated for configuring secrets in a deployed application. As such, be careful not to check it into any version control.

If you look at the method `buildMongoUrl`in the file `./server/data/mongo.ts` you can see where these values are used to build the Mongo connection string:
```typescript
public static buildMongoUrl(config: MongoDbConfig): string {
    return 'mongodb://'
      + `${ config.appUser }:${ encodeURIComponent(config.appPassword) }`
      + `@${ config.hostName }:${ config.mongoPort }`
      + `/${ config.dbName }`;
```

## Some setup scripts
The official MongoDB image lets us start up the database using either a Javascript file or a Bash script. We'll write some Javascript that will create the app user and the app database 

We'll create some directories to hold our Mongo scripts:
```bash
$ mkdir -p ./scripts/mongo/init
```
And a couple of files:
```bash
$ touch ./scripts/mongo/init/{.dbshell,mongoInit.js}
```
The `.dbshell` file is just a blank placeholder file that's used to create a Linux user to run the scripts in the container. `mongoInit.js` is where we'll create our user and database by pasting the following:
```javascript
// use shell command to save env variable to a temporary file, then return the contents.
// source: https://stackoverflow.com/questions/39444467/how-to-pass-environment-variable-to-mongo-script/60192758#60192758
function getEnvVariable(envVar, defaultValue) {
  var command = run("sh", "-c", `printenv --null ${ envVar } >/tmp/${ envVar }.txt`);
  // note: 'printenv --null' prevents adding line break to value
  if (command != 0) return defaultValue;
  return cat(`/tmp/${ envVar }.txt`)
}

// create application user and collection
var dbUser = getEnvVariable('APP_USER', 'app_user');
var dbPwd = getEnvVariable('APP_PWD', 'app_user()');
var dbName = getEnvVariable('DB_NAME', 'MeanUrls');
var dbCollectionName = getEnvVariable('DB_COLLECTION_NAME', 'Urls');
db = db.getSiblingDB(dbName);
db.createUser({
  'user': dbUser,
  'pwd': dbPwd,
  'roles': [
    {
      'role': 'dbOwner',
      'db': getEnvVariable('DB_NAME', 'MeanUrls')
    }
  ]
});

db.createCollection(dbCollectionName);
```
The code in this script runs in the Mongo shell, so you'll notice difference Mongo-specific objects are provided: e.g., `db`, `run`, `cat`.

The first function uses the mongo shell `run` command to retrieve environment variables (and I have to credit [this Stack Overflow hack](https://stackoverflow.com/questions/39444467/how-to-pass-environment-variable-to-mongo-script/60192758#60192758) for help. Please let me know if there's a better way to do this).

Then, we create the database with `db.getSiblingDB`, a user with `db.createUser`, and a collection with `db.createCollection`.

Note that this script will only run when the container is initially started and bound to a Docker volume on the host, but not on any subsequent container startups bound to the same volume. This prevents any duplication or data collision when the container is shut down and restarted.

The next step is optional, but I want to also add some seed data so that I can test out the application right away. We'll create a new directory:
```bash
$ mkdir ./scripts/mongo/seed
```
And we'll download some data that I've already generated for the project using [Mockaroo](https://www.mockaroo.com/).
```bash
$ curl https://raw.githubusercontent.com/jsheridanwells/MeanUrls/main/scripts/mongo/seed/MOCK_DATA.json -o ./scripts/mongo/seed/MOCK_DATA.json
```
And we'll create a bash script that will be available in the container to seed the database if we choose to:
```bash
$ touch ./scripts/mongo/seed/mongo_seed.sh
```
Add these contents to the file:
```bash
#!/bin/bash
if [ -f "/MOCK_DATA.json" ]; then
  FILE="/MOCK_DATA.json"
elif [ -f "./MOCK_DATA.json" ]; then
  FILE="./MOCK_DATA.json"
else
  echo "Mock data file not found. Make sure container has a MOCK_DATA.json file for this script to work"
  exit 1
fi

mongoimport --host $MONGO_HOSTNAME \
  --authenticationDatabase $DB_NAME \
  --username $APP_USER --password $APP_PWD \
  --db $DB_NAME \
  --collection $DB_COLLECTION_NAME \
  --file $FILE --jsonArray
```
This script checks for a `MOCK_DATA.json` file, and if found, runs the `mongoimport` command with the environment settings we created earlier.

## Creating our Mongo service
We've got our keys for creating our database and app user, and scripts to tell Docker how to set them up when creating the container. Now we need to run it.j

Normally, a Docker container is configured with a `Dockerfile` that is responsible for selecting a base image, building and copying artifacts from the project's source code, running any special commands or configurations, and a lot more, then the result is a new Docker image.

In our case, we're not changing any behaviors of the official MongoDB Docker image, or adding our own code, so we'll run the MongoDB container as-is. We'll use Docker Compose to configure and run the container as a service that's then available to our application running on the host machine.

Docker Compose is configured using a YAML file, conventionally named `docker-compose.yaml`. Let's create one at the root of the project:
```bash
$ touch ./docker-compose.yaml
```
Now paste the following:
```yaml
version: "3"
services:
  mongodb:
    container_name: mean_urls_db
    image: mongo:latest
    volumes:
      - ./scripts/mongo/init/:/docker-entrypoint-initdb.d
      - ./scripts/mongo/init:/home/mongodb
      - ./scripts/mongo/seed/:/home/mongodb/seed
      - mean_urls_data:/data/db
    ports:
      - "28017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=$MONGO_INITDB_ROOT_USERNAME
      - MONGO_INITDB_ROOT_PASSWORD=$MONGO_INITDB_ROOT_PASSWORD
      - APP_USER=$APP_USER
      - APP_PWD=$APP_PWD
      - DB_NAME=$DB_NAME
      - DB_COLLECTION_NAME=$DB_COLLECTION_NAME
      - MONGO_HOSTNAME=$MONGO_HOSTNAME
volumes:
  mean_urls_data:
```
Here's a walkthrough of what the yaml file is doing:
 - `version: "3"` is the version of Docker Compose we're using, the latest as I write this.
 - We've named the service `mongodb`. This will become the host name of the MongoDB server and must match `MONGO_HOSTNAME` in the `.env` file.
 - We'll build a container from the official MongoDB image: `image: mongo:latest`.
 - In the `volumes` list there are a few things going on:
 > - First, note that for each item, the syntax is such that the value to the left of the colon (`:`), pertains to the host machine, while to the right belongs to the container (`./host-directory:/container-directory`).
 > - We're mounting `./scripts/mongo/init` to the directory on the container called `/docker-entrypoint-initdb.d`. As mentioned earlier, this is a special directory that runs any Javascript or Bash scripts inside of it when the container is first created.
 > - We'll also mount `init` to `/home/mongodb` on the container. This creates the Linux user that can run the scripts with the Mongo shell.
 > - The `seed` scripts will be copied over to `/home/mongodb/seed`. That way they're available to seed the database when the container is running if we want.
 > - The last item - `mean_urls_data:/data/db` will bind the Mongo database files as a Docker volume. This allows data to persist when the container is stopped and restarted. It lets us easily wipe out all of the Mongo data and start over when necessary.
 - Moving on, in `ports`, we're connecting our local `28017` port to the conventional Mongo port `27017` on the container.
 - The `environment` list will set all of the environment variables from `.env` in the container.
 - Lastly, `volumes: mean_urls_data` creates and names the Docker volume on the host machine and must match the last item of the `volumes` list set when defining the `mongodb` service.

## Getting it up and running
It's time to test out the database now.

From the root of the project, use the `docker-compose` command to run the container:
```bash
$ docker-compose up
```
By default, `docker-compose` looks for a file in the working directory called `docker-compose.yaml`. If there are no errors, you'll see a mess of log entries in your terminal. Once it's settled, check for these lines near the top:
```
Creating network "meanurls_default" with the default driver
Creating volume "meanurls_mean_urls_data" with default driver
Creating mean_urls_db ... done
```
This shows that the network and the volume were created correctly.

Scanning through the logs, check for this entry:
```
mean_urls_db | Successfully added user: {
mean_urls_db |  "user" : "app_user",
mean_urls_db |  "roles" : [
mean_urls_db |          {
mean_urls_db |                  "role" : "dbOwner",
mean_urls_db |                  "db" : "MeanUrls"
mean_urls_db |          }
mean_urls_db |  ]
mean_urls_db | }
```
This helps confirm that `mongoInit.js` was run and that a user was created for the application.

Using MongoDB Compass, the mongo shell, or your database browser of choice, connect to the database using this connection string:
```
mongodb://app_user:app_user()@localhost:28017/MeanUrls
```
You should see that the `MeanUrls` database and the `Urls` collection were created. 

Run the application again as shown above and navigate to `http://localhost:4200`. The application should be running in the browser without receving any errors from the API. Lastly, enter a URL to shorten in the application. The object should be saved and everything working as expected:
![A browser view showing the application working as expected](/assets/img/mdb-docker/img-2.png){:class="post-img"}

## Seeding the database
The next step is optional, but there are times when it's helpful to start the database with some boilerplate data to test the components more authentically, or to see how the application handles a more realistic volume of data. The `docker exec` command lets us enter the Docker container from the terminal, navigate the file system on the container, and execute bash commands.

With the container running as in the previous step, execute the following command:
```bash
$ docker exec -it mean_urls_db bash
```
This will open a bash terminal running inside of the container.

If your container is configured as above, navigate to the directory where the seed scripts were mounted:
```bash
$ cd /home/mongodb/seed
```
Run the seed script:
```bash
$ bash mongo_seed.sh
```
If your output is similar to...
```bash
2021-02-17T20:46:39.307+0000    connected to: mongodb://localhost/
2021-02-17T20:46:39.309+0000    50 document(s) imported successfully. 0 document(s) failed to import.
```
... then you should be good to go.

Now, refresh the application in your web browser, or inspect the database with MongoDB Compass, and you should see that 50 fake documents have been added to the `Urls` collection.

To exit the container, type `exit`.

## Cleanup and some helpful scripts
If I want to shut down the MongoDB server, I can run:
```bash
$ docker-compose down
```
This will stop and remove the Mongo container, but the volume where data is stored will persist when we start up the container again. 

To remove the volume run:
```bash
$ docker volume rm meanurls_mean_urls_data
```
The next time I start the MongoDB container, the initialization scripts will run again.

If you're living dangerously, you can also put the two together:
```bash
$ docker-compose down -v
```

Lastly, in projects, I like to include all of the container startup and teardown scripts in the `package.json` for convenience:
```json
{
  "...": "...",
  "scripts": {
    "mongo": "docker-compose up",
    "mongo:up": "docker-compose up",
    "mongo:down": "docker-compose down",
    "mongo:clean": "docker volume rm meanurls_mean_urls_data",
  }
```

## Conclusion
And with that, we've created a MongoDB server that communicates with a Node.js application from a container. This gives our application a dedicated MongoDB instance that's easier to set up and tear down. We've also got a good foundation for getting configurations right in local development before replicating those consistently in higher environments. Lastly, we can re-configure and evolve the database server as the application changes without affecting other applications that would otherwise share the database server.