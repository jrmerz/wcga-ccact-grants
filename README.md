West Coast Governors Alliance on Ocean Health
Climate Change Action Coordination Team
Funding Catalog
====

## INSTALL 

#### Requirements
- [NodeJS](http://nodejs.org/)
- [MongoDB](http://www.mongodb.org/)
- [Grunt](http://gruntjs.com/)
- [Bower](http://bower.io/)
- [Git](http://git-scm.com/)

#### Basic Setup
```
// create root dir
mkdir fundingwizard
cd fundingwizard

// clone repos
git clone https://github.com/jrmerz/wcga-ccact-grants.git
git clone https://github.com/CSTARS/MongoQueryEngine.git

// install mqe dependencies
cd MongoQueryEngine
npm install

// install app dependencies
cd ../wcga-ccact-grants
npm install

// create config file (See Below)
vim config.js

cd ..
node MongoQueryEngine/server.js config.js
```
